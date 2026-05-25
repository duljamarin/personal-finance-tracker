import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Detect language from URL path immediately (before any async load)
// so we only fetch the needed translation bundle.
const pathLang = window.location.pathname.startsWith('/sq') ? 'sq' : 'en';

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
      detection: {
        order: ['path', 'localStorage', 'navigator'],
        lookupFromPathIndex: 0,
        caches: ['localStorage'],
      },
    });

  return i18n;
})();

// When user switches language at runtime, load the other bundle on demand.
i18n.on('languageChanged', async (lang) => {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const translation = await loadTranslation(lang);
  i18n.addResourceBundle(lang, 'translation', translation, true, true);
});

export { initPromise };
export default i18n;
