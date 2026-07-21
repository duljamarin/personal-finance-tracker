/**
 * Public tools registry.
 *
 * Adding a tool is one entry here: it appears in the navbar automatically, and
 * the navbar switches itself from a direct link to a dropdown at two or more.
 * The route still needs registering in App.jsx (routes are declared, not
 * generated, everywhere else in this app — staying consistent with that).
 */
export const TOOLS = [
  {
    path: '/tools/salary-calculator',
    labelKey: 'nav.tools.salaryCalculator',
  },
  {
    path: '/tools/self-employed-calculator',
    labelKey: 'nav.tools.freelancerCalculator',
  },
];

/**
 * Build a tool URL for a given language.
 *
 * Albanian gets an explicit `/sq` prefix so a shared link opens in Albanian for
 * the recipient, regardless of their browser language or localStorage. Without
 * the prefix, i18n's path detector reads the first segment ("tools"), fails to
 * match a language, and falls back to English — which is exactly what happened
 * to links sent over WhatsApp.
 *
 * English stays unprefixed because it is the fallback language and `/` is the
 * canonical English landing route.
 */
export function toolPath(path, lang) {
  return String(lang || '').toLowerCase().startsWith('sq') ? `/sq${path}` : path;
}

/** Every routable variant of a tool path — used to register routes. */
export function toolPathVariants(path) {
  return [path, `/sq${path}`];
}

/**
 * Paths that have a real `/sq` twin registered in App.jsx. Tool paths come from
 * TOOLS so adding a tool stays a single-entry change; `/pricing` is listed
 * explicitly because it is not a tool. The landing pair is handled separately
 * since `/` -> `/sq` is not a prefix operation.
 *
 * Adding a path here WITHOUT registering `/sq<path>` in App.jsx sends the user
 * to the catch-all and back to the landing page — keep the two in sync.
 */
const SQ_PREFIXABLE = [...TOOLS.map((tool) => tool.path), '/pricing'];

/**
 * Translate the CURRENT pathname into its equivalent in another language.
 *
 * The language switcher must move the user across URLs, not just flip the i18n
 * state: on `/sq/...` the App-level effect re-reads the path on every render and
 * would immediately force the language back to Albanian, so switching to English
 * without changing the URL silently does nothing.
 *
 * Handles the landing pair (`/` <-> `/sq`) plus every path in SQ_PREFIXABLE.
 * Anything else (`/terms`, `/dashboard`) has no localised variant, so it is
 * returned unchanged and only the i18n state changes. Prefixing those would hit
 * the `*` catch-all and redirect the user to the landing page.
 *
 * @param {string} pathname current location.pathname
 * @param {string} lang target language ("sq" | "en")
 * @returns {string} pathname to navigate to
 */
export function localizedPath(pathname, lang) {
  const toSq = String(lang || '').toLowerCase().startsWith('sq');
  const isSqPath = pathname === '/sq' || pathname.startsWith('/sq/');

  if (toSq) {
    if (isSqPath) return pathname;              // already Albanian
    if (pathname === '/') return '/sq';         // landing
    // Only routes that actually have a `/sq` twin may be prefixed. Anything else
    // (/pricing, /terms, /dashboard) has no Albanian route, so prefixing it lands
    // on the catch-all and bounces the user to the landing page.
    if (SQ_PREFIXABLE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return `/sq${pathname}`;
    }
    return pathname;                            // no localised variant
  }

  if (!isSqPath) return pathname;               // already English
  const stripped = pathname.slice('/sq'.length); // "/sq/tools/x" -> "/tools/x"
  return stripped || '/';                        // "/sq" -> "/"
}
