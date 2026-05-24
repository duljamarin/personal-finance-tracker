let supabasePromise = null;
function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('../supabaseClient').then(m => m.supabase);
  }
  return supabasePromise;
}

export async function withAuth(fn) {
  const supabase = await getSupabase();
  // getSession() reads from local cache — no HTTP round-trip per call.
  // getUser() makes a network request every time and causes 429s under load.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Please log in to perform this action');
  return fn(user);
}

export async function withAuthOrEmpty(fn) {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return [];
  return fn(user);
}

export { getSupabase };
