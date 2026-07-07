import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { encryptRow, decryptRow, decryptRows } from '../crypto/rowCodec';
import { checkBudgetNotifications } from '../finance/budgetAlerts';

export async function fetchBudgets(year, month) {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return decryptRows('budgets', data || []);
  });
}

export async function createBudget({ categoryId, year, month, amount }) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const insertData = await encryptRow('budgets', {
      user_id: user.id,
      category_id: categoryId,
      year: year,
      month: month,
      amount: amount,
    });
    const { data, error } = await supabase
      .from('budgets')
      .insert(insertData)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    // New budget may already be over threshold given existing spend.
    checkBudgetNotifications(user.id).catch(() => {});
    return decryptRow('budgets', data);
  });
}

export async function updateBudget(id, { amount }) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const updateData = await encryptRow('budgets', { amount });
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    // Lowering the budget may push existing spend past the threshold.
    checkBudgetNotifications(user.id).catch(() => {});
    return decryptRow('budgets', data);
  });
}

export async function deleteBudget(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  });
}

export async function fetchMonthlyExpensesByCategory(year, month) {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('id, category_id, base_amount, has_splits, exchange_rate')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lt('date', endDate);

    if (txError) throw txError;

    // base_amount is E2E-encrypted text server-side — decrypt before summing.
    const allTx = await decryptRows('transactions', txData || []);
    const splitParentIds = [];
    const totals = {};

    for (const tx of allTx) {
      if (tx.has_splits) {
        splitParentIds.push(tx.id);
      } else if (tx.category_id) {
        totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.base_amount || 0);
      }
    }

    if (splitParentIds.length > 0) {
      const rateMap = Object.fromEntries(
        allTx.filter(tx => tx.has_splits).map(tx => [tx.id, tx.exchange_rate || 1.0])
      );

      const { data: splitData, error: splitError } = await supabase
        .from('transaction_splits')
        .select('category_id, amount, transaction_id')
        .eq('user_id', user.id)
        .in('transaction_id', splitParentIds);

      if (splitError) throw splitError;

      const splits = await decryptRows('transaction_splits', splitData || []);
      for (const split of splits) {
        if (!split.category_id) continue;
        const rate = rateMap[split.transaction_id] || 1.0;
        totals[split.category_id] = (totals[split.category_id] || 0) + Number(split.amount) * rate;
      }
    }

    return totals;
  }).then(result => result || {});
}
