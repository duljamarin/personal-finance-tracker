import { supabase } from '../supabaseClient';
import { withAuth, withAuthOrEmpty } from './_auth';

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
