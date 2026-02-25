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
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);
  const { accessToken, user, logout } = useAuth();
  const { isPremium, subscription } = useSubscription();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Show PRO badge for premium users (active or trialing)
  // Only show upgrade button for non-premium users who are logged in
  const showProBadge = isPremium && subscription?.subscription_status !== 'none';
  const showUpgrade = accessToken && !showProBadge;

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

  return (
    <header className="mb-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('app.name')}</h1>
            {accessToken && user?.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            )}
          </div>
        </Link>
        
        <nav className="hidden md:flex gap-2 items-center">
          {accessToken && (
            <>
              <Link to="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('nav.dashboard')}
              </Link>
               <Link to="/goals" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('goals.title')}
              </Link>
              <Link to="/budgets" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('budgets.title')}
              </Link>
              <Link to="/networth" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('networth.title')}
              </Link>
               <Link to="/recurring" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('nav.recurring')}
              </Link>
              <Link to="/categories" className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                {t('nav.categories')}
              </Link>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              {showUpgrade && (
                <Link to="/pricing" className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg transition-all shadow-md">
                  {t('upgrade.upgradeCta')}
                </Link>
              )}
              {showProBadge && (
                <Link to="/pricing" className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-sm hover:from-indigo-600 hover:to-purple-700 transition-all hover:shadow-md">
                  {t('subscription.proBadge')}
                </Link>
              )}
            </>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          {accessToken && (
            <Link to="/notifications" className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {accessToken ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                aria-label={t('nav.myProfile')}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-2 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {user?.user_metadata?.username || user?.email}
                    </p>
                    {user?.user_metadata?.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                    )}
                  </div>
                  {/* My Profile */}
                  <Link
                    to="/account"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('nav.myProfile')}
                  </Link>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  {/* Logout */}
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {window.location.pathname !== '/pricing' && (
                <Link to="/pricing" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">{t('nav.pricing')}</Link>
              )}
              {window.location.pathname !== '/login' && (
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">{t('auth.login')}</Link>
              )}
              {window.location.pathname !== '/register' && (
                <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">{t('auth.register')}</Link>
              )}
            </>
          )}
        </nav>
        
        {/* Hamburger for mobile */}
        <div className="md:hidden flex items-center gap-2 relative">
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={() => setMenuOpen(m => !m)} className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50">
              <div className="flex flex-col py-2">
                {accessToken && (
                  <>
                    <Link to="/dashboard" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      {t('nav.dashboard')}
                    </Link>
                      <Link to="/goals" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      {t('goals.title')}
                    </Link>
                    <Link to="/budgets" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      {t('budgets.title')}
                    </Link>
                    <Link to="/networth" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                      {t('networth.title')}
                    </Link> 
                     <Link to="/recurring" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      {t('nav.recurring')}
                    </Link>                 
                    <Link to="/categories" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {t('nav.categories')}
                    </Link>
                    <Link to="/notifications" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      {t('notifications.title')}
                    </Link>
                    <Link to="/account" className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {t('nav.myProfile')}
                    </Link>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    {showUpgrade && (
                      <Link to="/pricing" className="px-4 py-2 text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-3 font-bold rounded-lg mx-2" onClick={() => setMenuOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        {t('upgrade.upgradeCta')}
                      </Link>
                    )}
                    {showProBadge && (
                      <Link to="/pricing" className="px-4 py-2 flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                        <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all">
                          {t('subscription.proBadge')}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('pricing.managePlan')}</span>
                      </Link>
                    )}
                  </>
                )}
                {accessToken ? (
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {t('nav.logout')}
                  </button>
                ) : (
                  <>
                    <Link to="/pricing" className="px-4 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t('nav.pricing')}
                    </Link>
                    <Link to="/login" className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1m0-4V7a3 3 0 013-3h4a3 3 0 013 3v4" /></svg>
                      {t('auth.login')}
                    </Link>
                    <Link to="/register" className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                      {t('auth.register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}