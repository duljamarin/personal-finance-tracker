import { getNextExpenseId, initExpenseIdFromList } from './utils/idGenerator'
import { useEffect, useMemo, useState } from 'react'
import Expenses from './components/Expenses/Expenses.jsx'
import Header from './components/Header.jsx'
import useDarkMode from './hooks/useDarkMode.js'
import NewExpense from './components/NewExpense/NewExpense.jsx'

const STORAGE_KEY = 'expense_tracker_items_v1'

export default function App(){
  const [expenses, setExpenses] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const initial = raw ? JSON.parse(raw) : [
        { id: 1, title: 'Laptop', amount: 1200, date: '2025-01-01' },
        { id: 2, title: 'Groceries', amount: 95, date: '2025-01-10' }
      ]
      // Use helper to initialize persistent last id
      initExpenseIdFromList(initial)
      return initial
    } catch(e) {
      console.error('Error reading localStorage', e)
      return []
    }
  })

  const [isDark, setIsDark] = useDarkMode('expense_dark_mode')

  const total = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amount || 0), 0)
  }, [expenses])


  useEffect(()=>{
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
    }catch(e){
      console.error('Error writing to localStorage', e)
    }
  }, [expenses])



  function addExpense(item) {
    setExpenses(prev => {
      // If item has an existing numeric id (e.g. restored), preserve it and bump the counter
      if (item && (typeof item.id === 'number' || (typeof item.id === 'string' && /^\d+$/.test(item.id)))) {
        const idNum = typeof item.id === 'number' ? item.id : Number(item.id)
        initExpenseIdFromList([{ id: idNum }])
        return [{ ...item, id: idNum }, ...prev]
      }
      // Use helper to get next id
      const next = getNextExpenseId()
      return [{ ...item, id: next }, ...prev]
    })
  }

  function updateExpense(id, updated){
    setExpenses(prev => prev.map(e => e.id === id ? {...e, ...updated} : e))
  }

  function deleteExpense(id){
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-3xl mx-auto">
        <Header isDark={isDark} toggleDark={() => setIsDark(d => !d)} />
        <NewExpense onAdd={addExpense} />
        <h2 className="mt-6 text-xl font-semibold text-gray-800 dark:text-gray-100">Total Expenses: ${total.toFixed(2)}</h2>
        <Expenses
          items={expenses}
          onDelete={deleteExpense}
          onUpdate={updateExpense}
          onExport={()=> { /* noop placeholder */ }}
        />
      </div>
    </div>
  )
}
