import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { getUnreadNotificationCount } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  LayoutDashboard, PieChart, Target, TrendingUp, Repeat,
  Tag, FileText, Bell, Rocket, User, CreditCard,
  LogOut, ChevronsLeft, Menu as MenuIcon,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard',  path: '/dashboard',    labelKey: 'nav.dashboard',   Icon: LayoutDashboard },
  { key: 'budgets',    path: '/budgets',       labelKey: 'budgets.title',   Icon: PieChart        },
  { key: 'goals',      path: '/goals',         labelKey: 'goals.title',     Icon: Target          },
  { key: 'networth',   path: '/networth',      labelKey: 'networth.title',  Icon: TrendingUp      },
  { key: 'recurring',  path: '/recurring',     labelKey: 'nav.recurring',   Icon: Repeat          },
  { key: 'categories', path: '/categories',    labelKey: 'nav.categories',  Icon: Tag             },
  { key: 'reports',    path: '/reports',       labelKey: 'reports.title',   Icon: FileText        },
];

function BrandMark({ compact = false }) {
  return (
    <span className={`inline-flex items-center justify-center ${compact ? 'w-9 h-9' : 'w-10 h-10'} bg-brand-600 rounded-md shadow-sm shadow-brand-500/25 flex-shrink-0`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17 L10 11 L14 14 L20 6" />
        <path d="M15 6 L20 6 L20 11" />
      </svg>
    </span>
  );
}

function NavItem({ item, isActive, collapsed, onClick }) {
  const { t } = useTranslation();
  const { Icon: NavIcon } = item;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group ${
        isActive
          ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
          : 'text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/5'
      } ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? t(item.labelKey) : undefined}
    >
      {isActive && !collapsed && (
        <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-brand-500 rounded-r-full" />
      )}
      <NavIcon
        className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-muted/80 dark:text-white/80 group-hover:text-ink-primary dark:group-hover:text-ink-dark-primary'}`}
        strokeWidth={1.75}
      />
      {!collapsed && <span>{t(item.labelKey)}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isPremium, subscription } = useSubscription();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);

  const isTrialing = subscription?.subscription_status === 'trialing';
  const showProBadge = isPremium && !isTrialing && subscription?.subscription_status !== 'none';
  const showUpgrade = !isPremium || isTrialing;

  useEffect(() => {
    if (!user) return;

    getUnreadNotificationCount()
      .then(count => setUnreadCount(count || 0))
      .catch(() => {});

    const handleNotifChanged = () => {
      getUnreadNotificationCount()
        .then(count => setUnreadCount(count || 0))
        .catch(() => {});
    };
    window.addEventListener('notifications:changed', handleNotifChanged);

    const channel = supabase
      .channel('sidebar-notifications-' + user.id)
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

    return () => {
      window.removeEventListener('notifications:changed', handleNotifChanged);
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const notifActive = location.pathname === '/notifications';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 h-16 shrink-0 border-b border-surface-hairline dark:border-surface-dark-hairline`}>
        <BrandMark compact />
        {!collapsed && (
          <span className="text-base font-semibold text-ink-primary dark:text-white tracking-tight truncate">
            {t('app.shortName')}
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="eyebrow px-3 mb-3 text-[10px]">Menu</p>
        )}
        {navItems.map(item => (
          <NavItem
            key={item.key}
            item={item}
            isActive={location.pathname === item.path}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}

        {/* Notifications */}
        <Link
          to="/notifications"
          onClick={() => setMobileOpen(false)}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group ${
            notifActive
              ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
              : 'text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/5'
          } ${collapsed ? 'justify-center' : ''}`}
        >
          {notifActive && !collapsed && (
            <span aria-hidden="true" className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-brand-500 rounded-r-full" />
          )}
          <span className="relative">
            <Bell
              className={`w-5 h-5 ${notifActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-muted/80 dark:text-white/80 group-hover:text-ink-primary dark:group-hover:text-ink-dark-primary'}`}
              strokeWidth={1.75}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && <span>{t('notifications.title')}</span>}
        </Link>
      </nav>

      {/* Upgrade / Manage Subscription CTA */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {showUpgrade ? (
            <Link
              to="/pricing"
              className="block w-full rounded-xl border border-brand-200/60 dark:border-brand-800/40 bg-brand-50 dark:bg-brand-950/30 p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Rocket className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">Pro plan</span>
              </div>
              <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mb-2.5 leading-relaxed">
                {t('upgrade.unlockAll', { defaultValue: 'Unlock all features' })}
              </p>
              <span className="flex items-center justify-center w-full px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors">
                {t('upgrade.goPremium')}
              </span>
            </Link>
          ) : (
            <Link
              to="/pricing"
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/30 hover:bg-brand-100 dark:hover:bg-brand-950/50 rounded-md transition-colors border border-brand-200/60 dark:border-brand-800/30"
            >
              <CreditCard className="w-4 h-4" strokeWidth={1.75} />
              {t('pricing.managePlan')}
            </Link>
          )}
        </div>
      )}

      {/* Bottom section */}
      <div className="border-t border-surface-hairline dark:border-surface-dark-hairline px-3 py-3 shrink-0 space-y-2">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-1`}>
          {!collapsed && <LanguageSwitcher />}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden lg:flex p-2 rounded-md text-ink-muted/70 dark:text-white/70 hover:text-ink-primary dark:hover:text-ink-dark-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronsLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(p => !p)}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-sm shadow-brand-500/20">
              {(user?.user_metadata?.username || user?.email || '?')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-ink-primary dark:text-white truncate">
                  {user?.user_metadata?.username || user?.email}
                </p>
                {showProBadge && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 rounded">PRO</span>
                )}
              </div>
            )}
          </button>

          {profileOpen && (
            <div className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0 right-0'} bottom-full mb-2 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-xl shadow-lg z-50 py-1.5 animate-scale-in min-w-[200px]`}>
              <Link
                to="/account"
                onClick={() => { setProfileOpen(false); setMobileOpen(false); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
              >
                <User className="h-4 w-4 text-ink-muted dark:text-white" strokeWidth={1.75} />
                {t('nav.myProfile')}
              </Link>
              <Link
                to="/pricing"
                onClick={() => { setProfileOpen(false); setMobileOpen(false); }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-ink-muted dark:text-white" strokeWidth={1.75} />
                {t('nav.subscription')}
              </Link>
              <div className="border-t border-surface-hairline dark:border-surface-dark-hairline my-1" />
              <button
                onClick={() => { setProfileOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 bg-white dark:bg-surface-dark-card border-r border-surface-hairline dark:border-surface-dark-hairline transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        {sidebarContent}
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-md bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline shadow-sm text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
        aria-label="Open menu"
      >
        <MenuIcon className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-surface-dark-card border-r border-surface-hairline dark:border-surface-dark-hairline animate-slide-in-left">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-md text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
            >
              <ChevronsLeft className="w-5 h-5" strokeWidth={1.75} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
