import React, { useEffect, useState, useMemo } from 'react'
import Header from './components/Header'
import NewExpense from './components/NewExpense/NewExpense'
import Expenses from './components/Expenses/Expenses'

const STORAGE_KEY = 'expense_tracker_items_v1'

export default function App(){
  const [expenses, setExpenses] = useState(() => {
    try{
      const raw = localStorage.getItem(STORAGE_KEY)
      const initial = raw ? JSON.parse(raw) : [
        { id: 1, title: 'Laptop', amount: 1200, date: '2025-01-01' },
        { id: 2, title: 'Groceries', amount: 95, date: '2025-01-10' }
      ]

      // Initialize persistent last id to avoid collisions when creating new items
      try{
        const maxId = initial.reduce((m, e) => {
          const n = typeof e.id === 'number' ? e.id : (Number(e.id) || 0)
          return Math.max(m, n)
        }, 0)
        const lastStored = Number(localStorage.getItem('expense_last_id')) || 0
        const newLast = Math.max(lastStored, maxId)
        if (newLast > 0) localStorage.setItem('expense_last_id', String(newLast))
      }catch(_){}

      return initial
    }catch(e){
      console.error('Error reading localStorage', e)
      return []
    }
  })

  const [dark, setDark] = useState(() => {
    try{ return localStorage.getItem('expense_dark_mode') === '1' } catch { return false }
  })

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

  useEffect(()=>{
    try{ 
      localStorage.setItem('expense_dark_mode', dark ? '1' : '0')
      if(dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }catch(e){ console.error(e) }
  }, [dark])

  function addExpense(item){
    setExpenses(prev => {
      // If item has an existing numeric id (e.g. restored), preserve it and bump the counter
      if (item && (typeof item.id === 'number' || (typeof item.id === 'string' && /^\d+$/.test(item.id)))){
        const idNum = typeof item.id === 'number' ? item.id : Number(item.id)
        try{
          const lastStored = Number(localStorage.getItem('expense_last_id')) || 0
          if (idNum > lastStored) localStorage.setItem('expense_last_id', String(idNum))
        }catch(_){ }
        return [{...item, id: idNum}, ...prev]
      }

      // Generate next sequential id using persistent counter and existing max
      try{
        const lastStored = Number(localStorage.getItem('expense_last_id')) || 0
        const maxPrevId = prev.reduce((m, e) => {
          const n = typeof e.id === 'number' ? e.id : (Number(e.id) || 0)
          return Math.max(m, n)
        }, 0)
        const base = Math.max(lastStored, maxPrevId)
        const next = base + 1
        localStorage.setItem('expense_last_id', String(next))
        return [{...item, id: next}, ...prev]
      }catch(_){
        // Fallback if localStorage fails: use timestamp id
        return [{...item, id: Date.now()}, ...prev]
      }
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
        <Header dark={dark} setDark={setDark} />

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
