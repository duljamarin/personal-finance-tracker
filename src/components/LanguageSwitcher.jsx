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

function LanguageSwitcher() {
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
    <div className="inline-flex items-center gap-0.5 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-0.5">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => changeLanguage(code)}
          aria-current={current === code ? 'true' : undefined}
          className={`px-2 py-1 rounded-[5px] font-medium transition-colors ${
            current === code
              ? 'bg-brand-600 text-white'
              : 'text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
