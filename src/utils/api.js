import { supabase } from './supabaseClient';

/**
 * Authentication wrapper for API functions
 * Handles user authentication and provides user object to callback
 */
async function withAuth(fn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to perform this action');
  return fn(user);
}

/**
 * Authentication wrapper that returns empty array if not authenticated
 * Used for fetch operations that should silently fail
 */
async function withAuthOrEmpty(fn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return fn(user);
}

// Category API with Supabase
export async function fetchCategories() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  });
}

export async function addCategory(category) {
  return withAuth(async (user) => {
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
  });
}

export async function updateCategory(id, category) {
  return withAuth(async (user) => {
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
  });
}

export async function deleteCategory(id) {
  return withAuth(async (user) => {
    // Database CASCADE constraint will automatically delete associated transactions
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return 'OK';
  });
}

export async function getCategory(id) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  });
}

// Transaction API with Supabase
export async function fetchTransactions({ type, includeScheduled = true } = {}) {
  return withAuthOrEmpty(async (user) => {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name),
        recurring:source_recurring_id(start_date, last_run_at)
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
  });
}

export async function addTransaction(transaction) {
  return withAuth(async (user) => {
    // Remove category object if present, keep only categoryId
    // Also remove frontend-only fields
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
    
    // Calculate base_amount: amount * exchange_rate (or just amount if no exchange rate)
    const rate = exchangeRate || 1.0;
    const baseAmount = transaction.amount * rate;
    
    const insertData = {
      ...rest,
      date: _date,
      category_id: categoryId,
      user_id: user.id,
      currency_code: currencyCode || 'EUR',
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
    // Fire budget notification check asynchronously (non-blocking)
    supabase.rpc('check_budget_notifications', { p_user_id: user.id }).then(() => {}).catch(() => {});
    return data;
  });
}

export async function updateTransaction(id, transaction) {
  return withAuth(async (user) => {
    // Also remove frontend-only fields
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
    
    // Calculate base_amount: amount * exchange_rate (or just amount if no exchange rate)
    const rate = exchangeRate !== undefined ? exchangeRate : undefined;
    const amount = transaction.amount;

    const updateData = {
      ...rest,
      category_id: categoryId
    };

    // Only include currency fields if provided
    if (currencyCode !== undefined) updateData.currency_code = currencyCode;
    if (rate !== undefined) updateData.exchange_rate = rate;
    // Recalculate base_amount if either amount or rate changed
    if (amount !== undefined && rate !== undefined) {
      updateData.base_amount = amount * rate;
    } else if (amount !== undefined) {
      // Amount changed but no new rate — use rate of 1.0 as fallback
      updateData.base_amount = amount * 1.0;
    }
    // If only rate changed without amount, skip base_amount update
    // (the existing DB amount is unknown here, so we can't recalculate safely)
    
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
    // Fire budget notification check asynchronously (non-blocking)
    supabase.rpc('check_budget_notifications', { p_user_id: user.id }).then(() => {}).catch(() => {});
    return data;
  });
}

export async function deleteTransaction(id, options = {}) {
  return withAuth(async (user) => {
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
  });
}

export async function getTransaction(id) {
  return withAuth(async (user) => {
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

// Recurring Transaction API with Supabase

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
      date, // Exclude date field - recurring_transactions uses start_date instead
      isRecurring, // Exclude frontend-only flag
      endType, // Exclude frontend-only field
      updateRecurringTemplate, // Exclude frontend-only field
      sourceRecurringId, // Exclude frontend-only field
      has_splits, // Exclude - not a column on recurring_transactions
      splits, // Exclude - not a column on recurring_transactions
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
      sourceRecurringId, // Exclude frontend-only field
      has_splits, // Exclude - not a column on recurring_transactions
      splits, // Exclude - not a column on recurring_transactions
      isRecurring, // Exclude frontend-only flag
      endType, // Exclude frontend-only field
      date, // Exclude - recurring uses start_date
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

// Generate recurring transaction instances (call this on app load or periodically)
// Only generates instances that are due (on or before today), never future instances
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

// Category Benchmarks API
export async function fetchCategoryBenchmarks(months = 1) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_category_benchmarks', {
        p_user_id: user.id,
        p_months: months
      });
    
    if (error) throw error;
    return data || [];
  });
}

