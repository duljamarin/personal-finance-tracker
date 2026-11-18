import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { trackPageview } from './lib/analytics';
import { useMetaTags } from './hooks/useMetaTags';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CatchAllRedirect from './components/CatchAllRedirect.jsx';
import { TOOLS, TOOLS_INDEX_PATH, toolPathVariants } from './lib/tools';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { CryptoProvider, useCrypto } from './context/CryptoContext';
import { TransactionProvider } from './context/TransactionContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import Skeleton from './components/UI/Skeleton.jsx';

const UnlockModal = lazy(() => import('./components/Encryption/UnlockModal.jsx'));
const MigrationBanner = lazy(() => import('./components/Encryption/MigrationBanner.jsx'));
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Shown while the Dashboard chunk is loading — LCP element (h1) is present immediately
function DashboardShell() {
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : '';
  return (
    <div className="min-h-[60vh]">
      <div className="flex items-center gap-[14px] px-1 py-1.5 mb-gap">
        <h1 className="text-h1 font-extrabold text-fg">
          {username || '\u00a0'}
        </h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gap">
        <Skeleton variant="card" className="lg:col-span-7 !h-[280px]" />
        <Skeleton variant="card" className="lg:col-span-5 !h-[280px]" />
      </div>
    </div>
  );
}

const Sidebar = lazy(() => import('./components/Sidebar.jsx'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard.jsx'));
const TransactionsPage = lazy(() => import('./components/Transactions/Transactions.jsx'));
const CategoriesPage = lazy(() => import('./components/Categories/CategoriesPage.jsx'));
const RecurringPage = lazy(() => import('./components/Recurring/RecurringPage.jsx'));
const GoalsPage = lazy(() => import('./components/Goals/GoalsPage.jsx'));
const BudgetsPage = lazy(() => import('./components/Budgets/BudgetsPage.jsx'));
const NetWorthPage = lazy(() => import('./components/NetWorth/NetWorthPage.jsx'));
const NotificationsPage = lazy(() => import('./components/Notifications/NotificationsPage.jsx'));
const LoginForm = lazy(() => import('./components/Auth/LoginForm.jsx'));
const RegisterForm = lazy(() => import('./components/Auth/RegisterForm.jsx'));
const AccountPage = lazy(() => import('./components/Auth/AccountPage.jsx'));
const EmailConfirmed = lazy(() => import('./components/Auth/EmailConfirmed.jsx'));
const ForgotPassword = lazy(() => import('./components/Auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword.jsx'));
const TermsOfService = lazy(() => import('./components/Legal/TermsOfService.jsx'));
const PrivacyPolicy = lazy(() => import('./components/Legal/PrivacyPolicy.jsx'));
const PricingPage = lazy(() => import('./components/Pricing/PricingPage.jsx'));
const ReportsPage = lazy(() => import('./components/Reports/ReportsPage.jsx'));
const LandingPage = lazy(() => import('./components/LandingPage.jsx'));
const SalaryCalculator = lazy(() => import('./components/Tools/SalaryCalculator.jsx'));
const FreelancerCalculator = lazy(() => import('./components/Tools/FreelancerCalculator.jsx'));
const LoanCalculator = lazy(() => import('./components/Tools/LoanCalculator.jsx'));
const ToolsIndex = lazy(() => import('./components/Tools/ToolsIndex.jsx'));
const OnboardingWizard = lazy(() => import('./components/Onboarding/OnboardingWizard'));

function PrivateRoute({ children }) {
  const { t, ready } = useTranslation();
  const { accessToken, user, loading } = useAuth();
  // `ready` guards against showing the raw key ("dashboard.loadingDashboard")
  // when i18n hasn't finished loading its bundle yet — main.jsx renders before
  // initPromise resolves (perf), so t() can return the key on first paint.
  if (loading) return (
    <LoadingSpinner size="md" text={ready ? t('dashboard.loadingDashboard') : ''} className="min-h-screen" />
  );
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!user?.user_metadata?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { t, ready } = useTranslation();
  const { accessToken, user, loading } = useAuth();
  if (loading) return (
    <LoadingSpinner size="md" text={ready ? t('dashboard.loadingDashboard') : ''} className="min-h-screen" />
  );
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user?.user_metadata?.onboarding_completed) return <Navigate to="/dashboard" replace />;
  return children;
}

function AuthGlobalUI({ showLoadingOverlay = true }) {
  const { error: authError, loading: authLoading, clearError } = useAuth();
  const { t, i18n, ready } = useTranslation();
  const dismissTimer = useRef(null);

  useMetaTags({
    title: t('meta.title'),
    description: t('meta.description'),
  });

  useEffect(() => {
    if (authError) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => clearError(), 5000);
    }
    return () => clearTimeout(dismissTimer.current);
  }, [authError, clearError]);

  const getErrorMessage = (error) => {
    if (!error) return '';
    const errorLower = error.toLowerCase();

    if (errorLower.includes('invalid') && errorLower.includes('credentials')) {
      return t('auth.invalidCredentials');
    }
    if (errorLower.includes('already registered')) {
      return t('auth.registrationError');
    }
    if (errorLower.includes('password') && errorLower.includes('character')) {
      return t('auth.weakPassword');
    }
    if (errorLower.includes('user not found')) {
      return t('auth.userNotFound');
    }
    if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
      return t('auth.tooManyRequests');
    }
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return t('auth.networkError');
    }
    if (errorLower.includes('check your email')) {
      return t('auth.registrationSuccess');
    }
    return t('auth.genericError');
  };

  return (
    <>
      {authError && (
        <div role="alert" className="fixed top-20 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-tile border-2 border-expense text-expense pl-5 pr-1.5 py-1.5 rounded-pill shadow-sheet text-sm font-bold animate-toast-in max-w-[calc(100vw-32px)] sm:max-w-md">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span className="flex-1 text-center">{getErrorMessage(authError)}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label={t('upgrade.dismiss')}
            className="btn-motion flex-shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-pill hover:bg-inner"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Only show the full-screen auth overlay on public routes (login/register
          submit). On authenticated routes, PrivateRoute/OnboardingRoute already
          render their own loading spinner — showing this too would double up. */}
      {showLoadingOverlay && authLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="tile rounded-shell p-tile shadow-sheet">
            <LoadingSpinner size="lg" text={ready ? t('dashboard.processing') : ''} />
          </div>
        </div>
      )}
    </>
  );
}

