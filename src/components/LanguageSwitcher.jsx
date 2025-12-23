import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => changeLanguage('sq')}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
          i18n.language === 'sq'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        SQ
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
          i18n.language === 'en'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