// Financial Health Score API

/**
 * Fetch the financial health score for a given month
 * @param {Object} options - Options for fetching
 * @param {Date|string} options.month - The month to get score for (defaults to current month)
 * @param {boolean} options.forceRecalculate - Force recalculation even if cached
 * @returns {Promise<Object>} The health score data
 */
export async function fetchHealthScore({ month, forceRecalculate = false } = {}) {
  return withAuth(async (user) => {
    // Build RPC params - let SQL handle current month if not specified
    const params = {
      p_user_id: user.id,
      p_force_recalculate: forceRecalculate
    };
    
    // Only pass month if explicitly specified
    if (month) {
      params.p_month = new Date(month).toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .rpc('get_financial_health_score', params);
    
    if (error) {
      console.error('Health score RPC error:', error);
      // If function doesn't exist, provide helpful message
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        throw new Error('Health score feature not yet set up. Please run the migration in Supabase SQL editor.');
      }
      throw error;
    }
    
    // RPC returns an array, get first item
    const score = data?.[0];
    if (!score) return null;
    
    // Transform snake_case to camelCase for frontend
    return {
      id: score.id,
      userId: score.user_id,
      monthDate: score.month_date,
      budgetAdherenceScore: parseFloat(score.budget_adherence_score),
      incomeExpenseRatioScore: parseFloat(score.income_expense_ratio_score),
      spendingVolatilityScore: parseFloat(score.spending_volatility_score),
      savingsConsistencyScore: parseFloat(score.savings_consistency_score),
      totalScore: parseFloat(score.total_score),
      totalIncome: parseFloat(score.total_income),
      totalExpenses: parseFloat(score.total_expenses),
      savingsAmount: parseFloat(score.savings_amount),
      categoriesOverBudget: score.categories_over_budget,
      categoriesWithinBudget: score.categories_within_budget,
      insights: score.insights || [],
      calculatedAt: score.calculated_at
    };
  });
}

/**
 * Fetch health score history for the past N months
 * @param {number} months - Number of months to fetch (default 12)
 * @returns {Promise<Array>} Array of health score records
 */
export async function fetchHealthScoreHistory(months = 12) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_health_score_history', {
        p_user_id: user.id,
        p_months: months
      });
    
    if (error) {
      console.error('Health score history RPC error:', error);
      // If function doesn't exist, return empty array instead of throwing
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('Health score functions not yet deployed. Please run the migration in Supabase SQL editor.');
        return [];
      }
      throw error;
    }
    
    
    // Transform snake_case to camelCase and normalize monthDate
    return (data || []).map(score => {
      // Normalize monthDate to ISO string format
      let monthDate = score.month_date || score.monthDate;
      if (monthDate) {
        try {
          monthDate = new Date(monthDate).toISOString().split('T')[0];
        } catch (e) {
          console.warn('Invalid monthDate format:', monthDate);
          monthDate = null;
        }
      }
      
      return {
        id: score.id,
        monthDate,
        // ensure totalScore is a finite number (fallback to 0)
        totalScore: Number.isFinite(Number(score.total_score)) ? Number(score.total_score) : 0,
        budgetAdherenceScore: Number.isFinite(Number(score.budget_adherence_score)) ? Number(score.budget_adherence_score) : 0,
        incomeExpenseRatioScore: Number.isFinite(Number(score.income_expense_ratio_score)) ? Number(score.income_expense_ratio_score) : 0,
        spendingVolatilityScore: Number.isFinite(Number(score.spending_volatility_score)) ? Number(score.spending_volatility_score) : 0,
        savingsConsistencyScore: Number.isFinite(Number(score.savings_consistency_score)) ? Number(score.savings_consistency_score) : 0,
        totalIncome: Number.isFinite(Number(score.total_income)) ? Number(score.total_income) : 0,
        totalExpenses: Number.isFinite(Number(score.total_expenses)) ? Number(score.total_expenses) : 0,
        savingsAmount: Number.isFinite(Number(score.savings_amount)) ? Number(score.savings_amount) : 0,
        calculatedAt: score.calculated_at
      };
    });
  });
}

