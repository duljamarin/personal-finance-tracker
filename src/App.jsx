import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CatchAllRedirect from './components/CatchAllRedirect.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Dashboard from './components/Dashboard/Dashboard.jsx';
import CategoriesPage from './components/Categories/CategoriesPage.jsx';
import RecurringPage from './components/Recurring/RecurringPage.jsx';
import GoalsPage from './components/Goals/GoalsPage.jsx';
import BudgetsPage from './components/Budgets/BudgetsPage.jsx';
import NetWorthPage from './components/NetWorth/NetWorthPage.jsx';
import NotificationsPage from './components/Notifications/NotificationsPage.jsx';
import LoginForm from './components/Auth/LoginForm.jsx';
import RegisterForm from './components/Auth/RegisterForm.jsx';
import AccountPage from './components/Auth/AccountPage.jsx';
import EmailConfirmed from './components/Auth/EmailConfirmed.jsx';
import ForgotPassword from './components/Auth/ForgotPassword.jsx';
import ResetPassword from './components/Auth/ResetPassword.jsx';
import LandingPage from './components/LandingPage.jsx';
import TermsOfService from './components/Legal/TermsOfService.jsx';
import PrivacyPolicy from './components/Legal/PrivacyPolicy.jsx';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { TransactionProvider } from './context/TransactionContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import LoadingSpinner from './components/UI/LoadingSpinner.jsx';
import PricingPage from './components/Pricing/PricingPage.jsx';


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
            <Route path="/account" element={
              <PrivateRoute>
                <AccountPage />
              </PrivateRoute>
            } />
            <Route path="/categories" element={
              <PrivateRoute>
                <CategoriesPage />
              </PrivateRoute>
            } />
            <Route path="/recurring" element={
              <PrivateRoute>
                <RecurringPage />
              </PrivateRoute>
            } />
            <Route path="/goals" element={
              <PrivateRoute>
                <GoalsPage />
              </PrivateRoute>
            } />
            <Route path="/budgets" element={
              <PrivateRoute>
                <BudgetsPage />
              </PrivateRoute>
            } />
            <Route path="/networth" element={
              <PremiumRoute>
                <NetWorthPage />
              </PremiumRoute>
            } />
            <Route path="/notifications" element={
              <PrivateRoute>
                <NotificationsPage />
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
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
          <SubscriptionProvider>
            <TransactionProvider>
              <Router>
                <InnerAppContent />
              </Router>
            </TransactionProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
