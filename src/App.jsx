import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Transactions from './components/Transactions/Transactions.jsx';
import CatchAllRedirect from './components/CatchAllRedirect.jsx';
import MonthChart from './components/Transactions/MonthChart.jsx';
import Header from './components/Header.jsx';
import useDarkMode from './hooks/useDarkMode.js';
import CategoriesPage from './components/Categories/CategoriesPage.jsx';
import LoginForm from './components/Auth/LoginForm.jsx';
import RegisterForm from './components/Auth/RegisterForm.jsx';
import { fetchTransactions, addTransaction as apiAddTransaction, updateTransaction as apiUpdateTransaction, deleteTransaction as apiDeleteTransaction, fetchCategories } from './utils/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';


function PrivateRoute({ children }) {
  const { t } = useTranslation();
  const { accessToken, loading } = useAuth();
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.loadingDashboard')}</p>
    </div>
  );
  return accessToken ? children : <Navigate to="/login" replace />;
}

function AuthGlobalUI() {
  const { error: authError, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  
  // Re-render when language changes to update translations
  useEffect(() => {
    // This effect will run whenever language changes
  }, [i18n.language]);
  
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

function AppContent() {
  const { accessToken, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [catError, setCatError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'income', 'expense'

  const [isDark, setIsDark] = useDarkMode('expense_dark_mode')

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0), [transactions])
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0), [transactions])
  const net = totalIncome - totalExpense
  const [showGreeting, setShowGreeting] = useState(false);
  const username = localStorage.getItem('username');
  // Load transactions from backend or localStorage
  async function reloadTransactions() {
    setLoading(true)
    setError(null)
    setTransactions([]) // Clear old data immediately
    try {
      // fetch all, filter in FE for charts
      const transactionsData = await fetchTransactions()
      setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
    } catch (e) {
      console.error('❌ Error loading transactions:', e);
      setTransactions([])
    }
    setLoading(false)
  }

  async function reloadCategories() {
    setCategories([]) // Clear old data immediately
    setCatError(null)
    try {
      const cats = await fetchCategories()
      setCategories(Array.isArray(cats) ? cats : [])
    } catch (e) {
      console.error('❌ Error loading categories:', e);
      setCategories([])
      setCatError('Failed to load categories')
    }
  }

  useEffect(() => {
    // Wait for auth to initialize before fetching data
    if (authLoading) return;
    
    if (accessToken) {
      reloadTransactions()
      reloadCategories()
    } else {
      // Clear data when logged out
      setTransactions([])
      setCategories([])
      setLoading(false)
    }
  }, [accessToken, authLoading])

  async function addTransaction(item) {
    try {
      const newItem = await apiAddTransaction(item)
      setTransactions(prev => [newItem, ...prev])
      addToast(t('messages.transactionAdded'), 'success')
    } catch (e) {
      addToast(t('messages.error'), 'error')
    }
  }

  async function updateTransaction(id, updated) {
    try {
      const newItem = await apiUpdateTransaction(id, updated)
      setTransactions(prev => prev.map(e => e.id === id ? newItem : e))
      addToast(t('messages.transactionUpdated'), 'success')
    } catch (e) {
      addToast(t('messages.error'), 'error')
    }
  }

  async function deleteTransaction(id) {
    try {
      await apiDeleteTransaction(id)
      setTransactions(prev => prev.filter(e => e.id !== id))
      addToast(t('messages.transactionDeleted'), 'info')
    } catch (e) {
      addToast(t('messages.error'), 'error')
    }
  }

  
useEffect(() => {
    if (username) {
      setShowGreeting(true);
      const timer = setTimeout(() => setShowGreeting(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [username]);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">
        <AuthGlobalUI />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Header isDark={isDark} toggleDark={() => setIsDark(d => !d)} />
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/categories" element={
              <PrivateRoute>
                <CategoriesPage reloadExpenses={reloadTransactions} reloadCategories={reloadCategories} categories={categories} catError={catError} />
              </PrivateRoute>
            } />
            <Route path="/" element={
              <PrivateRoute>
                <>
                  {showGreeting && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-base font-semibold animate-fade-in-out max-w-md text-center border border-white/20">
                      <span className="text-2xl mr-2">👋</span>
                      {t('dashboard.welcomeBack')}, {username}!
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.totalIncome')}</p>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.totalExpenses')}</p>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">${totalExpense.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t('dashboard.balance')}</p>
                      </div>
                      <p className={`text-2xl sm:text-3xl font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>${net.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        {t('dashboard.incomeByMonth')}
                      </h3>
                      <MonthChart items={transactions.filter(t => t.type === 'income')} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        {t('dashboard.expensesByMonth')}
                      </h3>
                      <MonthChart items={transactions.filter(t => t.type === 'expense')} />
                    </div>
                  </div>
                  {/* Page-level error (non-auth) */}
                  {error && <div className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 font-medium">{error}</div>}
                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400 mr-3"></div>
                      {t('dashboard.loadingData')}
                    </div>
                  ) : (
                    <Transactions
                      items={transactions}
                      onDelete={deleteTransaction}
                      onUpdate={updateTransaction}
                      onAdd={addTransaction}
                      categories={categories}
                      typeFilter={typeFilter}
                      setTypeFilter={setTypeFilter}
                    />
                  )}
                </>
              </PrivateRoute>
            } />
            {/* Catch-all route: redirect to login if not authenticated, else to home */}
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
