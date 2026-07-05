// Client-side replacement for upsert_net_worth_snapshot RPC. Sums assets vs.
// liabilities (decrypted) and upserts today's snapshot with encrypted totals.
// Call after any asset add/update/delete.
import { getSupabase } from '../api/_auth';
import { decryptRows, encryptRow } from '../crypto/rowCodec';

export async function upsertNetWorthSnapshot(userId) {
  const supabase = await getSupabase();

  const { data: raw, error } = await supabase
    .from('assets')
    .select('type, current_value')
    .eq('user_id', userId);
  if (error) throw error;

  const assets = await decryptRows('assets', raw || []);
  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const a of assets) {
    const v = Number(a.current_value || 0);
    if (a.type === 'liability') totalLiabilities += v;
    else totalAssets += v;
  }
  const netWorth = totalAssets - totalLiabilities;

  const today = new Date().toISOString().slice(0, 10);
  const row = await encryptRow('net_worth_snapshots', {
    user_id: userId,
    snapshot_date: today,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    net_worth: netWorth,
  });

  const { error: upErr } = await supabase
    .from('net_worth_snapshots')
    .upsert(row, { onConflict: 'user_id,snapshot_date' });
  if (upErr) throw upErr;
}
