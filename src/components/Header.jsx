import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import ToolsNav from './ToolsNav.jsx';
import { localizedPath } from '../lib/tools';

function BrandMark() {
  return (
    <span className="inline-flex items-center justify-center w-[38px] h-[38px] bg-brand-600 rounded-input" aria-hidden="true">
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
  const { t, i18n } = useTranslation();
  const location = useLocation();

  // Bento header (design-system 4.6): pill hover backgrounds, Register as the primary button.
  const navLink = 'inline-flex items-center min-h-11 px-3.5 rounded-pill text-base font-semibold text-fg btn-motion hover:bg-inner';
  const primaryLink = 'btn-motion btn-lift ml-2 inline-flex items-center min-h-11 px-[22px] rounded-pill text-base font-bold text-white bg-brand-600 hover:bg-brand-700';
  const mobileLink = 'flex items-center min-h-11 px-3.5 rounded-pill text-base font-bold text-fg btn-motion hover:bg-inner';
  const mobilePrimary = 'mt-1 flex items-center justify-center min-h-11 px-4 rounded-pill text-base font-bold text-white bg-brand-600 hover:bg-brand-700 btn-motion';

  return (
    <header>
      <div className="max-w-content mx-auto px-gap sm:px-6 lg:px-10 py-[18px] flex items-center justify-between gap-gap">
        <Link to="/" className="flex items-center gap-3 group" aria-label={t('app.name')}>
          <BrandMark />
          <span className="hidden sm:block text-lg font-extrabold tracking-[-0.01em] text-fg">
            {t('app.name')}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-line">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <ToolsNav className={navLink} />
          {!accessToken && (
            <>
              {location.pathname !== '/pricing' && location.pathname !== '/sq/pricing' && (
                <Link to={localizedPath('/pricing', i18n.language)} className={navLink}>{t('nav.pricing')}</Link>
              )}
              {location.pathname !== '/login' && location.pathname !== '/sq/login' && (
                <Link to={localizedPath('/login', i18n.language)} className={navLink}>{t('auth.login')}</Link>
              )}
              {location.pathname !== '/register' && location.pathname !== '/sq/register' && (
                <Link
                  to={localizedPath('/register', i18n.language)}
                  className={primaryLink}
                >
                  {t('auth.register')}
                </Link>
              )}
            </>
          )}
          {accessToken && (
            <Link
              to="/dashboard"
              className={primaryLink}
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
            type="button"
            onClick={() => setMenuOpen(m => !m)}
            className="btn-motion w-11 h-11 inline-flex items-center justify-center rounded-pill text-fg hover:bg-inner"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-gap pb-gap animate-rise">
          <div className="tile rounded-shell p-3 flex flex-col gap-1">
            <ToolsNav
              variant="inline"
              className={mobileLink}
              onNavigate={() => setMenuOpen(false)}
            />
            {!accessToken ? (
              <>
                <Link
                  to={localizedPath('/pricing', i18n.language)}
                  className={mobileLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('nav.pricing')}
                </Link>
                <Link
                  to={localizedPath('/login', i18n.language)}
                  className={mobileLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('auth.login')}
                </Link>
                <Link
                  to={localizedPath('/register', i18n.language)}
                  className={mobilePrimary}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('auth.register')}
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className={mobilePrimary}
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
