import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';

export async function fetchTransactions({ type } = {}) {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const PAGE_SIZE = 1000;
    const all = [];
    let from = 0;

    while (true) {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          source_recurring_id,
          category:categories(id, name),
          recurring:source_recurring_id(start_date, last_run_at)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (type && type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      const page = data || [];
      all.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return all;
  });
}

export async function addTransaction(transaction) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      updateRecurringTemplate,
      sourceRecurringId,
      has_splits,
      splits,
      isRecurring,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      endType,
      date: _date,
      ...rest
    } = transaction;

    const rate = exchangeRate || 1.0;
    const baseAmount = transaction.amount * rate;

    const insertData = {
      ...rest,
      date: _date,
      category_id: categoryId,
      user_id: user.id,
      currency_code: currencyCode || 'EUR',
      exchange_rate: rate,
      base_amount: baseAmount,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    try {
      await supabase.rpc('check_budget_notifications', { p_user_id: user.id });
    } catch (e) {
      console.error('budget notification check failed:', e);
    }
    return data;
  });
}

export async function updateTransaction(id, transaction) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      updateRecurringTemplate,
      sourceRecurringId,
      has_splits,
      splits,
      isRecurring,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      endType,
      ...rest
    } = transaction;

    const rate = exchangeRate !== undefined ? exchangeRate : undefined;
    const amount = transaction.amount;

    const updateData = {
      ...rest,
      category_id: categoryId,
    };

    if (currencyCode !== undefined) updateData.currency_code = currencyCode;
    if (rate !== undefined) updateData.exchange_rate = rate;
    if (amount !== undefined && rate !== undefined) {
      updateData.base_amount = amount * rate;
    } else if (amount !== undefined) {
      updateData.base_amount = amount * 1.0;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    try {
      await supabase.rpc('check_budget_notifications', { p_user_id: user.id });
    } catch (e) {
      console.error('budget notification check failed:', e);
    }
    return data;
  });
}

export async function deleteTransaction(id, options = {}) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (txError && txError.code === 'PGRST116') {
      const { error: recurringError } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (recurringError) throw recurringError;
    } else if (txError) {
      throw txError;
    }

    return 'OK';
  });
}

export async function getTransaction(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  });
}

export async function fetchTransactionSplits(transactionId) {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('transaction_splits')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .order('amount', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

export async function addTransactionWithSplits(transaction, splits) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      sourceRecurringId,
      splits: _splitsField,
      isRecurring,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      ...rest
    } = transaction;
    const rate = exchangeRate || 1.0;

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert([{
        ...rest,
        category_id: splits?.length > 0 ? null : categoryId,
        user_id: user.id,
        currency_code: currencyCode || 'EUR',
        exchange_rate: rate,
        base_amount: transaction.amount * rate,
        has_splits: splits?.length > 0,
        source_recurring_id: sourceRecurringId || null,
      }])
      .select('*, category:categories(id, name)')
      .single();

    if (txError) throw txError;

    if (splits?.length > 0) {
      const splitRows = splits.map(s => ({
        transaction_id: tx.id,
        user_id: user.id,
        category_id: s.category_id,
        amount: Number(s.amount),
        percentage: s.percentage ? Number(s.percentage) : null,
        notes: s.notes || null,
      }));

      const { error: splitError } = await supabase
        .from('transaction_splits')
        .insert(splitRows);

      if (splitError) throw splitError;
    }

    try {
      await supabase.rpc('check_budget_notifications', { p_user_id: user.id });
    } catch (e) {
      console.error('budget notification check failed:', e);
    }
    return tx;
  });
}

export async function updateTransactionWithSplits(id, transaction, splits) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      sourceRecurringId,
      splits: _splitsField,
      isRecurring,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      ...rest
    } = transaction;
    const rate = exchangeRate || 1.0;
    const hasSplits = splits?.length > 0;

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .update({
        ...rest,
        category_id: hasSplits ? null : categoryId,
        currency_code: currencyCode || 'EUR',
        exchange_rate: rate,
        base_amount: transaction.amount * rate,
        has_splits: hasSplits,
        source_recurring_id: sourceRecurringId || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, category:categories(id, name)')
      .single();

    if (txError) throw txError;

    const { error: delError } = await supabase
      .from('transaction_splits')
      .delete()
      .eq('transaction_id', id)
      .eq('user_id', user.id);

    if (delError) throw delError;

    if (hasSplits) {
      const splitRows = splits.map(s => ({
        transaction_id: id,
        user_id: user.id,
        category_id: s.category_id,
        amount: Number(s.amount),
        percentage: s.percentage ? Number(s.percentage) : null,
        notes: s.notes || null,
      }));

      const { error: splitError } = await supabase
        .from('transaction_splits')
        .insert(splitRows);

      if (splitError) throw splitError;
    }

   try {
      await supabase.rpc('check_budget_notifications', { p_user_id: user.id });
    } catch (e) {
      console.error('budget notification check failed:', e);
    }
    return tx;
  });
}

export async function fetchTransactionsForReport(startDate, endDate) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

export async function bulkImportTransactions(transactions) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const rows = transactions.map(tx => ({
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      category_id: tx.category_id,
      tags: tx.tags || [],
      currency_code: tx.currency_code || 'EUR',
      exchange_rate: tx.exchange_rate || 1.0,
      base_amount: tx.amount * (tx.exchange_rate || 1.0),
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select('id');

    if (error) throw error;
    return { count: data?.length || 0 };
  });
}
