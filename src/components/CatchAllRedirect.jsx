import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CatchAllRedirect() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Check if path starts with language code
    const path = location.pathname;
    if (path === '/en' || path.startsWith('/en/')) {
      i18n.changeLanguage('en');
    } else if (path === '/sq' || path.startsWith('/sq/')) {
      i18n.changeLanguage('sq');
    }
  }, [location.pathname, i18n]);

  return <Navigate to="/" replace />;
}
