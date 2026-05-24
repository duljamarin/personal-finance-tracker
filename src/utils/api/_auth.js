let supabasePromise = null;
function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('../supabaseClient').then(m => m.supabase);
  }
  return supabasePromise;
}

export async function withAuth(fn) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw error ?? new Error('Please log in to perform this action');
  return fn(user);
}

export async function withAuthOrEmpty(fn) {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return [];
  return fn(user);
}

export { getSupabase };
