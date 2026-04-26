import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="inline-flex items-center gap-0.5 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card p-0.5">
      <button
        onClick={() => changeLanguage('sq')}
        className={`px-2 py-1 rounded-[5px] font-medium transition-colors ${
          i18n.language === 'sq'
            ? 'bg-brand-600 text-white'
            : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink-primary dark:hover:text-ink-dark-primary'
        }`}
      >
        SQ
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-[5px] font-medium transition-colors ${
          i18n.language === 'en'
            ? 'bg-brand-600 text-white'
            : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink-primary dark:hover:text-ink-dark-primary'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
