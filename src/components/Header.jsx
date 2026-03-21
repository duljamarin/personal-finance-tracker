import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { getUnreadNotificationCount } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const moreRef = useRef(null);
  const { accessToken, user, logout } = useAuth();
  const { isPremium, subscription } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Trialing users see upgrade button (not PRO badge) so they can convert to paid
  const isTrialing = subscription?.subscription_status === 'trialing';
  const showProBadge = isPremium && !isTrialing && subscription?.subscription_status !== 'none';
  const showUpgrade = accessToken && (!isPremium || isTrialing);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fetch unread notification count + realtime subscription for instant badge updates
  useEffect(() => {
    if (!accessToken || !user) return;

    // Initial fetch
    getUnreadNotificationCount()
      .then(count => setUnreadCount(count || 0))
      .catch(() => {});

    // Listen for immediate updates from NotificationsPage (mark read / mark all read)
    const handleNotifChanged = () => {
      getUnreadNotificationCount()
        .then(count => setUnreadCount(count || 0))
        .catch(() => {});
    };
    window.addEventListener('notifications:changed', handleNotifChanged);

    // Realtime: re-fetch count on any INSERT or UPDATE in notifications table
    const channel = supabase
      .channel('header-notifications-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        getUnreadNotificationCount()
          .then(count => setUnreadCount(count || 0))
          .catch(() => {});
      })
      .subscribe();

    // Fallback poll every 30s (catches reads made in another tab)
    const interval = setInterval(() => {
      getUnreadNotificationCount()
        .then(count => setUnreadCount(count || 0))
        .catch(() => {});
    }, 30000);

    return () => {
      window.removeEventListener('notifications:changed', handleNotifChanged);
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [accessToken, user]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // Close More dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

  return (
    <header className="mb-0 bg-white dark:bg-surface-dark border-b border-gray-200/80 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="hidden sm:block text-base font-bold font-display text-gray-900 dark:text-white tracking-tight">{t('app.name')}</span>
        </Link>
        
        <nav className="hidden md:flex gap-1 items-center">
          {accessToken && (
            <>
              <Link to="/dashboard" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('nav.dashboard')}
              </Link>
              <Link to="/goals" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('goals.title')}
              </Link>
              <Link to="/budgets" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {t('budgets.title')}
              </Link>
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen(m => !m)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  {t('nav.more')}
                  <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {moreOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-surface-dark-elevated border border-gray-200/80 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1 animate-scale-in">
                    <Link to="/networth" onClick={() => setMoreOpen(false)} className="block px-3.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors">
                      {t('networth.title')}
                    </Link>
                    <Link to="/recurring" onClick={() => setMoreOpen(false)} className="block px-3.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors">
                      {t('nav.recurring')}
                    </Link>
                    <Link to="/categories" onClick={() => setMoreOpen(false)} className="block px-3.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors">
                      {t('nav.categories')}
                    </Link>
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700 mx-2"></div>
              {showUpgrade && (
                <Link to="/pricing" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 rounded-lg transition-colors shadow-sm">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                  {t('upgrade.goPremium')}
                </Link>
              )}
              {showProBadge && (
                <span className="px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 rounded-md">
                  PRO
                </span>
              )}
            </>
          )}
          <div className="flex items-center gap-1 ml-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          {accessToken && (
            <Link to="/notifications" className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {accessToken ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-brand-400/30 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all"
                aria-label={t('nav.myProfile')}
              >
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(user?.user_metadata?.username || user?.email || '?')[0].toUpperCase()}
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-surface-dark-elevated border border-gray-200/80 dark:border-zinc-700 rounded-lg shadow-lg z-50 py-1 animate-scale-in">
                  <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-700">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {user?.user_metadata?.username || user?.email}
                    </p>
                    {user?.user_metadata?.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                    )}
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('nav.myProfile')}
                  </Link>
                  <div className="border-t border-gray-100 dark:border-zinc-700 my-0.5"></div>
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {window.location.pathname !== '/pricing' && (
                <Link to="/pricing" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t('nav.pricing')}</Link>
              )}
              {window.location.pathname !== '/login' && (
                <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{t('auth.login')}</Link>
              )}
              {window.location.pathname !== '/register' && (
                <Link to="/register" className="px-3.5 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors">{t('auth.register')}</Link>
              )}
            </>
          )}
        </nav>
        
        {/* Hamburger for mobile */}
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

      {/* Mobile Menu — full-width slide-down */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-surface-dark animate-in">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
            {accessToken && (
              <>
                <Link to="/dashboard" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  {t('nav.dashboard')}
                </Link>
                <Link to="/goals" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  {t('goals.title')}
                </Link>
                <Link to="/budgets" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  {t('budgets.title')}
                </Link>
                <Link to="/networth" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  {t('networth.title')}
                </Link> 
                <Link to="/recurring" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  {t('nav.recurring')}
                </Link>                 
                <Link to="/categories" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  {t('nav.categories')}
                </Link>
                <Link to="/notifications" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {t('notifications.title')}
                </Link>
                <Link to="/account" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {t('nav.myProfile')}
                </Link>
                <div className="border-t border-gray-100 dark:border-zinc-800 my-1"></div>
                {showUpgrade && (
                  <Link to="/pricing" className="mx-1 px-3 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 rounded-lg transition flex items-center justify-center gap-2 shadow-sm" onClick={() => setMenuOpen(false)}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>
                    {t('upgrade.goPremium')}
                  </Link>
                )}
                {showProBadge && (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950 rounded-md">
                      PRO
                    </span>
                    <Link to="/pricing" onClick={() => setMenuOpen(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">{t('pricing.managePlan')}</Link>
                  </div>
                )}
              </>
            )}
            {accessToken ? (
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="px-3 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition text-left flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {t('nav.logout')}
              </button>
            ) : (
              <>
                <Link to="/pricing" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  {t('nav.pricing')}
                </Link>
                <Link to="/login" className="px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                  {t('auth.login')}
                </Link>
                <Link to="/register" className="mx-1 mt-1 px-3 py-2 text-sm font-medium text-center text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition" onClick={() => setMenuOpen(false)}>
                  {t('auth.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}