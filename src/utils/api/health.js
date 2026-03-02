import { supabase } from '../supabaseClient';
import { withAuth } from './_auth';

// Category Benchmarks API
export async function fetchCategoryBenchmarks(months = 1) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_category_benchmarks', {
        p_user_id: user.id,
        p_months: months,
      });

    if (error) throw error;
    return data || [];
  });
}

/**
 * Fetch the financial health score for a given month.
 * @param {Object} options
 * @param {Date|string} options.month - The month to get score for (defaults to current month)
 * @param {boolean} options.forceRecalculate - Force recalculation even if cached
 * @returns {Promise<Object|null>} The health score data
 */
export async function fetchHealthScore({ month, forceRecalculate = false } = {}) {
  return withAuth(async (user) => {
    // Build RPC params — let SQL handle current month if not specified
    const params = {
      p_user_id: user.id,
      p_force_recalculate: forceRecalculate,
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
      calculatedAt: score.calculated_at,
    };
  });
}

/**
 * Fetch health score history for the past N months.
 * @param {number} months - Number of months to fetch (default 12)
 * @returns {Promise<Array>} Array of health score records
 */
export async function fetchHealthScoreHistory(months = 12) {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_health_score_history', {
        p_user_id: user.id,
        p_months: months,
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
        calculatedAt: score.calculated_at,
      };
    });
  });
}
