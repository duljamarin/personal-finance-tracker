import { supabase } from '../supabaseClient';
import { withAuth } from './_auth';

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
        color: goalData.color || '#3B82F6',
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
      updated_at: new Date().toISOString(),
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
        note: contributionData.note || null,
      })
      .select()
      .single();

    if (error) throw error;
    // Fire goal milestone notification check asynchronously (non-blocking)
    // DB trigger has already updated current_amount by the time this runs
    supabase.rpc('check_goal_milestone_notifications', {
      p_user_id: user.id,
      p_goal_id: goalId,
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
      overallProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    };
  });
}
