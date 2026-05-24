import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';

export function calculateNextDate(currentDate, frequency, intervalCount) {
  const date = new Date(currentDate);
  const interval = intervalCount || 1;
  const originalDay = date.getDate();

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + interval * 7);
      break;
    case 'monthly': {
      const targetMonth = date.getMonth() + interval;
      date.setMonth(targetMonth);
      if (date.getDate() !== originalDay) {
        date.setDate(0);
      }
      break;
    }
    case 'yearly': {
      const targetYear = date.getFullYear() + interval;
      date.setFullYear(targetYear);
      if (date.getDate() !== originalDay) {
        date.setDate(0);
      }
      break;
    }
    default:
      date.setDate(date.getDate() + interval);
  }

  return date.toISOString();
}

export async function fetchRecurringTransactions() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

export async function addRecurringTransaction(recurring) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      date,
      isRecurring,
      endType,
      updateRecurringTemplate,
      sourceRecurringId,
      has_splits,
      splits,
      ...rest
    } = recurring;

    const nextRunAt = new Date(startDate);
    nextRunAt.setUTCHours(0, 0, 0, 0);

    const insertData = {
      ...rest,
      category_id: categoryId,
      user_id: user.id,
      currency_code: currencyCode || 'EUR',
      exchange_rate: exchangeRate || 1.0,
      frequency: frequency,
      interval_count: intervalCount || 1,
      start_date: startDate,
      end_date: endDate || null,
      occurrences_limit: occurrencesLimit || null,
      next_run_at: nextRunAt.toISOString(),
      is_active: true,
    };

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateRecurringTransaction(id, recurring) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const {
      category,
      categoryId,
      currencyCode,
      exchangeRate,
      frequency,
      intervalCount,
      startDate,
      endDate,
      occurrencesLimit,
      isActive,
      updateRecurringTemplate,
      sourceRecurringId,
      has_splits,
      splits,
      isRecurring,
      endType,
      date,
      ...rest
    } = recurring;

    const updateData = { ...rest };

    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (currencyCode !== undefined) updateData.currency_code = currencyCode;
    if (exchangeRate !== undefined) updateData.exchange_rate = exchangeRate;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (intervalCount !== undefined) updateData.interval_count = intervalCount;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (occurrencesLimit !== undefined) updateData.occurrences_limit = occurrencesLimit;
    if (isActive !== undefined) updateData.is_active = isActive;

    if (frequency !== undefined || intervalCount !== undefined) {
      const { data: current, error: fetchError } = await supabase
        .from('recurring_transactions')
        .select('frequency, interval_count, last_run_at, start_date, next_run_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newFrequency = frequency !== undefined ? frequency : current.frequency;
      const newIntervalCount = intervalCount !== undefined ? intervalCount : current.interval_count;

      let baseDate;
      if (current.last_run_at) {
        baseDate = new Date(current.last_run_at).toISOString().split('T')[0];
      } else if (current.start_date) {
        baseDate = current.start_date;
      } else {
        baseDate = new Date(current.next_run_at).toISOString().split('T')[0];
      }

      const nextRunAt = calculateNextDate(baseDate, newFrequency, newIntervalCount);
      updateData.next_run_at = nextRunAt;

      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('source_recurring_id', id)
        .eq('user_id', user.id);

      if (!countError && count !== null) {
        updateData.occurrences_created = count;
      }
    }

    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(updateData)
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

export async function deleteRecurringTransaction(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function pauseRecurringTransaction(id) {
  return updateRecurringTransaction(id, { isActive: false });
}

export async function resumeRecurringTransaction(id) {
  return updateRecurringTransaction(id, { isActive: true });
}

export async function processRecurringTransactions() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const now = new Date().toISOString();
    const { data: dueRecurrings, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lte('next_run_at', now);

    if (fetchError) {
      console.error('Error fetching due recurring transactions:', fetchError);
      return { generated: 0, transactions: [] };
    }

    if (!dueRecurrings || dueRecurrings.length === 0) {
      return { generated: 0, transactions: [] };
    }

    const generatedTransactions = [];

    for (const recurring of dueRecurrings) {
      let currentNextRun = recurring.next_run_at;
      let instancesCreated = 0;
      let loopAdvanced = false;

      while (new Date(currentNextRun) <= new Date()) {
        const totalCreated = (recurring.occurrences_created || 0) + instancesCreated;
        if (recurring.occurrences_limit && totalCreated >= recurring.occurrences_limit) {
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          break;
        }

        const transactionDate = new Date(currentNextRun).toISOString().split('T')[0];
        if (recurring.end_date && new Date(transactionDate) > new Date(recurring.end_date)) {
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          break;
        }

        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('source_recurring_id', recurring.id)
          .eq('date', transactionDate)
          .single();

        if (!existing) {
          const baseAmount = recurring.amount * (recurring.exchange_rate || 1.0);

          const { data: newTx, error: insertError } = await supabase
            .from('transactions')
            .insert([{
              title: recurring.title,
              amount: recurring.amount,
              date: transactionDate,
              type: recurring.type,
              category_id: recurring.category_id,
              tags: recurring.tags || [],
              currency_code: recurring.currency_code,
              exchange_rate: recurring.exchange_rate,
              base_amount: baseAmount,
              user_id: user.id,
              source_recurring_id: recurring.id,
            }])
            .select(`
              *,
              category:categories(id, name)
            `)
            .single();

          if (insertError) {
            console.error('Error creating recurring transaction instance:', insertError);
            break;
          }

          generatedTransactions.push(newTx);
          instancesCreated++;
        }

        currentNextRun = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count);
        loopAdvanced = true;
      }

      if (loopAdvanced) {
        const updateData = {
          next_run_at: currentNextRun,
          last_run_at: now,
        };

        if (instancesCreated > 0) {
          updateData.occurrences_created = (recurring.occurrences_created || 0) + instancesCreated;
        }

        await supabase
          .from('recurring_transactions')
          .update(updateData)
          .eq('id', recurring.id);
      }
    }

    // Fire recurring due notification check after processing (non-blocking)
    supabase.rpc('check_recurring_notifications', { p_user_id: user.id })
      .then(() => {}).catch(() => {});

    return { generated: generatedTransactions.length, transactions: generatedTransactions };
  }).then(result => result || { generated: 0, transactions: [] });
}
