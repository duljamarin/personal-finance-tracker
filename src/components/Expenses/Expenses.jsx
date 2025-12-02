
import React, { useMemo, useState } from 'react'
import Card from '../UI/Card'
import ExpensesList from './ExpensesList'
import MonthChart from './MonthChart'
import { toCSV, downloadCSV } from '../../utils/csv'

export default function Expenses({ items, onDelete, onUpdate }) {

  const years = useMemo(() => {
    const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'))
    return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))]
  }, [items])

  const [filter, setFilter] = useState('All')

  const filtered = useMemo(() => {
    if (filter === 'All') return items
    return items.filter(i => i.date?.startsWith(filter))
  }, [items, filter])
  function exportCSV() {
    const csv = toCSV(items)
    downloadCSV(csv, 'expenses.csv')
  }

  return (
    <Card className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Your Expenses</h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Export CSV</button>
        </div>
      </div>

      <MonthChart items={filtered} />

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-300">No expenses. Add your first expense.</p>
      ) : (
        <ExpensesList items={filtered} onDelete={onDelete} onUpdate={onUpdate} />
      )}
    </Card>
  )
}
