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
