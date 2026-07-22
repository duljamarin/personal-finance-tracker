/**
 * Carries a loan installment from the public loan calculator into the app so the
 * "Add it in the app" CTA actually delivers on its promise.
 *
 * Why localStorage and not a URL param: the journey from the CTA to a usable,
 * authenticated screen is long and lossy. A new user goes register -> email
 * confirmation (a fresh tab, query string gone) -> login -> dashboard. Only
 * localStorage survives that whole path. An already-logged-in user takes a short
 * path, but the same carrier works for both.
 *
 * The payload is intentionally minimal and non-sensitive (an amount, a title, a
 * currency) — it seeds a prefilled recurring-transaction form; it never writes to
 * the database on its own. The user still reviews and saves.
 */
const KEY = 'pendingLoanRecurring';

// Guard against a stale payload silently reappearing weeks later.
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Store a pending prefill. Called from the loan calculator CTA just before
 * navigating to register/login.
 *
 * @param {{ amount:number, currency:string, title:string }} payload
 */
export function savePendingLoanRecurring(payload) {
  try {
    const amount = Number(payload?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return; // nothing worth carrying
    localStorage.setItem(
      KEY,
      JSON.stringify({
        amount,
        currency: payload.currency === 'EUR' ? 'EUR' : 'ALL',
        title: String(payload.title || '').slice(0, 120),
        savedAt: Date.now(),
      })
    );
  } catch {
    // Private mode / storage disabled: the CTA still navigates, it just can't
    // prefill. That degradation is acceptable.
  }
}

/**
 * Read the pending prefill WITHOUT clearing it. Returns null when absent, stale,
 * or malformed. Use consumePendingLoanRecurring to read-and-clear in one step.
 */
export function readPendingLoanRecurring() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const amount = Number(data?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (data?.savedAt && Date.now() - data.savedAt > MAX_AGE_MS) {
      clearPendingLoanRecurring();
      return null;
    }
    return { amount, currency: data.currency === 'EUR' ? 'EUR' : 'ALL', title: String(data.title || '') };
  } catch {
    return null;
  }
}

export function clearPendingLoanRecurring() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Read and clear atomically — the prefill must fire exactly once. */
export function consumePendingLoanRecurring() {
  const data = readPendingLoanRecurring();
  clearPendingLoanRecurring();
  return data;
}
