import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { encryptRow, decryptRow, decryptRows } from '../crypto/rowCodec';
import { checkBudgetNotifications } from '../finance/budgetAlerts';
import { getWriteCurrency } from './userSettings';

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

    return decryptRows('transactions', all);
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

    // Single-currency app: rate is always 1.0 and base_amount == amount.
    const rate = exchangeRate || 1.0;
    const baseAmount = transaction.amount * rate;

    const insertData = await encryptRow('transactions', {
      ...rest,
      date: _date,
      category_id: categoryId,
      user_id: user.id,
      currency_code: currencyCode || (await getWriteCurrency(user)),
      exchange_rate: rate,
      base_amount: baseAmount,
      // Link to the template when the caller supplies one. Without this the row
      // is invisible to the recurring processor's de-dup check, which is what
      // let onboarding seeds get duplicated on the next run.
      ...(sourceRecurringId ? { source_recurring_id: sourceRecurringId } : {}),
    });

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    // Fire-and-forget: budget alerts are a side effect and now run as several
    // client round-trips (amounts are encrypted), so we don't block the add.
    checkBudgetNotifications(user.id).catch((e) =>
      console.error('budget notification check failed:', e)
    );
    return decryptRow('transactions', data);
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

    // base_amount must go THROUGH encryptRow, not be assigned after it: it is an
    // encrypted field, so setting it on the result would write plaintext into a
    // ciphertext column and later decrypt to garbage.
    // Single currency means it is simply a copy of amount.
    const updateData = await encryptRow('transactions', {
      ...rest,
      category_id: categoryId,
      ...(amount !== undefined ? { base_amount: amount } : {}),
    });

    if (currencyCode !== undefined) updateData.currency_code = currencyCode;
    if (rate !== undefined) updateData.exchange_rate = rate;

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
    // Fire-and-forget: budget alerts are a side effect and now run as several
    // client round-trips (amounts are encrypted), so we don't block the add.
    checkBudgetNotifications(user.id).catch((e) =>
      console.error('budget notification check failed:', e)
    );
    return decryptRow('transactions', data);
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
      .eq('user_id', user.id);

    if (error) throw error;
    // amount is encrypted text server-side — sort after decryption.
    const decrypted = await decryptRows('transaction_splits', data || []);
    return decrypted.sort((a, b) => Number(b.amount) - Number(a.amount));
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

    const insertData = await encryptRow('transactions', {
      ...rest,
      category_id: splits?.length > 0 ? null : categoryId,
      user_id: user.id,
      currency_code: currencyCode || (await getWriteCurrency(user)),
      exchange_rate: rate,
      base_amount: transaction.amount * rate,
      has_splits: splits?.length > 0,
      source_recurring_id: sourceRecurringId || null,
    });

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert([insertData])
      .select('*, category:categories(id, name)')
      .single();

    if (txError) throw txError;

    if (splits?.length > 0) {
      const splitRows = await Promise.all(splits.map(s => encryptRow('transaction_splits', {
        transaction_id: tx.id,
        user_id: user.id,
        category_id: s.category_id,
        amount: Number(s.amount),
        percentage: s.percentage ? Number(s.percentage) : null,
        notes: s.notes || null,
      })));

      const { error: splitError } = await supabase
        .from('transaction_splits')
        .insert(splitRows);

      if (splitError) throw splitError;
    }

    try {
      await checkBudgetNotifications(user.id);
    } catch (e) {
      console.error('budget notification check failed:', e);
    }
    return decryptRow('transactions', tx);
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

    const updateData = await encryptRow('transactions', {
      ...rest,
      category_id: hasSplits ? null : categoryId,
      currency_code: currencyCode || (await getWriteCurrency(user)),
      exchange_rate: rate,
      base_amount: transaction.amount * rate,
      has_splits: hasSplits,
      source_recurring_id: sourceRecurringId || null,
    });

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .update(updateData)
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
      const splitRows = await Promise.all(splits.map(s => encryptRow('transaction_splits', {
        transaction_id: id,
        user_id: user.id,
        category_id: s.category_id,
        amount: Number(s.amount),
        percentage: s.percentage ? Number(s.percentage) : null,
        notes: s.notes || null,
      })));

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
    return decryptRow('transactions', tx);
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
    return decryptRows('transactions', data || []);
  });
}

export async function bulkImportTransactions(transactions) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    // Imported rows are assumed to be in the user's currency — the CSV carries
    // no currency column and the app only has one currency.
    const writeCurrency = await getWriteCurrency(user);
    const rows = await Promise.all(transactions.map(tx => encryptRow('transactions', {
      title: tx.title,
      amount: tx.amount,
      type: tx.type,
      date: tx.date,
      category_id: tx.category_id,
      tags: tx.tags || [],
      currency_code: tx.currency_code || writeCurrency,
      exchange_rate: tx.exchange_rate || 1.0,
      base_amount: tx.amount * (tx.exchange_rate || 1.0),
      user_id: user.id,
    })));

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select('id');

    if (error) throw error;
    return { count: data?.length || 0 };
  });
}
