import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { encryptRow, decryptRow, decryptRows } from '../crypto/rowCodec';
import { upsertNetWorthSnapshot } from '../finance/netWorth';

export async function fetchAssets() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('type', { ascending: true });

    if (error) throw error;
    const decrypted = await decryptRows('assets', data || []);
    // Server ORDER BY name is meaningless over ciphertext — re-sort client-side.
    return decrypted.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return (a.name || '').localeCompare(b.name || '');
    });
  });
}

export async function addAsset(asset) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const insertData = await encryptRow('assets', { ...asset, user_id: user.id });
    const { data, error } = await supabase
      .from('assets')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    await upsertNetWorthSnapshot(user.id);

    return decryptRow('assets', data);
  });
}

export async function updateAsset(id, asset) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const updateData = await encryptRow('assets', asset);
    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    await upsertNetWorthSnapshot(user.id);

    return decryptRow('assets', data);
  });
}

export async function deleteAsset(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await upsertNetWorthSnapshot(user.id);

    return 'OK';
  });
}

export async function fetchNetWorthHistory() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(24);

    if (error) throw error;
    // total_assets / total_liabilities / net_worth are E2E-encrypted text.
    return decryptRows('net_worth_snapshots', data || []);
  });
}
