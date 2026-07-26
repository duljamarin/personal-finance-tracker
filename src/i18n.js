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

const initPromise = (async () => {
  const translation = await loadTranslation(pathLang);

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        [pathLang]: { translation },
      },
      lng: pathLang,
      supportedLngs: ['en', 'sq'],
      nonExplicitSupportedLngs: true,
      fallbackLng: 'en',
      debug: false,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      // Render immediately (no Suspense) for performance, but never paint a raw
      // key during the brief window before init/bundle load finishes — resolve
      // missing keys to an empty string instead of "some.key".
      parseMissingKeyHandler: () => '',
      detection: {
        order: ['path', 'localStorage', 'navigator'],
        lookupFromPathIndex: 0,
        caches: ['localStorage'],
      },
    });

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
