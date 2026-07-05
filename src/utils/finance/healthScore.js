// Client-side port of calculate_financial_health_score / store / get RPCs.
// Splits into a PURE computeHealthScore (unit-testable, mirrors the SQL exactly)
// plus fetch+persist wrappers that keep the fetchHealthScore/history return
// shapes from the old api/health.js so HealthScore.jsx is unchanged.
import { getSupabase } from '../api/_auth';
import { decryptRows, encryptRow } from '../crypto/rowCodec';
import { baseAmountOf, monthKey, stdDevPop, round2 } from './shared';

// ---- Pure formula (mirror of the plpgsql) --------------------------------
// txs: decrypted transactions [{ type, category_id, amount, base_amount,
//   exchange_rate, date }]; categories: [{ id }]; monthDate: 'YYYY-MM-01'
export function computeHealthScore(txs, categories, monthDate) {
  const monthStartKey = String(monthDate).slice(0, 7); // 'YYYY-MM'
  const [my, mm] = monthStartKey.split('-').map(Number);
  // Compare on YYYY-MM keys (strings) instead of Date objects — avoids
  // re-parsing each transaction date on every predicate call.
  const currentKey = monthStartKey;
  const lookbackStartKey = (() => {
    const d = new Date(my, mm - 1 - 6, 1); // 6 months before month start
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  // Single pass: bucket everything we need by category + month. This replaces
  // the previous O(categories × transactions) nested scans with O(transactions).
  const catExpenseByMonth = new Map(); // catId -> Map(monthKey -> sum)  (lookback → monthEnd)
  const currentExpenseByCat = new Map(); // catId -> sum (current month only)
  const netByMonth = {}; // monthKey -> net (income - expense), lookback → monthEnd
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of txs) {
    const mk = monthKey(t.date);
    const inCurrent = mk === currentKey;
    const inLookbackToEnd = mk >= lookbackStartKey && mk <= currentKey;
    const inLookbackToStart = mk >= lookbackStartKey && mk < currentKey;
    if (!inCurrent && !inLookbackToEnd) continue;

    const amt = baseAmountOf(t);

    if (inCurrent) {
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'expense') totalExpenses += amt;
    }

    if (t.type === 'expense' && t.category_id != null) {
      // Current-month per-category spend
      if (inCurrent) {
        currentExpenseByCat.set(t.category_id, (currentExpenseByCat.get(t.category_id) || 0) + amt);
      }
      // Prior-6-months (budget adherence) AND lookback→end (volatility) both
      // need per-category monthly totals; store the union and filter later.
      if (inLookbackToStart || inCurrent) {
        let byMonth = catExpenseByMonth.get(t.category_id);
        if (!byMonth) {
          byMonth = new Map();
          catExpenseByMonth.set(t.category_id, byMonth);
        }
        byMonth.set(mk, (byMonth.get(mk) || 0) + amt);
      }
    }

    if (inLookbackToEnd) {
      netByMonth[mk] = (netByMonth[mk] || 0) + (t.type === 'income' ? amt : -amt);
    }
  }

  const savings = totalIncome - totalExpenses;

  // --- Budget adherence + volatility, computed from the buckets ---
  const catIds = categories.map((c) => c.id);
  let categoriesOver = 0;
  let categoriesWithin = 0;
  let totalCategories = 0;
  const covs = [];

  for (const catId of catIds) {
    const byMonth = catExpenseByMonth.get(catId);
    const currentSpending = currentExpenseByCat.get(catId) || 0;

    // Prior-6-months average (months strictly before current).
    let priorSum = 0;
    let priorCount = 0;
    // Lookback→end values for volatility (includes current month).
    const volVals = [];
    if (byMonth) {
      for (const [mk, sum] of byMonth) {
        if (mk < currentKey) {
          priorSum += sum;
          priorCount += 1;
        }
        volVals.push(sum);
      }
    }
    const avgSpending = priorCount > 0 ? priorSum / priorCount : 0;

    if (avgSpending > 0 || currentSpending > 0) {
      totalCategories += 1;
      const status =
        avgSpending === 0 ? 'within' : currentSpending <= avgSpending * 1.1 ? 'within' : 'over';
      if (status === 'over') categoriesOver += 1;
      else categoriesWithin += 1;
    }

    if (volVals.length > 0) {
      const mean = volVals.reduce((a, b) => a + b, 0) / volVals.length;
      if (mean > 0) covs.push(stdDevPop(volVals) / mean); // HAVING AVG(total) > 0
    }
  }

  const budgetScore =
    totalCategories > 0
      ? Math.max(0, Math.min(100, (categoriesWithin / totalCategories) * 100))
      : 50;

  // --- Income/expense ratio score
  let ratioScore;
  if (totalIncome > 0) {
    const r = totalExpenses / totalIncome;
    if (r <= 0.5) ratioScore = 100;
    else if (r <= 0.8) ratioScore = 100 - ((r - 0.5) / 0.3) * 20;
    else if (r <= 1.0) ratioScore = 80 - ((r - 0.8) / 0.2) * 30;
    else ratioScore = Math.max(0, 50 - (r - 1.0) * 50);
  } else {
    ratioScore = totalExpenses > 0 ? 20 : 50;
  }

  const avgVolatility = covs.length > 0 ? covs.reduce((a, b) => a + b, 0) / covs.length : 0.5;
  const volatilityScore = Math.max(0, Math.min(100, (1 - avgVolatility) * 100));

  // --- Savings consistency: months (of lookback→monthEnd) with positive net
  const monthsWithSavings = Object.values(netByMonth).filter((n) => n > 0).length;
  let savingsScore = Math.min(100, (monthsWithSavings / 7) * 100);
  if (savings > 0) savingsScore = Math.min(100, savingsScore + 15);

  const finalScore =
    Math.round((budgetScore * 0.4 + ratioScore * 0.3 + volatilityScore * 0.2 + savingsScore * 0.1) * 10) / 10;

  // --- Insights (mirror the jsonb_build_object sequence)
  const insights = [];
  if (totalIncome > 0) {
    if (savings > 0) {
      insights.push({
        type: 'income_expense',
        status: 'positive',
        savings: round2(savings),
        savingsPercent: Math.round((savings / totalIncome) * 100),
      });
    } else {
      insights.push({ type: 'income_expense', status: 'negative', overspent: round2(Math.abs(savings)) });
    }
  } else {
    insights.push({
      type: 'income_expense',
      status: totalExpenses > 0 ? 'no_income' : 'no_data',
    });
  }
  if (totalCategories > 0) {
    if (categoriesOver === 0)
      insights.push({ type: 'budget', status: 'all_good', totalCategories });
    else if (categoriesOver === 1)
      insights.push({ type: 'budget', status: 'one_over', categoriesOver });
    else insights.push({ type: 'budget', status: 'multiple_over', categoriesOver });
  } else {
    insights.push({ type: 'budget', status: 'no_data' });
  }
  insights.push({
    type: 'savings',
    status: savings > 0 ? 'saving' : savings < 0 ? 'overspending' : 'breaking_even',
    amount: round2(Math.abs(savings)),
  });

  return {
    totalScore: finalScore,
    budgetAdherenceScore: round2(budgetScore),
    incomeExpenseRatioScore: round2(ratioScore),
    spendingVolatilityScore: round2(volatilityScore),
    savingsConsistencyScore: round2(savingsScore),
    totalIncome,
    totalExpenses,
    savingsAmount: savings,
    categoriesOverBudget: categoriesOver,
    categoriesWithinBudget: categoriesWithin,
    insights,
  };
}

