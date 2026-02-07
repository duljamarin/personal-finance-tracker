import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from './config/app';
import Transactions from './components/Transactions/Transactions.jsx';
import CatchAllRedirect from './components/CatchAllRedirect.jsx';
import CombinedMonthChart from './components/Transactions/CombinedMonthChart.jsx';
import CategoryPieChart from './components/Transactions/CategoryPieChart.jsx';
import CategoryBenchmark from './components/Benchmark/CategoryBenchmark.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CategoriesPage from './components/Categories/CategoriesPage.jsx';
import RecurringPage from './components/Recurring/RecurringPage.jsx';
import GoalsPage from './components/Goals/GoalsPage.jsx';
import BudgetsPage from './components/Budgets/BudgetsPage.jsx';
import LoginForm from './components/Auth/LoginForm.jsx';
import RegisterForm from './components/Auth/RegisterForm.jsx';
import EmailConfirmed from './components/Auth/EmailConfirmed.jsx';
import ForgotPassword from './components/Auth/ForgotPassword.jsx';
import ResetPassword from './components/Auth/ResetPassword.jsx';
import LandingPage from './components/LandingPage.jsx';
import TermsOfService from './components/Legal/TermsOfService.jsx';
import PrivacyPolicy from './components/Legal/PrivacyPolicy.jsx';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { TransactionProvider, useTransactions } from './context/TransactionContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import HealthScore from './components/HealthScore/HealthScore.jsx';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import { getValueColorClass } from './utils/classNames';
import PricingPage from './components/Pricing/PricingPage.jsx';
import UpgradeBanner from './components/Subscription/UpgradeBanner.jsx';
import PremiumFeatureLock from './components/Subscription/PremiumFeatureLock.jsx';


function PrivateRoute({ children }) {
  const { t } = useTranslation();
  const { accessToken, loading } = useAuth();
  if (loading) return (
    <LoadingSpinner size="md" text={t('dashboard.loadingDashboard')} className="min-h-screen" />
  );
  return accessToken ? children : <Navigate to="/login" replace />;
}

function PremiumRoute({ children }) {
  const { t } = useTranslation();
  const { accessToken, loading: authLoading } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();

  if (authLoading || subLoading) return (
    <LoadingSpinner size="md" text={t('dashboard.loadingDashboard')} className="min-h-screen" />
  );
  if (!accessToken) return <Navigate to="/login" replace />;
  if (!isPremium) return <Navigate to="/pricing" replace />;
  return children;
}

function AuthGlobalUI() {
  const { error: authError, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t('meta.title');
  }, [i18n.language, t]);

  // Map auth error to translation key based on actual Supabase error messages
  const getErrorMessage = (error) => {
    if (!error) return '';
    const errorLower = error.toLowerCase();

    // Invalid login credentials
    if (errorLower.includes('invalid') && errorLower.includes('credentials')) {
      return t('auth.invalidCredentials');
    }

    // Email already registered
    if (errorLower.includes('already registered')) {
      return t('auth.registrationError');
    }

    // Weak password
    if (errorLower.includes('password') && errorLower.includes('character')) {
      return t('auth.weakPassword');
    }

    // User not found
    if (errorLower.includes('user not found')) {
      return t('auth.userNotFound');
    }

    // Rate limiting
    if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
      return t('auth.tooManyRequests');
    }

    // Network errors
    if (errorLower.includes('network') || errorLower.includes('fetch')) {
      return t('auth.networkError');
    }

    // Email confirmation required
    if (errorLower.includes('check your email')) {
      return t('auth.registrationSuccess');
    }

    // Fallback: show generic error
    return t('auth.genericError');
  };

  return (
    <>
      {/* Global error banner */}
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-6 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in max-w-md text-center backdrop-blur-sm">
          <span className="inline-block mr-2">⚠️</span>
          {getErrorMessage(authError)}
        </div>
      )}
      {/* Global loading spinner overlay */}
      {authLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300 font-medium text-center">{t('dashboard.processing')}</p>
          </div>
        </div>
      )}
    </>
  );
}

