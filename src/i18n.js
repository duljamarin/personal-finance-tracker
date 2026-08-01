import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Path takes priority (for /sq SEO route); fall back to localStorage so
// language persists across OAuth redirects that land back on '/'.
const pathHasLang = window.location.pathname.startsWith('/sq');
const storedLang = localStorage.getItem('i18nextLng');
// On a localizable public page (landing or a /tools/... page) the URL is
// authoritative: no `/sq` prefix means English, even if localStorage says "sq".
// Otherwise a shared English link would flip to Albanian for anyone who had
// previously browsed the site in Albanian.
const onLocalizablePublicPath =
  window.location.pathname === '/' || window.location.pathname.startsWith('/tools/');
const pathLang = pathHasLang
  ? 'sq'
  : (onLocalizablePublicPath ? 'en' : (storedLang === 'sq' ? 'sq' : 'en'));

async function loadTranslation(lang) {
  if (lang === 'sq') {
    const mod = await import('./locales/sq/translation.json');
    return mod.default;
  }
  const mod = await import('./locales/en/translation.json');
  return mod.default;
}

// ── Synchronous init, before any await can yield to the renderer ────────────
//
// main.jsx calls render() on the line right after `import './i18n'`, so React
// can paint while the translation chunk is still being fetched. Configuring
// i18n inside an async function meant that during that window i18n had NO
// config, so t('app.name') returned the raw key — which is exactly what a cold
// load from a WhatsApp link showed: "app.name", "nav.pricing", "auth.login"
// rendered literally in the navbar. parseMissingKeyHandler could not prevent it
// because it was only installed after the await.
//
// So init() runs synchronously with an empty resource set: the missing-key
// guard is active from the very first paint, and the real bundle is attached a
// moment later by initPromise below.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {},
    lng: pathLang,
    supportedLngs: ['en', 'sq'],
    nonExplicitSupportedLngs: true,
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // Blank rather than a raw key: an empty label reads as "still loading",
    // a raw key reads as a broken app.
    parseMissingKeyHandler: () => '',
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
    },
  });

const initPromise = (async () => {
  const translation = await loadTranslation(pathLang);
  i18n.addResourceBundle(pathLang, 'translation', translation, true, true);
  // Re-emit so components mounted during the pre-bundle window re-render with
  // real strings instead of the blank placeholders.
  await i18n.changeLanguage(pathLang);
  return i18n;
})();

// Track which bundles are currently being fetched to avoid concurrent loads
// and to prevent the re-trigger from creating an infinite loop.
const loading = new Set();

i18n.on('languageChanged', async (lang) => {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  if (loading.has(lang)) return;
  loading.add(lang);
  try {
    const translation = await loadTranslation(lang);
    i18n.addResourceBundle(lang, 'translation', translation, true, true);
    // Re-trigger so components re-render with the now-loaded bundle.
    // loading.has(lang) guard above prevents the resulting languageChanged
    // from looping back here.
    await i18n.changeLanguage(lang);
  } finally {
    loading.delete(lang);
  }
});

export { initPromise };
export default i18n;
