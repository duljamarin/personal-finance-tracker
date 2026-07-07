// Client-side replacement for three server pieces that broke once goal amounts
// became encrypted:
//   1. update_goal_current_amount() trigger  — re-SUM contributions → goals.current_amount,
//      set is_completed / completed_at
//   2. check_milestone_completion() trigger   — mark goal_milestones whose target_amount
//      <= current_amount as completed
//   3. check_goal_milestone_notifications RPC  — fire percentage-milestone notifications
//
// Call syncGoalProgress(userId, goalId) after any goal_contributions add/delete.
import i18n from '../../i18n';
import { getSupabase } from '../api/_auth';
import { decryptRows, decryptRow, encryptRow } from '../crypto/rowCodec';
import { round2 } from './shared';
import { createNotificationDeduped } from './notify';

// Re-run syncGoalProgress for every goal the user owns. Used after a
// notification-settings change (e.g. milestone step % changed) so already-
// reached milestones fire immediately instead of only on the next
// contribution. Runs sequentially to keep it simple; goal counts are small.
export async function syncAllGoalsProgress(userId) {
  const supabase = await getSupabase();
  const { data: goals, error } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  for (const g of goals || []) {
    await syncGoalProgress(userId, g.id).catch((e) =>
      console.error('syncGoalProgress failed for goal', g.id, e)
    );
  }
}

export async function syncGoalProgress(userId, goalId) {
  const supabase = await getSupabase();

  // 1. Re-SUM contributions (decrypted) → current_amount.
  const { data: contribRaw, error: cErr } = await supabase
    .from('goal_contributions')
    .select('amount')
    .eq('goal_id', goalId)
    .eq('user_id', userId);
  if (cErr) throw cErr;
  const contribs = await decryptRows('goal_contributions', contribRaw || []);
  const total = contribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  // 2. Read goal (need target_amount + prior state).
  const { data: goalRaw, error: gErr } = await supabase
    .from('goals')
    .select('id, name, target_amount, is_completed, completed_at, is_active')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();
  if (gErr) throw gErr;
  const goal = await decryptRow('goals', goalRaw);

  const target = Number(goal.target_amount || 0);
  const wasCompleted = goal.is_completed === true;
  const nowCompleted = target > 0 && total >= target;

  let completedAt = goal.completed_at;
  if (nowCompleted && !wasCompleted) completedAt = new Date().toISOString();
  else if (!nowCompleted) completedAt = null;

  // Write current_amount encrypted (goals is in FIELD_MAP with current_amount).
  const patch = await encryptRow('goals', { current_amount: total });
  patch.is_completed = nowCompleted;
  patch.completed_at = completedAt;
  patch.updated_at = new Date().toISOString();

  const { error: uErr } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', goalId)
    .eq('user_id', userId);
  if (uErr) throw uErr;

  // 3. Milestone auto-completion (goal_milestones.target_amount <= current).
  const { data: msRaw, error: mErr } = await supabase
    .from('goal_milestones')
    .select('id, target_amount, is_completed')
    .eq('goal_id', goalId);
  if (mErr) throw mErr;
  const milestones = await decryptRows('goal_milestones', msRaw || []);
  const toComplete = milestones.filter(
    (m) => !m.is_completed && Number(m.target_amount) <= total
  );
  if (toComplete.length > 0) {
    const nowIso = new Date().toISOString();
    await Promise.all(
      toComplete.map((m) =>
        supabase
          .from('goal_milestones')
          .update({ is_completed: true, completed_at: nowIso })
          .eq('id', m.id)
      )
    );
  }

  // 4. Percentage-milestone notifications.
  await notifyGoalMilestones(userId, { ...goal, current_amount: total });
}

async function notifyGoalMilestones(userId, goal) {
  const supabase = await getSupabase();
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const enabled = settings ? settings.goal_milestone_enabled : true;
  const step = settings ? (settings.goal_milestone_percentage ?? 25) : 25;
  if (!enabled) return;
  if (goal.is_active === false) return;

  const target = Number(goal.target_amount || 0);
  if (target <= 0) return;

  const progress = (Number(goal.current_amount) / target) * 100;
  const maxMilestone = Math.min(Math.floor(progress / step) * step, 100);

  for (let pct = step; pct <= maxMilestone; pct += step) {
    await createNotificationDeduped(userId, {
      type: 'goal_milestone',
      title: i18n.t('notifications.goalMilestoneTitle', { percent: pct, name: goal.name }),
      message: i18n.t('notifications.goalMilestoneMessage', {
        percent: pct,
        name: goal.name,
        current: round2(Number(goal.current_amount)),
        target: round2(target),
      }),
      metadata: { goal_id: goal.id, milestone_pct: pct },
      dedup: { goal_id: goal.id, milestone_pct: pct },
      windowHours: 0, // milestones dedup forever, not by time window
    });
  }
}
