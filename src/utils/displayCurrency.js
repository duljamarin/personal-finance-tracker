// Non-React counterpart to hooks/useDisplayCurrency, for background paths
// (notification builders) that have no component context.
//
// The app is single-currency: every stored amount is already in the user's
// chosen currency, so this only resolves the currency code and applies the
// right symbol. No conversion, no exchange-rate dependency.
import { getSupabase } from './api/_auth';
import { formatCurrency } from './formatCurrency';
import { APP_CONFIG } from '../config/app';

/**
 * Returns a formatter: (value, opts) => string, in the user's currency.
 * Falls back to the base currency if the settings row cannot be read, so a
 * notification is never blocked by this lookup.
 */
export async function getDisplayFormatter() {
  const base = APP_CONFIG.BASE_CURRENCY;
  let currency = base;

  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      const { data } = await supabase
        .from('user_settings')
        .select('preferred_currency')
        .eq('user_id', userId)
        .maybeSingle();
      currency =
        data?.preferred_currency ||
        session.user.user_metadata?.preferred_currency ||
        base;
    }
  } catch {
    currency = base;
  }

  return (value, opts) => formatCurrency(Number(value) || 0, currency, opts);
}
