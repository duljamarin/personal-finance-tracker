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

    // Direct (non-split) transactions — category_id is set, has_splits excluded.
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('category_id, base_amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lt('date', endDate)
      .not('category_id', 'is', null)
      .or('has_splits.is.null,has_splits.eq.false');

    if (txError) throw txError;

    // For split transactions: first find qualifying parent transaction IDs,
    // then fetch their splits. This avoids relying on PostgREST nested filters
    // on aliased relations which can be silently ignored.
    const { data: splitParents, error: parentError } = await supabase
      .from('transactions')
      .select('id, exchange_rate')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('has_splits', true)
      .gte('date', startDate)
      .lt('date', endDate);

    if (parentError) throw parentError;

    const totals = {};
    for (const tx of (txData || [])) {
      totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.base_amount || 0);
    }

    // Fetch splits only for the qualifying parent transactions
    if (splitParents && splitParents.length > 0) {
      const parentIds = splitParents.map(p => p.id);
      const rateMap = Object.fromEntries(splitParents.map(p => [p.id, p.exchange_rate || 1.0]));

      const { data: splitData, error: splitError } = await supabase
        .from('transaction_splits')
        .select('category_id, amount, transaction_id')
        .eq('user_id', user.id)
        .in('transaction_id', parentIds);

      if (splitError) throw splitError;

      for (const split of (splitData || [])) {
        if (!split.category_id) continue;
        const rate = rateMap[split.transaction_id] || 1.0;
        totals[split.category_id] = (totals[split.category_id] || 0) + Number(split.amount) * rate;
      }
    }

    return totals;
  }).then(result => result || {});
}
