import { withAuth, getSupabase } from './_auth';
import { APP_CONFIG } from '../../config/app';

// Per-user settings. preferred_currency is the single currency the entire app
// displays and accepts input in — see
// supabase_migrations/20260731090000_add_user_settings_preferred_currency.sql.
//
// Nothing here is encrypted: a currency code is not sensitive, and keeping it
// plaintext is what lets SQL and Edge Functions read it.

/**
 * Reads the user's currency. Falls back to the base currency when no row
 * exists yet (a signup whose trigger has not landed, or an offline read) so
 * callers never have to handle a missing value.
 */
export async function fetchUserSettings() {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('user_settings')
      .select('preferred_currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return {
      preferredCurrency: data?.preferred_currency || APP_CONFIG.BASE_CURRENCY,
    };
  });
}

// Small module-level cache: writes go through updatePreferredCurrency, which
// refreshes it, so a stale read is not possible within a session.
let cached = null;

/**
 * The currency to stamp on newly written rows. Cached because it is read on
 * every insert. Falls back to the base currency if the row cannot be read, so a
 * write is never blocked by this lookup.
 */
export async function getWriteCurrency(user) {
  if (cached) return cached;
  try {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from('user_settings')
      .select('preferred_currency')
      .eq('user_id', user.id)
      .maybeSingle();
    cached =
      data?.preferred_currency ||
      user.user_metadata?.preferred_currency ||
      APP_CONFIG.BASE_CURRENCY;
  } catch {
    cached = user.user_metadata?.preferred_currency || APP_CONFIG.BASE_CURRENCY;
  }
  return cached;
}

/**
 * Sets the user's currency WITHOUT touching stored amounts. Used by onboarding,
 * where there is nothing to convert yet.
 *
 * To change currency on an account that already has data, use
 * convertAllAmounts() in utils/currencyConversion.js — it scales every stored
 * value and flips the currency only once that succeeds. Calling this instead
 * would relabel the data without converting it.
 *
 * Upsert (not update) because the row may not exist for accounts created before
 * the signup trigger was added.
 */
export async function updatePreferredCurrency(currencyCode) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();

    // Never move the label while a conversion is mid-flight: the run finishes by
    // setting preferred_currency itself, and racing it would leave the currency
    // pointing at data that is only half converted.
    const { data: state } = await supabase
      .from('user_settings')
      .select('conversion_state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (state?.conversion_state === 'converting') {
      throw new Error('A currency conversion is in progress');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, preferred_currency: currencyCode },
        { onConflict: 'user_id' }
      )
      .select('preferred_currency')
      .single();

    if (error) throw error;
    cached = data.preferred_currency;
    return { preferredCurrency: data.preferred_currency };
  });
}