function InnerAppContent() {
  const location = useLocation();
  const { accessToken } = useAuth();
  const { t } = useTranslation();
  const {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpense,
    net,
    hasMixedCurrencies,
  } = useTransactions();

  const [showGreeting, setShowGreeting] = useState(false);
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (username) {
      setShowGreeting(true);
      const timer = setTimeout(() => setShowGreeting(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [username]);APP_CONFIG.GREETING_DURATION

  // Routes where Header should not be shown (auth flows)
  const hideHeaderRoutes = ['/reset-password'];
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">
      <AuthGlobalUI />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col min-h-[calc(100vh-3rem)]">
        {shouldShowHeader && <Header />}
        <main className="flex-1 mt-4">
        <Routes>
            <Route path="/login" element={accessToken ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
            <Route path="/register" element={accessToken ? <Navigate to="/dashboard" replace /> : <RegisterForm />} />
            <Route path="/forgot-password" element={accessToken ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/confirmed" element={<EmailConfirmed />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/categories" element={
              <PrivateRoute>
                <CategoriesPage />
              </PrivateRoute>
            } />
            <Route path="/recurring" element={
              <PremiumRoute>
                <RecurringPage />
              </PremiumRoute>
            } />
            <Route path="/goals" element={
              <PremiumRoute>
                <GoalsPage />
              </PremiumRoute>
            } />
            <Route path="/budgets" element={
              <PremiumRoute>
                <BudgetsPage />
              </PremiumRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <>
                  {showGreeting && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-base font-semibold animate-fade-in-out max-w-md text-center border border-white/20">
                      <span className="text-2xl mr-2">👋</span>
                      {t('dashboard.welcomeBack')}, {username}!
                    </div>
                  )}
                  <UpgradeBanner />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.totalIncome')}</p>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">€{totalIncome.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.totalExpenses')}</p>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">€{totalExpense.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 012 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.balance')}</p>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold ${getValueColorClass(net)}`}>€{net.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('currency.baseCurrency')}</p>
                    </div>
                  </div>

                  {/* Mixed currency indicator */}
                  {hasMixedCurrencies && (
                    <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{t('currency.mixedCurrencies')}</span>
                    </div>
                  )}

                  {/* Combined Monthly Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700 mb-6">
                    <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {t('chart.monthlyOverview')}
                    </h3>
                    <CombinedMonthChart transactions={transactions} />
                  </div>

                  {/* Two-column layout for income/expense breakdowns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    {/* Income Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        {t('transactions.incomes')} {t('chart.byCategory')}
                      </h3>
                      <CategoryPieChart transactions={transactions} type="income" />
                    </div>

                    {/* Expense Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        {t('transactions.expenses')} {t('chart.byCategory')}
                      </h3>
                      <CategoryPieChart transactions={transactions} type="expense" />
                    </div>
                  </div>

                  {/* Smart Category Benchmark */}
                  <PremiumFeatureLock featureName={t('landing.features.benchmarks.title')}>
                    <CategoryBenchmark onReloadTrigger={transactions.length} />
                  </PremiumFeatureLock>

                   {/* Health Score */}
                  <PremiumFeatureLock featureName={t('landing.features.healthscore.title')}>
                    <HealthScore onReloadTrigger={transactions.length} />
                  </PremiumFeatureLock>

                  {/* Page-level error (non-auth) */}
                  {error && <div className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 font-medium">{error}</div>}
                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400 mr-3"></div>
                      {t('dashboard.loadingData')}
                    </div>
                  ) : (
                    <Transactions />
                  )}
                </>
              </PrivateRoute>
            } />
            <Route path="/" element={accessToken ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            {/* Catch-all route: redirect to login if not authenticated, else to home */}
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
          </main>
          <Footer />
        </div>
      </div>
    );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider>
          <TransactionProvider>
            <SubscriptionProvider>
              <Router>
                <InnerAppContent />
              </Router>
            </SubscriptionProvider>
          </TransactionProvider>
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
