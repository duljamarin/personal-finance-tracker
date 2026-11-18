import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { getUnreadNotificationCount } from '../utils/api';
import CurrencyFlag from './UI/CurrencyFlag.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  LayoutDashboard, PieChart, Target, TrendingUp, Repeat,
  Tag, FileText, Bell, Rocket, User, CreditCard, ArrowLeftRight,
  LogOut, ChevronsLeft, Menu as MenuIcon, X,
} from 'lucide-react';

// Grouped the way people think about their money: the day-to-day ledger
// first, longer-horizon planning second.
const navGroups = [
  {
    key: 'money',
    labelKey: 'nav.groupMoney',
    items: [
      { key: 'dashboard',    path: '/dashboard',    labelKey: 'nav.dashboard',    Icon: LayoutDashboard },
      { key: 'transactions', path: '/transactions', labelKey: 'nav.transactions', Icon: ArrowLeftRight  },
      { key: 'budgets',      path: '/budgets',      labelKey: 'budgets.title',    Icon: PieChart        },
      { key: 'recurring',    path: '/recurring',    labelKey: 'nav.recurring',    Icon: Repeat          },
      { key: 'categories',   path: '/categories',   labelKey: 'nav.categories',   Icon: Tag             },
    ],
  },
  {
    key: 'planning',
    labelKey: 'nav.groupPlanning',
    items: [
      { key: 'goals',    path: '/goals',    labelKey: 'goals.title',    Icon: Target     },
      { key: 'networth', path: '/networth', labelKey: 'networth.title', Icon: TrendingUp },
      { key: 'reports',  path: '/reports',  labelKey: 'reports.title',  Icon: FileText   },
    ],
  },
];

function BrandMark() {
  return (
    <span className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-icon shrink-0" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17 L10 11 L14 14 L20 6" />
        <path d="M15 6 L20 6 L20 11" />
      </svg>
    </span>
  );
}

