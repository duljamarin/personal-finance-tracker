import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Transactions from './components/Transactions/Transactions.jsx'
import MonthChart from './components/Transactions/MonthChart.jsx'
import Header from './components/Header.jsx'
import useDarkMode from './hooks/useDarkMode.js'
import NewTransaction from './components/Transaction/NewTransaction.jsx'
import CategoriesPage from './components/Categories/CategoriesPage.jsx'
import { fetchTransactions, addTransaction as apiAddTransaction, updateTransaction as apiUpdateTransaction, deleteTransaction as apiDeleteTransaction, fetchCategories } from './utils/api'


export default function App(){
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

  // Load transactions from backend or localStorage
  async function reloadTransactions() {
    setLoading(true)
    setError(null)
    try {
      // fetch all, filter in FE for charts
      const transactionsData = await fetchTransactions()
      setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
    } catch (e) {
      setTransactions([])
    }
    setLoading(false)
  }

  async function reloadCategories() {
    try {
      const cats = await fetchCategories()
      setCategories(Array.isArray(cats) ? cats : [])
    } catch {
      setCategories([])
      setCatError('Failed to load categories')
    }
  }

  useEffect(() => {
    reloadTransactions()
    reloadCategories()
  }, [])

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

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-3xl mx-auto">
          <Header isDark={isDark} toggleDark={() => setIsDark(d => !d)} />
          <nav className="mb-6 flex gap-4">
            <Link to="/" className="text-blue-600 hover:underline">Income & Expenses</Link>
            <Link to="/categories" className="text-blue-600 hover:underline">Categories</Link>
          </nav>
          <Routes>
            <Route path="/categories" element={<CategoriesPage reloadExpenses={reloadTransactions} reloadCategories={reloadCategories} categories={categories} catError={catError} />} />
            <Route path="/" element={
              <>
                <NewTransaction onAdd={addTransaction} />
                <div className="flex gap-6 mb-4">
                  <div className="text-green-700 dark:text-green-400 font-semibold">Total Income: ${totalIncome.toFixed(2)}</div>
                  <div className="text-red-700 dark:text-red-400 font-semibold">Total Expense: ${totalExpense.toFixed(2)}</div>
                  <div className="text-blue-700 dark:text-blue-400 font-semibold">Balance: ${net.toFixed(2)}</div>
                </div>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2 text-green-700 dark:text-green-400">Income by Month</h3>
                    <MonthChart items={transactions.filter(t => t.type === 'income')} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2 text-red-700 dark:text-red-400">Expenses by Month</h3>
                    <MonthChart items={transactions.filter(t => t.type === 'expense')} />
                  </div>
                </div>
                {error && <div className="mb-4 text-red-600">{error}</div>}
                {loading ? (
                  <div className="text-gray-500 dark:text-gray-300">Loading...</div>
                ) : (
                  <Transactions
                    items={transactions}
                    onDelete={deleteTransaction}
                    onUpdate={updateTransaction}
                    categories={categories}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                  />
                )}
              </>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  )
}
