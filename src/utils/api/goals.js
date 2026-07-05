import { withAuth, getSupabase } from './_auth';
import { encryptRow, decryptRow, decryptRows } from '../crypto/rowCodec';
import { syncGoalProgress } from '../finance/goalProgress';

export async function fetchGoals(filters = {}) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
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
    return decryptRows('goals', data);
  });
}

export async function fetchGoalById(goalId) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
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
    return decryptRow('goals', data);
  });
}

export async function createGoal(goalData) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const insertData = await encryptRow('goals', {
      user_id: user.id,
      name: goalData.name,
      description: goalData.description || null,
      target_amount: goalData.targetAmount,
      target_date: goalData.targetDate || null,
      category_id: goalData.categoryId || null,
      goal_type: goalData.goalType || 'savings',
      priority: goalData.priority || 2,
      color: goalData.color || '#3B82F6',
    });

    const { data, error } = await supabase
      .from('goals')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return decryptRow('goals', data);
  });
}

export async function updateGoal(goalId, updates) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const updateData = await encryptRow('goals', {
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
    });

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return decryptRow('goals', data);
  });
}

export async function deleteGoal(goalId) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  });
}

export async function addContribution(goalId, contributionData) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const insertData = await encryptRow('goal_contributions', {
      goal_id: goalId,
      user_id: user.id,
      amount: contributionData.amount,
      contribution_date: contributionData.date || new Date().toISOString().split('T')[0],
      transaction_id: contributionData.transactionId || null,
      note: contributionData.note || null,
    });

    const { data, error } = await supabase
      .from('goal_contributions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    // The DB trigger that maintained goals.current_amount + milestone
    // completion is gone (amounts are encrypted). Recompute client-side; this
    // also fires percentage-milestone notifications.
    try {
      await syncGoalProgress(user.id, goalId);
    } catch (e) {
      console.error('goal progress sync failed:', e);
    }
    return decryptRow('goal_contributions', data);
  });
}

export async function fetchGoalsStats() {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data: goalsRaw, error } = await supabase
      .from('goals')
      .select('target_amount, current_amount, is_completed, is_active')
      .eq('user_id', user.id);

    if (error) throw error;

    // target_amount / current_amount are E2E-encrypted text — decrypt to numbers.
    const goals = await decryptRows('goals', goalsRaw || []);
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
