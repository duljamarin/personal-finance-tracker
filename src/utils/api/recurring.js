import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { encryptRow, decryptRow, decryptRows } from '../crypto/rowCodec';
import { checkRecurringNotifications } from '../finance/recurringAlerts';

// anchorDay: the day-of-month the schedule is really pinned to (normally the
// day of start_date). Without it, monthly/yearly runs drift permanently
// downward: a 31st schedule clamps to the 30th in September, and because the
// next hop is computed from that clamped date the 31st is never recovered
// (31 Jul → 31 Aug → 30 Sep → 30 Oct → … → 28 Feb → 28 forever). Passing the
// anchor makes the clamp per-occurrence instead of cumulative, so short months
// borrow the last day and longer months snap back to the anchor.
export function calculateNextDate(currentDate, frequency, intervalCount, anchorDay = null) {
  const date = new Date(currentDate);
  const interval = intervalCount || 1;
  const originalDay = date.getUTCDate();
  // Fall back to the current day when no anchor is supplied, which keeps the
  // old 3-argument behaviour for callers that have no start_date at hand.
  const anchor = anchorDay || originalDay;

  // Set to `day`, or the month's last day when the month is too short. Assumes
  // `d` is already positioned on the 1st of the target month.
  const clampToMonth = (d, day) => {
    const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, daysInMonth));
  };

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + interval);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + interval * 7);
      break;
    case 'monthly': {
      // Move to the 1st first so adding months can't roll into the next one.
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + interval);
      clampToMonth(date, anchor);
      break;
    }
    case 'yearly': {
      date.setUTCDate(1);
      date.setUTCFullYear(date.getUTCFullYear() + interval);
      clampToMonth(date, anchor);
      break;
    }
    default:
      date.setUTCDate(date.getUTCDate() + interval);
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
    return decryptRows('recurring_transactions', data || []);
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

    const insertData = await encryptRow('recurring_transactions', {
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
    });

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return decryptRow('recurring_transactions', data);
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

      // Anchor on start_date's day (not baseDate's, which may already be a
      // clamped short-month date) so the schedule keeps its intended day.
      const anchorSource = startDate !== undefined ? startDate : current.start_date;
      const anchorDay = anchorSource ? new Date(anchorSource).getUTCDate() : null;

      const nextRunAt = calculateNextDate(baseDate, newFrequency, newIntervalCount, anchorDay);
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

    const encryptedUpdateData = await encryptRow('recurring_transactions', updateData);

    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(encryptedUpdateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) throw error;
    return decryptRow('recurring_transactions', data);
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

    // Decrypt templates first — amount/base_amount are E2E-encrypted text and
    // base_amount is recomputed below, so we need real numbers here.
    const decryptedRecurrings = await decryptRows('recurring_transactions', dueRecurrings);

    const generatedTransactions = [];

    for (const recurring of decryptedRecurrings) {
      let currentNextRun = recurring.next_run_at;
      let instancesCreated = 0;
      let loopAdvanced = false;
      // Day the schedule is pinned to — keeps end-of-month runs from drifting
      // down a day each time they pass through a short month.
      const anchorDay = recurring.start_date
        ? new Date(recurring.start_date).getUTCDate()
        : null;

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

        // limit(1) rather than maybeSingle(): if an account already has
        // duplicates for this date, maybeSingle() errors on multiple rows and
        // the ignored error leaves `existing` undefined, which would add yet
        // another copy. Any row at all means this instance exists.
        const { data: existingRows } = await supabase
          .from('transactions')
          .select('id')
          .eq('source_recurring_id', recurring.id)
          .eq('date', transactionDate)
          .limit(1);

        if (!existingRows || existingRows.length === 0) {
          const baseAmount = Number(recurring.amount) * (Number(recurring.exchange_rate) || 1.0);

          const insertRow = await encryptRow('transactions', {
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
          });

          const { data: newTx, error: insertError } = await supabase
            .from('transactions')
            .insert([insertRow])
            .select(`
              *,
              category:categories(id, name)
            `)
            .single();

          if (insertError) {
            // Unique-violation: concurrent run already inserted this instance — advance and continue
            if (insertError.code === '23505') {
              currentNextRun = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count, anchorDay);
              loopAdvanced = true;
              continue;
            }
            console.error('Error creating recurring transaction instance:', insertError);
            break;
          }

          generatedTransactions.push(newTx);
          instancesCreated++;
        }

        currentNextRun = calculateNextDate(transactionDate, recurring.frequency, recurring.interval_count, anchorDay);
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

    // Fire recurring due notification check after processing (non-blocking).
    // Ported client-side — amounts are E2E-encrypted.
    checkRecurringNotifications(user.id).catch(() => {});

    // Note: the insert above copies recurring.title/tags verbatim (may be
    // ciphertext) — correct, since it's re-encrypted under the same DEK.
    // Only decrypt for display when handing results back to callers.
    const decrypted = await decryptRows('transactions', generatedTransactions);
    return { generated: decrypted.length, transactions: decrypted };
  }).then(result => result || { generated: 0, transactions: [] });
}
