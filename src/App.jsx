
import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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


function PrivateRoute({ children }) {
  const { accessToken, loading } = useAuth();
  if (loading) return <div className="text-center py-12">Loading...</div>;
  return accessToken ? children : <Navigate to="/login" replace />;
}

function AuthGlobalUI() {
  const { error: authError, loading: authLoading } = useAuth();
  return (
    <>
      {/* Global error banner */}
      {authError && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white text-center py-2 font-semibold shadow-lg animate-fade-in">
          {authError}
        </div>
      )}
      {/* Global loading spinner overlay */}
      {authLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      )}
    </>
  );
}

function AppContent() {
  const { accessToken, loading: authLoading } = useAuth();
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
    } catch (e) {}
  }

  async function updateTransaction(id, updated) {
    try {
      const newItem = await apiUpdateTransaction(id, updated)
      setTransactions(prev => prev.map(e => e.id === id ? newItem : e))
    } catch (e) {}
  }

  async function deleteTransaction(id) {
    try {
      await apiDeleteTransaction(id)
      setTransactions(prev => prev.filter(e => e.id !== id))
    } catch (e) {}
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6 sm:p-6 lg:p-8 relative">
        <AuthGlobalUI />
        <div className="max-w-7xl mx-auto">
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
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl shadow-2xl text-sm sm:text-base lg:text-lg font-semibold animate-fade-in-out max-w-[90%] sm:max-w-2xl text-center">
                      Hello {username}! Welcome to your personal finance dashboard.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">Total Income</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">Total Expenses</p>
                      <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">${totalExpense.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-blue-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">Balance</p>
                      <p className={`text-2xl sm:text-3xl font-bold ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>${net.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Income by Month
                      </h3>
                      <MonthChart items={transactions.filter(t => t.type === 'income')} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-gray-100 dark:border-gray-700">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        Expenses by Month
                      </h3>
                      <MonthChart items={transactions.filter(t => t.type === 'expense')} />
                    </div>
                  </div>
                  {/* Page-level error (non-auth) */}
                  {error && <div className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 font-medium">{error}</div>}
                  {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400 mr-3"></div>
                      Loading your data...
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
      <AppContent />
    </AuthProvider>
  );
}
