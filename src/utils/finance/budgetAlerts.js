// Client-side port of the check_budget_notifications RPC. Computes current-
// month spend per budgeted category (direct expenses + splits, EUR-normalized)
// and creates a deduped 'budget_overrun' notification when spend crosses the
// user's threshold. Amounts are rendered into encrypted title/message; only
// category_id + month go into (plaintext) metadata for dedup.
import i18n from '../../i18n';
import { getSupabase } from '../api/_auth';
import { decryptRows } from '../crypto/rowCodec';
import { translateCategoryName } from '../categoryTranslation';
import { baseAmountOf, round2 } from './shared';
import { createNotificationDeduped } from './notify';

export async function checkBudgetNotifications(userId) {
  const supabase = await getSupabase();

  // 1. Settings gate. A brand-new account has no notification_settings row
  //    until it saves the settings page once; treat that absence as the
  //    defaults (overrun on, threshold 90 — mirrors the column defaults and
  //    the settings UI) so budget alerts work out of the box. Only an
  //    existing row that explicitly disables overrun suppresses the check.
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (settings && !settings.budget_overrun_enabled) return;
  const threshold = settings?.budget_threshold ?? 90;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKeyStr = `${year}-${String(month).padStart(2, '0')}`;

  // 2. Current-month budgets with category name.
  const { data: budgets, error: bErr } = await supabase
    .from('budgets')
    .select('id, category_id, amount, category:categories(id, name)')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month);
  if (bErr) throw bErr;
  if (!budgets || budgets.length === 0) return;

  const budgetRows = await decryptRows('budgets', budgets);

  // 3. Current-month expense transactions (decrypted) + splits.
  const startDate = `${monthKeyStr}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const { data: txRaw, error: tErr } = await supabase
    .from('transactions')
    .select('id, category_id, amount, base_amount, exchange_rate, has_splits, type')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lt('date', endDate);
  if (tErr) throw tErr;
  const txs = await decryptRows('transactions', txRaw || []);

  const directByCat = {};
  const splitParentIds = [];
  const rateById = {};
  for (const tx of txs) {
    if (tx.has_splits) {
      splitParentIds.push(tx.id);
      rateById[tx.id] = tx.exchange_rate == null ? 1.0 : Number(tx.exchange_rate);
    } else if (tx.category_id) {
      directByCat[tx.category_id] = (directByCat[tx.category_id] || 0) + baseAmountOf(tx);
    }
  }

  const splitByCat = {};
  if (splitParentIds.length > 0) {
    const { data: splitsRaw, error: sErr } = await supabase
      .from('transaction_splits')
      .select('category_id, amount, transaction_id')
      .eq('user_id', userId)
      .in('transaction_id', splitParentIds);
    if (sErr) throw sErr;
    const splits = await decryptRows('transaction_splits', splitsRaw || []);
    for (const s of splits) {
      if (!s.category_id) continue;
      const rate = rateById[s.transaction_id] || 1.0;
      splitByCat[s.category_id] = (splitByCat[s.category_id] || 0) + Number(s.amount) * rate;
    }
  }

  // 4. Per budget: spent >= threshold amount → notify (deduped).
  for (const b of budgetRows) {
    const budgetAmount = Number(b.amount);
    if (!budgetAmount || budgetAmount <= 0) continue;
    const spent = (directByCat[b.category_id] || 0) + (splitByCat[b.category_id] || 0);
    const thresholdAmount = (budgetAmount * threshold) / 100.0;
    if (spent < thresholdAmount) continue;

    const category = translateCategoryName(b.category?.name || '');
    const spentR = round2(spent);
    const percent = Math.round((spent / budgetAmount) * 100);

    await createNotificationDeduped(userId, {
      type: 'budget_overrun',
      title: i18n.t('notifications.budgetAlertTitle', { category }),
      message: i18n.t('notifications.budgetAlertMessage', {
        category,
        spent: spentR,
        budget: budgetAmount,
        percent,
      }),
      metadata: { category_id: b.category_id, month: monthKeyStr },
      dedup: { category_id: b.category_id, month: monthKeyStr },
      windowHours: 72,
    });
  }
}
