import { supabase } from '../supabaseClient';
import { withAuth, withAuthOrEmpty } from './_auth';

// Helper function to calculate next date (handles month-end dates properly)
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
      // Store original month and add interval
      const targetMonth = date.getMonth() + interval;
      date.setMonth(targetMonth);
      // If the day changed (overflow), set to last day of target month
      if (date.getDate() !== originalDay) {
        date.setDate(0); // Go to last day of previous month (which is target month)
      }
      break;
    }
    case 'yearly': {
      const targetYear = date.getFullYear() + interval;
      date.setFullYear(targetYear);
      // Handle Feb 29 on non-leap years
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
      date,               // Exclude — recurring_transactions uses start_date instead
      isRecurring,        // Exclude frontend-only flag
      endType,            // Exclude frontend-only field
      updateRecurringTemplate, // Exclude frontend-only field
      sourceRecurringId,  // Exclude frontend-only field
      has_splits,         // Exclude — not a column on recurring_transactions
      splits,             // Exclude — not a column on recurring_transactions
      ...rest
    } = recurring;

    // Calculate next_run_at based on start_date
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
      updateRecurringTemplate, // Exclude frontend-only field
      sourceRecurringId,       // Exclude frontend-only field
      has_splits,              // Exclude — not a column on recurring_transactions
      splits,                  // Exclude — not a column on recurring_transactions
      isRecurring,             // Exclude frontend-only flag
      endType,                 // Exclude frontend-only field
      date,                    // Exclude — recurring uses start_date
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

    // Recalculate next_run_at if frequency or intervalCount changed
    if (frequency !== undefined || intervalCount !== undefined) {
      // Fetch current recurring transaction data
      const { data: current, error: fetchError } = await supabase
        .from('recurring_transactions')
        .select('frequency, interval_count, last_run_at, start_date, next_run_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Determine the new frequency and interval
      const newFrequency = frequency !== undefined ? frequency : current.frequency;
      const newIntervalCount = intervalCount !== undefined ? intervalCount : current.interval_count;

      // Base date: last_run_at if it exists (meaning at least one instance was created),
      // otherwise use start_date or next_run_at
      let baseDate;
      if (current.last_run_at) {
        baseDate = new Date(current.last_run_at).toISOString().split('T')[0];
      } else if (current.start_date) {
        baseDate = current.start_date;
      } else {
        baseDate = new Date(current.next_run_at).toISOString().split('T')[0];
      }

      // Calculate next_run_at from the base date + new interval
      const nextRunAt = calculateNextDate(baseDate, newFrequency, newIntervalCount);
      updateData.next_run_at = nextRunAt;

      // Recalculate occurrences_created based on actual instances in the database
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

// Generate recurring transaction instances (call this on app load or periodically).
// Only generates instances that are due (on or before today), never future instances.
export async function processRecurringTransactions() {
  return withAuthOrEmpty(async (user) => {
    // Fetch active recurring transactions that are due (next_run_at <= now)
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
      let loopAdvanced = false; // Track if we advanced past the original next_run_at

      // Generate all due instances (could be multiple if app wasn't opened for days)
      while (new Date(currentNextRun) <= new Date()) {
        // Check if we've reached the occurrences limit
        const totalCreated = (recurring.occurrences_created || 0) + instancesCreated;
        if (recurring.occurrences_limit && totalCreated >= recurring.occurrences_limit) {
          // Deactivate the recurring transaction
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          break;
        }

        // Check if end_date has passed
        const transactionDate = new Date(currentNextRun).toISOString().split('T')[0];
        if (recurring.end_date && new Date(transactionDate) > new Date(recurring.end_date)) {
          await supabase
            .from('recurring_transactions')
            .update({ is_active: false })
            .eq('id', recurring.id);
          break;
        }

        // Check for idempotency — don't create if already exists for this period
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('source_recurring_id', recurring.id)
          .eq('date', transactionDate)
          .single();

        if (!existing) {
          // Calculate base_amount
          const baseAmount = recurring.amount * (recurring.exchange_rate || 1.0);

          // Create the transaction instance
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
              is_scheduled: false, // Never scheduled since we only generate due instances
            }])
            .select(`
              *,
              category:categories(id, name)
            `)
            .single();

          if (insertError) {
            console.error('Error creating recurring transaction instance:', insertError);
            break; // Stop trying for this recurring rule
          }

          generatedTransactions.push(newTx);
          instancesCreated++;
        }

        // Calculate next date for next iteration (always advance, even if instance existed)
        currentNextRun = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count);
        loopAdvanced = true;
      }

      // Update the recurring transaction with the new next_run_at and count.
      // Update even if instancesCreated === 0 as long as we advanced the schedule.
      if (loopAdvanced) {
        const updateData = {
          next_run_at: currentNextRun,
          last_run_at: now,
        };

        // Only update occurrences_created if we actually created new instances
        if (instancesCreated > 0) {
          updateData.occurrences_created = (recurring.occurrences_created || 0) + instancesCreated;
        }

        await supabase
          .from('recurring_transactions')
          .update(updateData)
          .eq('id', recurring.id);
      }
    }

    return { generated: generatedTransactions.length, transactions: generatedTransactions };
  }).then(result => {
    if (!result) return { generated: 0, transactions: [] };
    // Fire recurring due notification check after processing (non-blocking)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase.rpc('check_recurring_notifications', { p_user_id: data.user.id })
          .then(() => {}).catch(() => {});
      }
    });
    return result;
  });
}
