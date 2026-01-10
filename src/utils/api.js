import { supabase } from './supabaseClient';

// Category API with Supabase
export async function fetchCategories() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // Return empty array if not authenticated
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function addCategory(category) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to add categories');
  
  // Check if category already exists
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', category.name)
    .single();
  
  if (existing) {
    throw new Error('Category already exists.');
  }
  
  const { data, error } = await supabase
    .from('categories')
    .insert([{ ...category, user_id: user.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCategory(id, category) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to update categories');
  
  // Check if another category with the same name exists
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', category.name)
    .neq('id', id)
    .single();
  
  if (existing) {
    throw new Error('Category already exists.');
  }
  
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to delete categories');
  
  // Database CASCADE constraint will automatically delete associated transactions
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
  return 'OK';
}

export async function getCategory(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to view categories');
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  
  if (error) throw error;
  return data;
}

// Transaction API with Supabase
export async function fetchTransactions({ type, includeScheduled = true } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return []; // Return empty array if not authenticated
  
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false });
  
  // Filter by type if specified
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }
  
  // Optionally exclude scheduled (future) transactions
  if (!includeScheduled) {
    query = query.or('is_scheduled.is.null,is_scheduled.eq.false');
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function addTransaction(transaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to add transactions');
  
  // Remove category object if present, keep only categoryId
  // Also remove frontend-only fields
  const { 
    category, 
    categoryId, 
    currencyCode, 
    exchangeRate, 
    updateRecurringTemplate, 
    sourceRecurringId,
    ...rest 
  } = transaction;
  
  // Calculate base_amount: amount * exchange_rate (or just amount if no exchange rate)
  const rate = exchangeRate || 1.0;
  const baseAmount = transaction.amount * rate;
  
  const insertData = {
    ...rest,
    category_id: categoryId,
    user_id: user.id,
    currency_code: currencyCode || 'USD',
    exchange_rate: rate,
    base_amount: baseAmount
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
  return data;
}

export async function updateTransaction(id, transaction) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to update transactions');
  
  // Also remove frontend-only fields
  const { 
    category, 
    categoryId, 
    currencyCode, 
    exchangeRate, 
    updateRecurringTemplate, 
    sourceRecurringId,
    ...rest 
  } = transaction;
  
  // Calculate base_amount: amount * exchange_rate (or just amount if no exchange rate)
  const rate = exchangeRate !== undefined ? exchangeRate : 1.0;
  const baseAmount = transaction.amount !== undefined ? transaction.amount * rate : undefined;
  
  const updateData = {
    ...rest,
    category_id: categoryId
  };
  
  // Only include currency fields if provided
  if (currencyCode !== undefined) updateData.currency_code = currencyCode;
  if (exchangeRate !== undefined) updateData.exchange_rate = rate;
  if (baseAmount !== undefined) updateData.base_amount = baseAmount;
  
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
  return data;
}

export async function deleteTransaction(id, options = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to delete transactions');
  
  // First try to delete from transactions table
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  // If not found in transactions, try recurring_transactions
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
}

export async function getTransaction(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to view transactions');
  
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
}

// Recurring Transaction API with Supabase

export async function fetchRecurringTransactions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
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
}

export async function addRecurringTransaction(recurring) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to add recurring transactions');
  
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
    date, // Exclude date field - recurring_transactions uses start_date instead
    isRecurring, // Exclude frontend-only flag
    endType, // Exclude frontend-only field
    updateRecurringTemplate, // Exclude frontend-only field
    sourceRecurringId, // Exclude frontend-only field
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
    is_active: true
  };
  
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert([insertData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateRecurringTransaction(id, recurring) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to update recurring transactions');
  
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
    sourceRecurringId, // Exclude frontend-only field
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
}

export async function deleteRecurringTransaction(id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to delete recurring transactions');
  
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
  return 'OK';
}

export async function pauseRecurringTransaction(id) {
  return updateRecurringTransaction(id, { isActive: false });
}

export async function resumeRecurringTransaction(id) {
  return updateRecurringTransaction(id, { isActive: true });
}

// Generate recurring transaction instances (call this on app load or periodically)
// Only generates instances that are due (on or before today), never future instances
export async function processRecurringTransactions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { generated: 0, transactions: [] };
  
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
      
      // Check for idempotency - don't create if already exists for this period
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
            is_scheduled: false // Never scheduled since we only generate due instances
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
    
    // Update the recurring transaction with the new next_run_at and count
    // Update even if instancesCreated === 0 as long as we advanced the schedule
    if (loopAdvanced) {
      const updateData = { 
        next_run_at: currentNextRun,
        last_run_at: now
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
}

// Helper function to calculate next date (handles month-end dates properly)
function calculateNextDate(currentDate, frequency, intervalCount) {
  const date = new Date(currentDate);
  const interval = intervalCount || 1;
  const originalDay = date.getDate();
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (interval * 7));
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

// Check if a transaction is the first occurrence of its recurring rule
export async function isFirstOccurrence(transactionId, sourceRecurringId) {
  if (!sourceRecurringId) return false;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Get the current transaction's date
  const { data: currentTx, error: currentError } = await supabase
    .from('transactions')
    .select('date')
    .eq('id', transactionId)
    .single();
  
  if (currentError || !currentTx) return false;
  
  // Find the earliest transaction for this recurring rule
  const { data: firstTx, error: firstError } = await supabase
    .from('transactions')
    .select('id, date')
    .eq('source_recurring_id', sourceRecurringId)
    .eq('user_id', user.id)
    .order('date', { ascending: true })
    .limit(1)
    .single();
  
  if (firstError || !firstTx) return false;
  
  // Check if this is the first transaction
  return firstTx.id === transactionId;
}
