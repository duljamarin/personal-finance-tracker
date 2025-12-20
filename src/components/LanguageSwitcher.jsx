import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher" style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        onClick={() => changeLanguage('sq')}
        className={`lang-btn ${i18n.language === 'sq' ? 'active' : ''}`}
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '0.25rem',
          border: i18n.language === 'sq' ? '2px solid #3b82f6' : '1px solid #d1d5db',
          background: i18n.language === 'sq' ? '#3b82f6' : 'transparent',
          color: i18n.language === 'sq' ? 'white' : 'inherit',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}
      >
        SQ
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '0.25rem',
          border: i18n.language === 'en' ? '2px solid #3b82f6' : '1px solid #d1d5db',
          background: i18n.language === 'en' ? '#3b82f6' : 'transparent',
          color: i18n.language === 'en' ? 'white' : 'inherit',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;
