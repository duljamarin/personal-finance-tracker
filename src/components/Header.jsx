import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="hidden sm:block text-sm font-bold text-gray-900 dark:text-white tracking-tight">{t('app.name')}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div className="flex items-center gap-1 mr-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {!accessToken && (
            <>
              {location.pathname !== '/pricing' && (
                <Link to="/pricing" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t('nav.pricing')}</Link>
              )}
              {location.pathname !== '/login' && (
                <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t('auth.login')}</Link>
              )}
              {location.pathname !== '/register' && (
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">{t('auth.register')}</Link>
              )}
            </>
          )}
          {accessToken && (
            <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">{t('nav.dashboard')}</Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={() => setMenuOpen(m => !m)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-gray-600 dark:text-gray-300">
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-surface-dark animate-in">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
            {!accessToken ? (
              <>
                <Link to="/pricing" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition" onClick={() => setMenuOpen(false)}>
                  {t('nav.pricing')}
                </Link>
                <Link to="/login" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition" onClick={() => setMenuOpen(false)}>
                  {t('auth.login')}
                </Link>
                <Link to="/register" className="mx-1 mt-1 px-3 py-2 text-sm font-medium text-center text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition" onClick={() => setMenuOpen(false)}>
                  {t('auth.register')}
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="px-3 py-2.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition" onClick={() => setMenuOpen(false)}>
                {t('nav.dashboard')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
