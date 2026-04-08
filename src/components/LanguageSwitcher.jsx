import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-0.5 text-sm">
      <button
        onClick={() => changeLanguage('sq')}
        className={`px-2 py-1 rounded-md font-medium transition-colors ${
          i18n.language === 'sq'
            ? 'text-brand-700 dark:text-brand-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        SQ
      </button>
      <span className="text-gray-300 dark:text-gray-600 text-xs">/</span>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 rounded-md font-medium transition-colors ${
          i18n.language === 'en'
            ? 'text-brand-700 dark:text-brand-400'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
