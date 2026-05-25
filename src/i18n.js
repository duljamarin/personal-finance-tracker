import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const pathLang = window.location.pathname.startsWith('/sq') ? 'sq' : 'en';

async function loadTranslation(lang) {
  if (lang === 'sq') {
    const mod = await import('./locales/sq/translation.json');
    return mod.default;
  }
  const mod = await import('./locales/en/translation.json');
  return mod.default;
}

// Load the bundle for `lang` if not already present, then switch.
// Exported so LanguageSwitcher can call it directly — this guarantees the
// bundle is in place BEFORE languageChanged fires and components re-render.
export async function switchLanguage(lang) {
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    const t = await loadTranslation(lang);
    i18n.addResourceBundle(lang, 'translation', t, true, true);
  }
  return i18n.changeLanguage(lang);
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

export { initPromise };
export default i18n;
