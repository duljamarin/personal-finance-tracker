import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-surface-dark-tertiary rounded-lg p-1 border border-gray-200 dark:border-zinc-800">
      <button
        onClick={() => changeLanguage('sq')}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
          i18n.language === 'sq'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
        }`}
      >
        SQ
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
          i18n.language === 'en'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