function UnreadBadge({ count, className = '' }) {
  if (!count) return null;
  return (
    <span className={`flex h-[22px] min-w-[22px] px-1.5 items-center justify-center rounded-pill bg-brand-600 text-white text-min font-extrabold tabular-nums ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Label visibility by layout (design-system §3.5):
 *   mobile drawer      always labelled
 *   desktop ≥1280      icon + label (unless the user collapsed the panel)
 *   desktop 1024-1279  icon-only rail, label as tooltip + aria-label
 */
function labelClasses(mobile, collapsed) {
  if (mobile) return { label: '', tip: 'hidden', rail: false };
  if (collapsed) return { label: 'hidden', tip: 'hidden lg:block', rail: true };
  return { label: 'hidden xl:inline', tip: 'hidden lg:block xl:hidden', rail: false };
}

function Tooltip({ text, className }) {
  return (
    <span
      role="presentation"
      className={`${className} pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3 py-1.5 rounded-pill text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 btn-motion`}
      style={{ backgroundColor: 'var(--toast-bg)', color: 'var(--toast-fg)' }}
    >
      {text}
    </span>
  );
}

function NavItem({ to, label, Icon, isActive, cls, onClick, badge }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`nav-item group relative flex items-center gap-1 h-12 rounded-icon text-base font-bold text-fg btn-motion ${
        isActive ? 'bg-inner-2' : 'hover:bg-inner'
      }`}
    >
      <span className={`nav-icon relative w-12 h-12 shrink-0 rounded-icon flex items-center justify-center ${isActive ? 'text-brand-text' : ''}`}>
        <Icon className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden="true" />
        {badge}
      </span>
      <span className={`${cls.label} truncate pr-3`}>{label}</span>
      <Tooltip text={label} className={cls.tip} />
    </Link>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isPremium, isTrialing, subscription } = useSubscription();
  const { currency: currencyCode } = useDisplayCurrency();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef(null);

  // Use the isTrialing boolean from context, not the status string - the string
  // can lag behind the actual trial state, the boolean is computed from trial_end.
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

    return () => {
      window.removeEventListener('notifications:changed', handleNotifChanged);
    };
  }, [user?.id]);

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
  const initial = (user?.user_metadata?.username || user?.email || '?')[0].toUpperCase();

  const renderContent = (mobile) => {
    const cls = labelClasses(mobile, collapsed);
    // Rail-only pieces (1024-1279, or collapsed): compact language toggle,
    // icon link to pricing. Full pieces show where labels show.
    const fullOnly = mobile ? '' : collapsed ? 'hidden' : 'hidden xl:flex';
    const railOnly = mobile ? 'hidden' : collapsed ? 'flex' : 'flex xl:hidden';
    const closeMobile = () => setMobileOpen(false);

    return (
      <div className="flex flex-col gap-2">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2 min-w-0">
          <BrandMark />
          <span className={`${cls.label} text-lg font-extrabold tracking-[-0.01em] text-fg truncate`}>
            {t('app.shortName')}
          </span>
        </div>

        {/* Main nav */}
        <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
          {navGroups.map((group, gi) => (
            <div key={group.key} className={`flex flex-col gap-1 ${gi > 0 ? 'mt-3' : ''}`}>
              {gi > 0 && <div className={`${mobile ? 'hidden' : collapsed ? 'block' : 'block xl:hidden'} mx-2 mb-2 border-t border-line`} />}
              <p className={`${mobile ? 'block' : collapsed ? 'hidden' : 'hidden xl:block'} px-3 pb-1 text-sm font-bold text-fg`}>
                {t(group.labelKey)}
              </p>
              {group.items.map(item => (
                <NavItem
                  key={item.key}
                  to={item.path}
                  label={t(item.labelKey)}
                  Icon={item.Icon}
                  isActive={location.pathname === item.path}
                  cls={cls}
                  onClick={closeMobile}
                />
              ))}
            </div>
          ))}

          <div className="mt-3 flex flex-col gap-1">
            <NavItem
              to="/notifications"
              label={t('notifications.title')}
              Icon={Bell}
              isActive={notifActive}
              cls={cls}
              onClick={closeMobile}
              badge={<UnreadBadge count={unreadCount} className="absolute -top-0.5 -right-0.5" />}
            />
          </div>
        </nav>

        {/* Upgrade / Manage Subscription CTA (full), icon link (rail) */}
        <div className={`${fullOnly} flex-col mt-2`}>
          {showUpgrade ? (
            <Link to="/pricing" onClick={closeMobile} className="tile-inner p-gap flex flex-col gap-2 btn-motion hover:bg-inner-2">
              <span className="flex items-center gap-2">
                <Rocket className="w-[18px] h-[18px] text-brand-text" strokeWidth={2} aria-hidden="true" />
                <span className="text-sm font-extrabold text-fg">{t('upgrade.proPlan')}</span>
              </span>
              <span className="text-sm font-semibold text-fg">{t('upgrade.unlockAll')}</span>
              <span className="mt-1 flex items-center justify-center min-h-11 px-4 rounded-pill bg-brand-600 text-white text-sm font-bold">
                {t('upgrade.goPremium')}
              </span>
            </Link>
          ) : (
            <Link
              to="/pricing"
              onClick={closeMobile}
              className="flex items-center justify-center gap-2 min-h-11 px-4 rounded-pill border-2 border-line text-sm font-bold text-fg btn-motion hover:bg-inner"
            >
              <CreditCard className="w-[18px] h-[18px] text-brand-text" strokeWidth={2} aria-hidden="true" />
              {t('pricing.managePlan')}
            </Link>
          )}
        </div>
        <div className={`${railOnly} flex-col mt-2`}>
          <NavItem
            to="/pricing"
            label={showUpgrade ? t('upgrade.goPremium') : t('pricing.managePlan')}
            Icon={showUpgrade ? Rocket : CreditCard}
            isActive={false}
            cls={cls}
            onClick={closeMobile}
          />
        </div>

        {/* Preferences */}
        <div className="mt-2 pt-3 border-t border-line flex flex-col gap-2">
          <div className={`${fullOnly} items-center justify-between gap-1`}>
            <LanguageSwitcher />
            <div className="flex items-center">
              <ThemeToggle />
              {!mobile && (
                <button
                  type="button"
                  onClick={() => setCollapsed(c => !c)}
                  className="btn-motion w-11 h-11 inline-flex items-center justify-center rounded-pill text-fg hover:bg-inner"
                  aria-label={t('nav.collapseSidebar')}
                >
                  <ChevronsLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className={`${railOnly} flex-col items-center gap-1`}>
            <LanguageSwitcher vertical />
            <ThemeToggle />
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="hidden xl:inline-flex btn-motion w-11 h-11 items-center justify-center rounded-pill text-fg hover:bg-inner"
                aria-label={t('nav.expandSidebar')}
              >
                <ChevronsLeft className="w-5 h-5 rotate-180" strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(p => !p)}
            aria-expanded={profileOpen}
            aria-label={user?.user_metadata?.username || user?.email || t('nav.myProfile')}
            // Rail hides the currency chip, so keep it reachable on hover.
            title={cls.label ? currencyCode : undefined}
            className="w-full flex items-center gap-3 p-1 rounded-icon btn-motion hover:bg-inner"
          >
            <span className="w-10 h-10 rounded-pill bg-brand-600 flex items-center justify-center text-white text-base font-extrabold shrink-0" aria-hidden="true">
              {initial}
            </span>
            <span className={`${cls.label ? cls.label.replace('inline', 'block') : 'block'} flex-1 min-w-0 text-left`}>
              <span className="block text-sm font-bold text-fg truncate">
                {user?.user_metadata?.username || user?.email}
              </span>
              <span className="flex items-center gap-1.5 mt-1">
                {showProBadge && (
                  <span className="inline-flex items-center h-[22px] px-2 rounded-pill bg-brand-600 text-white text-min font-extrabold">PRO</span>
                )}
                {/* The app is single-currency; surfacing it here saves opening
                    Account just to check which currency the numbers are in.
                    Neutral fill: reference data, not a status that must pop. */}
                <span className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-pill bg-inner text-fg">
                  <CurrencyFlag code={currencyCode} />
                  <span className="text-min font-bold">{currencyCode}</span>
                </span>
              </span>
            </span>
          </button>

          {profileOpen && (
            <div className={`absolute ${mobile ? 'left-0 right-0 bottom-full mb-2' : collapsed ? 'left-full ml-2 bottom-0' : 'left-full ml-2 bottom-0 xl:left-0 xl:right-0 xl:ml-0 xl:bottom-full xl:mb-2'} bg-tile border border-line rounded-inner shadow-sheet z-50 p-1.5 animate-sheet-in min-w-[220px]`}>
              <Link
                to="/account"
                onClick={() => { setProfileOpen(false); setMobileOpen(false); }}
                className="flex items-center gap-2.5 min-h-11 px-3 rounded-input text-sm font-bold text-fg btn-motion hover:bg-inner"
              >
                <User className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                {t('nav.myProfile')}
              </Link>
              <Link
                to="/pricing"
                onClick={() => { setProfileOpen(false); setMobileOpen(false); }}
                className="flex items-center gap-2.5 min-h-11 px-3 rounded-input text-sm font-bold text-fg btn-motion hover:bg-inner"
              >
                <CreditCard className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                {t('nav.subscription')}
              </Link>
              <div className="border-t border-line my-1" />
              <button
                type="button"
                onClick={() => { setProfileOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 min-h-11 px-3 rounded-input text-sm font-bold text-danger btn-motion hover:bg-inner text-left"
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop: floating tile panel, top-aligned, not sticky (§3.5).
          232px with labels (≥1280), 72px icon rail (1024-1279 or collapsed). */}
      <aside className={`hidden lg:block shrink-0 self-start tile rounded-shell p-3 w-[72px] ${collapsed ? '' : 'xl:w-[232px]'}`}>
        {renderContent(false)}
      </aside>

      {/* Mobile top bar (<1024). Fixed height h-16; AuthenticatedLayout pads for it. */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 flex items-center gap-2 px-3 bg-page border-b border-line">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn-motion w-11 h-11 inline-flex items-center justify-center rounded-pill text-fg hover:bg-inner"
          aria-label={t('nav.openMenu')}
          aria-expanded={mobileOpen}
        >
          <MenuIcon className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden="true" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 bg-brand-600 rounded-input shrink-0" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 L10 11 L14 14 L20 6" />
              <path d="M15 6 L20 6 L20 11" />
            </svg>
          </span>
          <span className="text-base font-extrabold text-fg truncate">
            {t('app.shortName')}
          </span>
        </Link>
        <Link
          to="/notifications"
          className="btn-motion relative ml-auto w-11 h-11 inline-flex items-center justify-center rounded-pill text-fg hover:bg-inner"
          aria-label={t('notifications.title')}
        >
          <Bell className="w-[22px] h-[22px]" strokeWidth={2} aria-hidden="true" />
          <UnreadBadge count={unreadCount} className="absolute -top-0.5 -right-0.5" />
        </Link>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-gap top-gap bottom-gap w-[min(288px,calc(100vw-32px))] overflow-y-auto tile rounded-shell p-3 animate-sheet-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn-motion absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-pill text-fg hover:bg-inner"
              aria-label={t('nav.closeMenu')}
            >
              <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
            </button>
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
