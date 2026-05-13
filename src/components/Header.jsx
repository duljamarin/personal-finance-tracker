import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

function BrandMark() {
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 bg-brand-600 rounded-md shadow-sm shadow-brand-500/25">
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17 L10 11 L14 14 L20 6" />
        <path d="M15 6 L20 6 L20 11" />
      </svg>
    </span>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const navLink = 'px-3 py-2 text-sm font-medium text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary transition-colors';

  return (
    <header className="bg-white dark:bg-surface-dark-card border-b border-surface-hairline dark:border-surface-dark-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <BrandMark />
          <span className="hidden sm:block text-base font-semibold text-ink-primary dark:text-white tracking-tight">
            {t('app.name')}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div className="flex items-center gap-1 mr-3 pr-3 border-r border-surface-hairline dark:border-surface-dark-hairline">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {!accessToken && (
            <>
              {location.pathname !== '/pricing' && (
                <Link to="/pricing" className={navLink}>{t('nav.pricing')}</Link>
              )}
              {location.pathname !== '/login' && (
                <Link to="/login" className={navLink}>{t('auth.login')}</Link>
              )}
              {location.pathname !== '/register' && (
                <Link
                  to="/register"
                  className="ml-1 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-all shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30"
                >
                  {t('auth.register')}
                </Link>
              )}
            </>
          )}
          {accessToken && (
            <Link
              to="/dashboard"
              className="ml-1 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-all shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30"
            >
              {t('nav.dashboard')}
            </Link>
          )}
        </nav>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(m => !m)}
            className="p-2 rounded-md hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors text-ink-muted dark:text-white"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card animate-in">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {!accessToken ? (
              <>
                <Link
                  to="/pricing"
                  className="px-3 py-2.5 text-sm font-medium text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 rounded-md transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.pricing')}
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2.5 text-sm font-medium text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 rounded-md transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to="/register"
                  className="mx-1 mt-1 px-3 py-2.5 text-sm font-medium text-center text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors shadow-sm shadow-brand-500/20"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('auth.register')}
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="mx-1 mt-1 px-3 py-2.5 text-sm font-medium text-center text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors shadow-sm shadow-brand-500/20"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.dashboard')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