/* Authenticated app shell with sidebar */
const RecoveryCodeModal = lazy(() => import('./components/Encryption/RecoveryCodeModal.jsx'));

// Renders the E2EE unlock prompt (restored session, no cached key) and the
// background migration progress indicator. Mounted once for every
// authenticated screen.
function EncryptionGate() {
  const { status, isMigrating, refreshKeysRow } = useCrypto();
  const [newRecoveryCode, setNewRecoveryCode] = useState(null);

  return (
    <Suspense fallback={null}>
      {status === 'locked' && (
        <UnlockModal
          onUnlocked={() => {}}
          onSetupNewKey={(code) => {
            setNewRecoveryCode(code);
            refreshKeysRow();
          }}
        />
      )}
      {newRecoveryCode && (
        <RecoveryCodeModal
          recoveryCode={newRecoveryCode}
          onDone={() => setNewRecoveryCode(null)}
        />
      )}
      {isMigrating && <MigrationBanner />}
    </Suspense>
  );
}

export function AuthenticatedLayout({ children }) {
  return (
    // Bento shell (design-system 3.5): --page background, GAP padding, floating nav tile.
    <div className="flex min-h-screen bg-page font-sans lg:gap-gap lg:p-gap">
      <Suspense fallback={<div className="hidden lg:block shrink-0 w-[72px] xl:w-[232px]" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-content mx-auto px-gap pt-20 pb-24 lg:p-0">
          {children}
        </div>
      </main>
      <EncryptionGate />
    </div>
  );
}

/* Public layout without sidebar */
// Marketing routes sit on --tile (white in light) so their mint --inner blocks
// read, like the approved landing mockup; dark keeps the dark base.
const MARKETING_PATHS = new Set(['/', '/sq', '/pricing', '/sq/pricing']);

function PublicLayout({ children }) {
  const { pathname } = useLocation();
  const marketing = MARKETING_PATHS.has(pathname);
  return (
    <div className={`min-h-screen ${marketing ? 'bg-tile dark:bg-page' : 'bg-page'} font-sans`}>
      <Header />
      <div className="max-w-content mx-auto px-gap sm:px-6 lg:px-10 pb-6 flex flex-col">
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function InnerAppContent() {
  const location = useLocation();
  const { accessToken, user, loading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  const firstView = useRef(true);

  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    trackPageview(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const seg = location.pathname.split('/')[1];
    let urlLang = seg === 'sq' ? 'sq' : seg === 'en' ? 'en' : null;

    // `/sq` is the canonical Albanian prefix, so on a PUBLIC page its absence
    // positively means English — otherwise a stored "sq" in localStorage would
    // survive a reload of /tools/... and quietly override the URL the user is
    // actually on (and the one they shared). Authenticated app routes are
    // unprefixed by design, so they keep following the stored preference.
    const isLocalizablePublicPath =
      location.pathname === '/'
      || location.pathname === '/tools'
      || location.pathname.startsWith('/tools/')
      || location.pathname === '/pricing'
      || location.pathname === '/login'
      || location.pathname === '/register'
      || location.pathname === '/forgot-password';
    if (!urlLang && isLocalizablePublicPath) urlLang = 'en';

    if (urlLang && i18n.language !== urlLang && typeof i18n.changeLanguage === 'function') i18n.changeLanguage(urlLang);
    document.documentElement.lang = urlLang || (i18n.language || 'en').slice(0, 2);
  }, [location.pathname, i18n]);

  useEffect(() => {
    // Tools are public marketing/SEO surfaces — they must stay indexable.
    const indexablePaths = ['/', '/sq', '/pricing', '/sq/pricing', '/terms', '/privacy', ...toolPathVariants(TOOLS_INDEX_PATH), ...TOOLS.flatMap(tool => toolPathVariants(tool.path))];
    const indexable = indexablePaths.includes(location.pathname);
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', indexable ? 'index, follow' : 'noindex, nofollow');
  }, [location.pathname]);

  // Public routes that use the public layout (header + footer, no sidebar)
  const publicRoutes = ['/login', '/sq/login', '/register', '/sq/register', '/forgot-password', '/sq/forgot-password', '/reset-password', '/auth/confirmed', '/terms', '/privacy', ...toolPathVariants(TOOLS_INDEX_PATH), ...TOOLS.flatMap(tool => toolPathVariants(tool.path))];
  const isPublicRoute = publicRoutes.includes(location.pathname)
    || (!accessToken && location.pathname === '/')
    || (!accessToken && location.pathname === '/sq')
    || (!accessToken && location.pathname === '/pricing')
    || (!accessToken && location.pathname === '/sq/pricing');

  // A signed-in user who hasn't finished onboarding is about to be bounced to
  // /onboarding by PrivateRoute, so render the onboarding branch directly and
  // skip mounting the authenticated shell for a frame.
  // Scoped to non-public paths — public pages (/terms, /tools/*) stay reachable
  // mid-onboarding, and that branch only has a /onboarding route to match.
  const needsOnboarding =
    accessToken
    && user
    && !user.user_metadata?.onboarding_completed
    && !isPublicRoute;
  const isOnboardingRoute = location.pathname === '/onboarding' || needsOnboarding;

  // Until getSession() resolves we don't know who this is. On the OAuth return
  // the app mounts straight onto /dashboard with accessToken still null, so
  // every branch below picks AuthenticatedLayout and paints the sidebar + the
  // "loading dashboard" spinner before the redirect to /onboarding lands —
  // that's the flash. A neutral full-screen loader keeps the layout choice
  // deferred until the answer is actually known. Public paths are exempt: they
  // render identically signed-in or out, so they must not be delayed.
  if (authLoading && !isPublicRoute) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-page font-sans">
          <LoadingSpinner size="md" text="" className="min-h-screen" />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGlobalUI showLoadingOverlay={isPublicRoute} />
      {isOnboardingRoute ? (
        <div className="min-h-screen bg-page font-sans">
          <Routes>
            <Route path="/onboarding" element={
              <OnboardingRoute>
                <Suspense fallback={<LoadingSpinner size="md" text="" className="min-h-screen" />}>
                  <OnboardingWizard />
                </Suspense>
              </OnboardingRoute>
            } />
            {/* Reached when needsOnboarding pulled a protected path (e.g. the
                OAuth landing on /dashboard) into this branch. Redirect rather
                than render nothing, so the URL settles on /onboarding. */}
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </div>
      ) : isPublicRoute ? (
        <PublicLayout>
          {/* Taller fallback approximates the landing hero so the page doesn't jump
              from 40vh to full height when the chunk resolves — that jump shoves the
              footer (highest field-CLS element on /). */}
          <Suspense fallback={<LoadingSpinner size="md" text="" className="min-h-[70vh]" />}>
            <Routes>
              <Route path="/login" element={accessToken ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
              <Route path="/sq/login" element={accessToken ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
              <Route path="/register" element={accessToken ? <Navigate to="/dashboard" replace /> : <RegisterForm />} />
              <Route path="/sq/register" element={accessToken ? <Navigate to="/dashboard" replace /> : <RegisterForm />} />
              <Route path="/forgot-password" element={accessToken ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
              <Route path="/sq/forgot-password" element={accessToken ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/confirmed" element={<EmailConfirmed />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/sq/pricing" element={<PricingPage />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/tools" element={<ToolsIndex />} />
              <Route path="/sq/tools" element={<ToolsIndex />} />
              <Route path="/tools/salary-calculator" element={<SalaryCalculator />} />
              <Route path="/sq/tools/salary-calculator" element={<SalaryCalculator />} />
              <Route path="/tools/self-employed-calculator" element={<FreelancerCalculator />} />
              <Route path="/sq/tools/self-employed-calculator" element={<FreelancerCalculator />} />
              <Route path="/tools/loan-calculator" element={<LoanCalculator />} />
              <Route path="/sq/tools/loan-calculator" element={<LoanCalculator />} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/sq" element={<LandingPage />} />
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </Suspense>
        </PublicLayout>
      ) : (
        <AuthenticatedLayout>
          <Suspense fallback={<DashboardShell />}>
            <Routes>
              <Route path="/account" element={
                <PrivateRoute><AccountPage /></PrivateRoute>
              } />
              <Route path="/transactions" element={
                <PrivateRoute><TransactionsPage /></PrivateRoute>
              } />
              <Route path="/categories" element={
                <PrivateRoute><CategoriesPage /></PrivateRoute>
              } />
              <Route path="/recurring" element={
                <PrivateRoute><RecurringPage /></PrivateRoute>
              } />
              <Route path="/goals" element={
                <PrivateRoute><GoalsPage /></PrivateRoute>
              } />
              <Route path="/budgets" element={
                <PrivateRoute><BudgetsPage /></PrivateRoute>
              } />
              <Route path="/networth" element={
                <PrivateRoute><NetWorthPage /></PrivateRoute>
              } />
              <Route path="/notifications" element={
                <PrivateRoute><NotificationsPage /></PrivateRoute>
              } />
              <Route path="/reports" element={
                <PrivateRoute><ReportsPage /></PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute><Dashboard /></PrivateRoute>
              } />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/sq/pricing" element={<PricingPage />} />
              {/* Public tool, but also reachable while logged in — renders inside
                  the authenticated shell rather than 404ing for signed-in users. */}
              {/* Public tool, but also reachable while logged in — renders inside
                  the authenticated shell rather than redirecting signed-in users. */}
              <Route path="/tools" element={<ToolsIndex />} />
              <Route path="/sq/tools" element={<ToolsIndex />} />
              <Route path="/tools/salary-calculator" element={<SalaryCalculator />} />
              <Route path="/sq/tools/salary-calculator" element={<SalaryCalculator />} />
              <Route path="/tools/self-employed-calculator" element={<FreelancerCalculator />} />
              <Route path="/sq/tools/self-employed-calculator" element={<FreelancerCalculator />} />
              <Route path="/tools/loan-calculator" element={<LoanCalculator />} />
              <Route path="/sq/tools/loan-calculator" element={<LoanCalculator />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </Suspense>
        </AuthenticatedLayout>
      )}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider>
          <CryptoProvider>
            <SubscriptionProvider>
              <TransactionProvider>
                <Router>
                  <InnerAppContent />
                </Router>
              </TransactionProvider>
            </SubscriptionProvider>
          </CryptoProvider>
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
