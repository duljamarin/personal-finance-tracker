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
  }).then(result => result || { generated: 0, transactions: [] });
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
    
    console.log('Health score history raw data:', data);
    
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

    const { data, error } = await supabase
      .from('transactions')
      .select('category_id, base_amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startDate)
      .lt('date', endDate)
      .eq('is_scheduled', false);

    if (error) throw error;

    const totals = {};
    for (const tx of (data || [])) {
      if (!tx.category_id) continue;
      totals[tx.category_id] = (totals[tx.category_id] || 0) + Number(tx.base_amount || 0);
    }
    return totals;
  }).then(result => result || {});
}