// ============================================
// GOALS API
// ============================================

export async function fetchGoals(filters = {}) {
  return withAuth(async (user) => {
    let query = supabase
      .from('goals')
      .select('*, categories (id, name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    
    if (filters.isCompleted !== undefined) {
      query = query.eq('is_completed', filters.isCompleted);
    }
    
    if (filters.goalType) {
      query = query.eq('goal_type', filters.goalType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
}

export async function fetchGoalById(goalId) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        categories (id, name),
        goal_milestones (
          id, title, target_amount, target_date, is_completed, completed_at, order_index
        )
      `)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  });
}

export async function createGoal(goalData) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        name: goalData.name,
        description: goalData.description || null,
        target_amount: goalData.targetAmount,
        target_date: goalData.targetDate || null,
        category_id: goalData.categoryId || null,
        goal_type: goalData.goalType || 'savings',
        priority: goalData.priority || 2,
        color: goalData.color || '#3B82F6'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateGoal(goalId, updates) {
  return withAuth(async (user) => {
    const updateData = {
      name: updates.name,
      description: updates.description ?? null,
      target_amount: updates.targetAmount,
      target_date: updates.targetDate ?? null,
      category_id: updates.categoryId ?? null,
      goal_type: updates.goalType,
      priority: updates.priority,
      color: updates.color,
      ...(updates.isActive !== undefined && { is_active: updates.isActive }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function deleteGoal(goalId) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  });
}

export async function fetchContributions(goalId) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('goal_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('contribution_date', { ascending: false });

    if (error) throw error;
    return data;
  });
}

export async function addContribution(goalId, contributionData) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('goal_contributions')
      .insert({
        goal_id: goalId,
        user_id: user.id,
        amount: contributionData.amount,
        contribution_date: contributionData.date || new Date().toISOString().split('T')[0],
        transaction_id: contributionData.transactionId || null,
        note: contributionData.note || null
      })
      .select()
      .single();

    if (error) throw error;
    // Fire goal milestone notification check asynchronously (non-blocking)
    // DB trigger has already updated current_amount by the time this runs
    supabase.rpc('check_goal_milestone_notifications', {
      p_user_id: user.id,
      p_goal_id: goalId
    }).then(() => {}).catch(() => {});
    return data;
  });
}

export async function deleteContribution(contributionId) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('goal_contributions')
      .delete()
      .eq('id', contributionId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  });
}

export async function fetchGoalsStats() {
  return withAuth(async (user) => {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('target_amount, current_amount, is_completed, is_active')
      .eq('user_id', user.id);

    if (error) throw error;

    const activeGoals = goals.filter(g => g.is_active && !g.is_completed);
    const completedGoals = goals.filter(g => g.is_completed);
    const totalTarget = activeGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
    const totalSaved = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      totalTarget,
      totalSaved,
      overallProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
    };
  });
}

// ============================================
// BUDGETS API
// ============================================

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
        amount: amount
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
        updated_at: new Date().toISOString()
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

    // Direct (non-split) transactions — category_id is set
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('category_id, base_amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lt('date', endDate)
      .eq('is_scheduled', false)
      .not('category_id', 'is', null);

    if (txError) throw txError;

    // Split transaction amounts — join through transactions for date/type filter
    const { data: splitData, error: splitError } = await supabase
      .from('transaction_splits')
      .select(`
        category_id,
        amount,
        transaction:transactions!inner(type, date, exchange_rate, is_scheduled)
      `)
      .eq('user_id', user.id)
      .eq('transaction.type', 'expense')
      .gte('transaction.date', startDate)
      .lt('transaction.date', endDate)
      .eq('transaction.is_scheduled', false);

    if (splitError) throw splitError;

    const totals = {};
    for (const tx of (txData || [])) {
      totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.base_amount || 0);
    }
    for (const split of (splitData || [])) {
      if (!split.category_id) continue;
      const rate = split.transaction?.exchange_rate || 1.0;
      totals[split.category_id] = (totals[split.category_id] || 0) + Number(split.amount) * rate;
    }
    return totals;
  }).then(result => result || {});
}

// ============================================
// SUBSCRIPTION API
// ============================================

export async function fetchSubscription() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_subscription_status', { p_user_id: user.id });

    if (error) {
      // If function doesn't exist yet, return null gracefully
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('Subscription functions not yet deployed.');
        return null;
      }
      throw error;
    }
    return data?.[0] || null;
  });
}

export async function getMonthlyTransactionCount() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_monthly_transaction_count', { p_user_id: user.id });

    if (error) {
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        return 0;
      }
      throw error;
    }
    return data ?? 0;
  });
}
/**
 * Deletes the currently authenticated user's account and all associated data.
 * Cancels any active Paddle subscription, deletes all application data,
 * and removes the auth.users record — all handled by the delete-user Edge Function.
 */
export async function deleteUserAccount() {
  return withAuth(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const response = await supabase.functions.invoke('delete-user', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) throw response.error;

    await supabase.auth.signOut();
  });
}

// ============================================
// CSV IMPORT
// ============================================

export async function bulkImportTransactions(transactions) {
  return withAuth(async (user) => {
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

// ============================================
// NET WORTH - ASSETS
// ============================================

export async function fetchAssets() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

export async function addAsset(asset) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('assets')
      .insert([{ ...asset, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    // Update today's snapshot
    await supabase.rpc('upsert_net_worth_snapshot', { p_user_id: user.id });

    return data;
  });
}

export async function updateAsset(id, asset) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('assets')
      .update(asset)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Update today's snapshot
    await supabase.rpc('upsert_net_worth_snapshot', { p_user_id: user.id });

    return data;
  });
}

export async function deleteAsset(id) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // Update today's snapshot
    await supabase.rpc('upsert_net_worth_snapshot', { p_user_id: user.id });

    return 'OK';
  });
}

export async function fetchNetWorthHistory() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(24); // 2 years of monthly snapshots

    if (error) throw error;
    return data || [];
  });
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function fetchNotifications() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  });
}

export async function markNotificationAsRead(id) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function markAllNotificationsAsRead() {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return 'OK';
  });
}

export async function deleteNotification(id) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function getUnreadNotificationCount() {
  return withAuth(async (user) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  });
}

// ============================================
// NOTIFICATION SETTINGS
// ============================================

export async function fetchNotificationSettings() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // No settings row yet — return defaults
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  });
}

export async function updateNotificationSettings(settings) {
  return withAuth(async (user) => {
    const { email_enabled, budget_overrun_enabled, recurring_due_enabled,
            goal_milestone_enabled, trial_expiring_enabled, budget_threshold,
            recurring_advance_days, goal_milestone_percentage } = settings;

    const payload = {
      user_id: user.id,
      email_enabled,
      budget_overrun_enabled,
      recurring_due_enabled,
      goal_milestone_enabled,
      trial_expiring_enabled,
      budget_threshold,
      recurring_advance_days,
      goal_milestone_percentage,
    };

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

// ============================================
// TRANSACTION SPLITS
// ============================================

export async function fetchTransactionSplits(transactionId) {
  return withAuthOrEmpty(async (user) => {
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
    const { category, categoryId, currencyCode, exchangeRate, sourceRecurringId, splits: _splitsField, isRecurring, frequency, intervalCount, startDate, endDate, occurrencesLimit, ...rest } = transaction;
    const rate = exchangeRate || 1.0;

    // Insert the parent transaction (category_id is null for split transactions)
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

    // Insert splits if provided
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

    // Fire budget notification check asynchronously (non-blocking)
    supabase.rpc('check_budget_notifications', { p_user_id: user.id }).then(() => {}).catch(() => {});
    return tx;
  });
}

export async function updateTransactionWithSplits(id, transaction, splits) {
  return withAuth(async (user) => {
    const { category, categoryId, currencyCode, exchangeRate, sourceRecurringId, splits: _splitsField, isRecurring, frequency, intervalCount, startDate, endDate, occurrencesLimit, ...rest } = transaction;
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

    // Replace all splits for this transaction
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

    // Fire budget notification check asynchronously (non-blocking)
    supabase.rpc('check_budget_notifications', { p_user_id: user.id }).then(() => {}).catch(() => {});
    return tx;
  });
}