/**
 * Helper functions for authentication-related operations
 */

/**
 * Extracts username from user object
 * @param {object} user - Supabase user object
 * @returns {string} Username or empty string
 */
export function extractUsername(user) {
  return user?.user_metadata?.username || user?.email?.split('@')[0] || '';
}

/**
 * Stores username in localStorage
 * @param {object} user - Supabase user object
 */
export function storeUsername(user) {
  if (user) {
    const username = extractUsername(user);
    if (username) {
      localStorage.setItem('username', username);
    }
  } else {
    localStorage.removeItem('username');
  }
}

/**
 * Gets stored username from localStorage
 * @returns {string|null} Stored username or null
 */
export function getStoredUsername() {
  return localStorage.getItem('username');
}
