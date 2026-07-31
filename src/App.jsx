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

const UnlockModal = lazy(() => import('./components/Encryption/UnlockModal.jsx'));
const MigrationBanner = lazy(() => import('./components/Encryption/MigrationBanner.jsx'));
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Shown while the Dashboard chunk is loading — LCP element (h1) is present immediately
function DashboardShell() {
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : '';
  return (
    <div className="min-h-[60vh]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary dark:text-white tracking-tight">
            {username || ' '}
          </h1>
          <div className="h-4 w-40 mt-1 rounded bg-surface-hairline dark:bg-surface-dark-hairline animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 rounded-[10px] bg-surface-hairline dark:bg-surface-dark-hairline animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const Sidebar = lazy(() => import('./components/Sidebar.jsx'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard.jsx'));
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
        <div className="fixed top-[4.5rem] sm:top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-expense-bg dark:bg-expense-tint border border-expense/30 text-expense pl-5 pr-3 py-3 rounded-container shadow-tier2 text-sm font-medium animate-fade-in max-w-md backdrop-blur-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span className="flex-1 text-center">{getErrorMessage(authError)}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss"
            className="flex-shrink-0 ml-1 p-1 rounded-md hover:bg-expense/10 transition-colors"
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
          <div className="bg-white dark:bg-surface-dark-tertiary rounded-container p-8 shadow-lg">
            <div className="w-12 h-12 border-4 border-surface-hairline dark:border-surface-dark-hairline border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-ink-muted dark:text-white font-medium text-sm text-center">{ready ? t('dashboard.processing') : ''}</p>
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

function AuthenticatedLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-surface-page dark:bg-surface-dark transition-colors duration-300 font-sans">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6 sm:pt-6 lg:py-8">
          {children}
        </div>
      </main>
      <EncryptionGate />
    </div>
  );
}

/* Public layout without sidebar */
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-page dark:bg-surface-dark transition-colors duration-300 font-sans">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
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
  // /onboarding by PrivateRoute. Rendering AuthenticatedLayout in the meantime
  // flashes DashboardShell (Suspense fallback) for a frame — very visible on
  // the OAuth return, where the app mounts straight onto /dashboard. Render the
  // onboarding branch instead so the shell never mounts. `authLoading` can't
  // guard this: it flips false in the same commit that sets `user`.
  // Scoped to non-public paths — public pages (/terms, /tools/*) stay reachable
  // mid-onboarding, and that branch only has a /onboarding route to match.
  const needsOnboarding =
    !authLoading
    && accessToken
    && user
    && !user.user_metadata?.onboarding_completed
    && !isPublicRoute;
  const isOnboardingRoute = location.pathname === '/onboarding' || needsOnboarding;

  return (
    <ErrorBoundary>
      <AuthGlobalUI showLoadingOverlay={isPublicRoute} />
      {isOnboardingRoute ? (
        <div className="min-h-screen bg-surface-page dark:bg-surface-dark transition-colors duration-300 font-sans">
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
