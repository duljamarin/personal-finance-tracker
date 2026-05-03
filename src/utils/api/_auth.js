import { supabase } from '../supabaseClient';

export async function withAuth(fn) {
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw error ?? new Error('Please log in to perform this action');
  return fn(user);
}

export async function withAuthOrEmpty(fn) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return [];
  return fn(user);
}
