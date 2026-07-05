// Client-side port of get_category_benchmarks RPC. Returns per-category
// spending benchmarks: trailing-N-month avg ± population std dev thresholds,
// current-month spend, and below/within/above/new status. Field names match
// the RPC's return columns so CategoryBenchmark.jsx is unchanged.
//
// Note: the SQL used amount * exchange_rate (NOT base_amount) — preserved here.
import { getSupabase } from '../api/_auth';
import { decryptRows } from '../crypto/rowCodec';
import { monthKey, stdDevPop, avg, round2 } from './shared';

export async function computeCategoryBenchmarks(userId, pMonths = 6) {
  const supabase = await getSupabase();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthKey = monthKey(
    `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}`
  );

  // All expense transactions with a category (decrypted).
  const { data: txRaw, error: tErr } = await supabase
    .from('transactions')
    .select('category_id, amount, exchange_rate, date, type')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .not('category_id', 'is', null);
  if (tErr) throw tErr;
  const txs = await decryptRows('transactions', txRaw || []);

  // Category names.
  const { data: cats, error: cErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);
  if (cErr) throw cErr;
  const nameById = Object.fromEntries((cats || []).map((c) => [c.id, c.name]));

  // Bucket monthly sums per category. Past months (< current) feed the
  // benchmark; current month is measured against it.
  const pastByCat = {}; // catId -> { monthKey -> sum }
  const currentByCat = {}; // catId -> sum

  for (const t of txs) {
    const amt = Number(t.amount) * (t.exchange_rate == null ? 1.0 : Number(t.exchange_rate));
    if (Number.isNaN(amt)) continue;
    const mk = monthKey(t.date);
    if (mk >= currentMonthKey) {
      currentByCat[t.category_id] = (currentByCat[t.category_id] || 0) + amt;
    } else {
      (pastByCat[t.category_id] ||= {});
      pastByCat[t.category_id][mk] = (pastByCat[t.category_id][mk] || 0) + amt;
    }
  }

  const catIds = new Set([...Object.keys(pastByCat), ...Object.keys(currentByCat)]);
  const results = [];

  for (const catId of catIds) {
    // Most recent pMonths months of past data.
    const monthMap = pastByCat[catId] || {};
    const monthlyTotals = Object.entries(monthMap)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // desc by month
      .slice(0, pMonths)
      .map(([, v]) => v);

    const hasStats = monthlyTotals.length >= 1;
    const avgSpending = hasStats ? avg(monthlyTotals) : null;
    const stdDev = hasStats ? stdDevPop(monthlyTotals) : 0;
    const current = currentByCat[catId] || 0;

    const band = (a, s) => (s === 0 ? a * 0.2 : s);
    const lower = hasStats ? Math.max(0, avgSpending - band(avgSpending, stdDev)) : 0;
    const upper = hasStats ? avgSpending + band(avgSpending, stdDev) : 0;

    let status;
    if (!hasStats) status = 'new';
    else if (current < lower) status = 'below';
    else if (current > upper) status = 'above';
    else status = 'within';

    results.push({
      category_id: catId,
      category_name: nameById[catId] || '',
      avg_monthly_spending: round2(avgSpending || 0),
      std_deviation: round2(stdDev),
      lower_threshold: round2(lower),
      upper_threshold: round2(upper),
      current_month_spending: round2(current),
      months_with_data: hasStats ? monthlyTotals.length : 0,
      status,
    });
  }

  // ORDER BY COALESCE(avg_spending, current, 0) DESC
  results.sort((a, b) => {
    const av = a.avg_monthly_spending || a.current_month_spending || 0;
    const bv = b.avg_monthly_spending || b.current_month_spending || 0;
    return bv - av;
  });

  return results;
}
