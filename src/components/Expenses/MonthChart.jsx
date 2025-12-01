import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function MonthChart({ items }) {
  // Aggregate expenses by month
  const monthlyData = {}
  
  items.forEach(expense => {
    const date = new Date(expense.date)
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, date: new Date(date.getFullYear(), date.getMonth(), 1) }
    }
    monthlyData[monthKey].total += expense.amount
  })

  // Convert to array format for Recharts and sort chronologically
  const data = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      total: parseFloat(data.total.toFixed(2)),
      dateObj: data.date
    }))
    .sort((a, b) => a.dateObj - b.dateObj) // Sort by actual date
    .map(({ month, total }) => ({ month, total })) // Remove dateObj from final output

  // If no data, show message
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400 mb-4">
        No expenses to display
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow mb-4">
      <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">Monthly Expenses</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
          <Bar dataKey="total" fill="#3b82f6" name="Amount ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}