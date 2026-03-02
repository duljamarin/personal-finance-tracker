import { supabase } from '../supabaseClient';

/**
 * Authentication wrapper for API functions.
 * Handles user authentication and provides the user object to the callback.
 * Throws if the user is not authenticated.
 */
export async function withAuth(fn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to perform this action');
  return fn(user);
}

/**
 * Authentication wrapper that returns an empty array if not authenticated.
 * Used for fetch operations that should silently fail when logged out.
 */
export async function withAuthOrEmpty(fn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return fn(user);
}
