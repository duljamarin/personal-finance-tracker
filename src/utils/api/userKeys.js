import { getSupabase } from './_auth';

// Note: these take an explicit userId (rather than reading it from the
// current session via withAuth) because key lifecycle operations run at
// moments — right after signInWithPassword, right after updateUser() during
// password reset — where the caller already has the authoritative user id
// and awaiting a fresh getSession() would be redundant.

export async function fetchUserKeys(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_keys')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertUserKeys(userId, fields) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_keys')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserKeys(userId, fields) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_keys')
    .update(fields)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserKeys(userId) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('user_keys')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
  return 'OK';
}