// ---- Fetch + compute + persist -------------------------------------------
function firstOfMonthISO(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

async function fetchAllTransactions(supabase, userId) {
  const PAGE = 1000;
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, category_id, amount, base_amount, exchange_rate, date')
      .eq('user_id', userId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = data || [];
    all.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return decryptRows('transactions', all);
}

// Returns the same shape the old api/health.js fetchHealthScore did.
export async function getHealthScore(userId, { month } = {}) {
  const supabase = await getSupabase();
  const monthDate = firstOfMonthISO(month);

  const [txs, catsRes] = await Promise.all([
    fetchAllTransactions(supabase, userId),
    supabase.from('categories').select('id').eq('user_id', userId),
  ]);
  if (catsRes.error) throw catsRes.error;

  const computed = computeHealthScore(txs, catsRes.data || [], monthDate);

  // Persist snapshot (money fields encrypted via FIELD_MAP) — best-effort.
  try {
    const row = await encryptRow('financial_health_scores', {
      user_id: userId,
      month_date: monthDate,
      total_score: computed.totalScore,
      budget_adherence_score: computed.budgetAdherenceScore,
      income_expense_ratio_score: computed.incomeExpenseRatioScore,
      spending_volatility_score: computed.spendingVolatilityScore,
      savings_consistency_score: computed.savingsConsistencyScore,
      total_income: computed.totalIncome,
      total_expenses: computed.totalExpenses,
      savings_amount: computed.savingsAmount,
      categories_over_budget: computed.categoriesOverBudget,
      categories_within_budget: computed.categoriesWithinBudget,
      insights: computed.insights,
      calculated_at: new Date().toISOString(),
    });
    await supabase
      .from('financial_health_scores')
      .upsert(row, { onConflict: 'user_id,month_date' });
  } catch (e) {
    console.error('Persisting health score snapshot failed:', e);
  }

  return {
    monthDate,
    ...computed,
    calculatedAt: new Date().toISOString(),
  };
}

// History: read stored snapshots, decrypt money fields, map to the old shape.
export async function getHealthScoreHistory(userId, months = 12) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('financial_health_scores')
    .select('*')
    .eq('user_id', userId)
    .order('month_date', { ascending: false })
    .limit(months);
  if (error) throw error;

  const rows = await decryptRows('financial_health_scores', data || []);
  return rows.map((s) => ({
    id: s.id,
    monthDate: s.month_date ? String(s.month_date).slice(0, 10) : null,
    totalScore: Number(s.total_score) || 0,
    budgetAdherenceScore: Number(s.budget_adherence_score) || 0,
    incomeExpenseRatioScore: Number(s.income_expense_ratio_score) || 0,
    spendingVolatilityScore: Number(s.spending_volatility_score) || 0,
    savingsConsistencyScore: Number(s.savings_consistency_score) || 0,
    totalIncome: Number(s.total_income) || 0,
    totalExpenses: Number(s.total_expenses) || 0,
    savingsAmount: Number(s.savings_amount) || 0,
    calculatedAt: s.calculated_at,
  }));
}
