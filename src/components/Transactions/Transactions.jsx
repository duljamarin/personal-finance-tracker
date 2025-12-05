import React, { useMemo, useState } from 'react'
import Card from '../UI/Card'
import TransactionsList from './TransactionsList'
import { toCSV, downloadCSV } from '../../utils/csv'

export default function Transactions({ items, onDelete, onUpdate, categories, typeFilter, setTypeFilter }) {
  const years = useMemo(() => {
    const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'))
    return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))]
  }, [items])

  const [yearFilter, setYearFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const filtered = useMemo(() => {
    let result = items
    if (yearFilter !== 'All') {
      result = result.filter(i => i.date?.startsWith(yearFilter))
    }
    if (categoryFilter !== 'All') {
      result = result.filter(i => i.category.id === categoryFilter)
    }
    if (typeFilter && typeFilter !== 'all') {
      result = result.filter(i => i.type === typeFilter)
    }
    return result
  }, [items, yearFilter, categoryFilter, typeFilter])

  function exportCSV() {
    const csv = toCSV(filtered)
    downloadCSV(csv, 'transactions.csv')
  }

  return (
    <Card className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Income & Expenses</h2>
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700">
            <option value="All">All Categories</option>
            {(Array.isArray(categories) ? categories : []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700">
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Export CSV</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-300">No records. Add your first entry.</p>
      ) : (
        <TransactionsList items={filtered} onDelete={onDelete} onUpdate={onUpdate} />
      )}
    </Card>
  )
}
