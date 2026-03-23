import { supabase } from '../supabaseClient';
import { withAuth, withAuthOrEmpty } from './_auth';

export async function fetchBudgets(year, month) {
  return withAuthOrEmpty(async (user) => {
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
    return data || [];
  });
}

export async function createBudget({ categoryId, year, month, amount }) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        year: year,
        month: month,
        amount: amount,
      })
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateBudget(id, { amount }) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('budgets')
      .update({
        amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    return data;
  });
}

export async function deleteBudget(id) {
  return withAuth(async (user) => {
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
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    // Direct (non-split) transactions — category_id is set.
    // Direct (non-split) transactions — category_id is set.
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('category_id, base_amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lt('date', endDate)
      .not('category_id', 'is', null);

    if (txError) throw txError;

    // Split transaction amounts — join through transactions for date/type filter.
    // Client-side date guard is also applied because nested PostgREST filters on
    // aliased relations can be silently ignored.
    const { data: splitData, error: splitError } = await supabase
      .from('transaction_splits')
      .select(`
        category_id,
        amount,
        transaction:transactions!inner(type, date, exchange_rate)
      `)
      .eq('user_id', user.id)
      .eq('transaction.type', 'expense')
      .gte('transaction.date', startDate)
      .lt('transaction.date', endDate);

    if (splitError) throw splitError;

    const totals = {};
    for (const tx of (txData || [])) {
      totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.base_amount || 0);
    }
    for (const split of (splitData || [])) {
      if (!split.category_id) continue;
      // Client-side date guard in case the nested PostgREST filter was ignored
      const txDate = split.transaction?.date;
      if (txDate && (txDate < startDate || txDate >= endDate)) continue;
      const rate = split.transaction?.exchange_rate || 1.0;
      totals[split.category_id] = (totals[split.category_id] || 0) + Number(split.amount) * rate;
    }
    return totals;
  }).then(result => result || {});
}
