import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { localizedPath } from '../lib/tools';
// The configured singleton. useTranslation()'s instance can be unbound on the
// first paint (main.jsx renders before init resolves), which silently drops the
// changeLanguage() call — importing it directly guarantees we hit the real one.
import i18nInstance from '../i18n';

const LANGS = [
  { code: 'sq', label: 'SQ' },
  { code: 'en', label: 'EN' },
];

function LanguageSwitcher({ vertical = false }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const current = (i18n.language || '').toLowerCase().startsWith('sq') ? 'sq' : 'en';

  /**
   * Switching language must move the URL too. On a `/sq`-prefixed route the
   * App-level effect re-derives the language from the path on every render, so
   * calling changeLanguage() alone gets reverted instantly and the click looks
   * like it did nothing. Navigating first lets that same effect apply the new
   * language for us; changeLanguage() then covers routes that have no localised
   * variant (e.g. /pricing), where the path never changes.
   */
  const changeLanguage = (lng) => {
    const target = localizedPath(location.pathname, lng);
    const inst = i18nInstance?.changeLanguage ? i18nInstance : i18n;
    inst.changeLanguage(lng);
    if (target !== location.pathname) {
      navigate(target + location.search + location.hash, { replace: true });
    }
  };

  return (
    <div className={`inline-flex ${vertical ? 'flex-col' : ''} items-center gap-0.5 text-sm rounded-pill bg-inner p-1`}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => changeLanguage(code)}
          aria-current={current === code ? 'true' : undefined}
          className={`btn-motion min-w-11 h-11 px-2.5 rounded-pill font-bold ${
            current === code
              ? 'bg-brand-600 text-white'
              : 'text-fg hover:bg-inner-2'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
