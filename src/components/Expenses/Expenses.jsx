import React, { useMemo, useState, useRef } from 'react'
import Card from '../UI/Card'
import ExpensesList from './ExpensesList'
import MonthChart from './MonthChart'

export default function Expenses({ items, onDelete, onUpdate, onImport }) {

  const years = useMemo(() => {
    const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'))
    return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))]
  }, [items])

  const [filter, setFilter] = useState('All')
  const fileRef = useRef(null)

  const filtered = useMemo(() => {
    if (filter === 'All') return items
    return items.filter(i => i.date?.startsWith(filter))
  }, [items, filter])
  function exportCSV() {
    const headers = ['id', 'title', 'amount', 'date']

    const rows = items.map(e => {
      const id = e.id ?? ''
      const title = String(e.title || '').replace(/"/g, '""') // escape quotes
      const amount = e.amount ?? ''
      // Format date as YYYY-MM-DD (Excel-friendly). Handle Date or string.
      let dateStr = ''
      if (e.date) {
        const d = (e.date instanceof Date) ? e.date : new Date(e.date)
        if (!isNaN(d)) dateStr = d.toISOString().slice(0, 10)
      }
      // Return CSV-safe row: id as plain number, others quoted
      return `${id},"${title}",${amount},"${dateStr}"`
    })

    const csv = [headers.join(','), ...rows].join('\r\n')
    // Add BOM so Excel recognizes UTF-8
    const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expenses.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
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
