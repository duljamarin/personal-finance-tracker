// Harness stub for react-i18next. Resolves keys from the dictionary the
// harness entry put on window, and interpolates {{vars}} the same way i18next
// does, so layout width matches production for the chosen language.
export function useTranslation() {
  return {
    t: (key, opts) => {
      const dict = window.__HARNESS_DICT__ || {};
      let s = dict[key];
      if (s === undefined) s = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
      if (opts) {
        for (const [k, v] of Object.entries(opts)) {
          s = s.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
        }
      }
      return s;
    },
    i18n: { language: document.documentElement.lang || 'sq', changeLanguage: () => {} },
  };
}
export const Trans = ({ children }) => children ?? null;

// src/i18n.js imports these; they must exist as named exports or the module
// graph fails to link and NOTHING renders (which silently makes every overflow
// assertion vacuously true).
export const initReactI18next = { type: '3rdParty', init: () => {} };
export const I18nextProvider = ({ children }) => children ?? null;
export const withTranslation = () => (C) => C;
export const useSSR = () => {};

export default { useTranslation, Trans, initReactI18next, I18nextProvider, withTranslation };
