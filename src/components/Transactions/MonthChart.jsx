import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function MonthChart({ items, totalIncome = 0, totalExpenses = 0 }) {
  const { t } = useTranslation();
  // Aggregate entries by month
  const monthlyData = {}
  
  items.forEach(entry => {
    const date = new Date(entry.date)
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, date: new Date(date.getFullYear(), date.getMonth(), 1) }
    }
    monthlyData[monthKey].total += entry.amount
  })

  // Convert to array format for Recharts and sort chronologically
  const data = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      total: parseFloat(data.total.toFixed(2)),
      dateObj: data.date
    }))
    .sort((a, b) => a.dateObj - b.dateObj)
    .map(({ month, total }) => ({ month, total }))

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">{t('chart.noData')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('transactions.noTransactions')}</p>
      </div>
    )
  }

  // Calculate balance if both totals are provided
  const showBalance = typeof totalIncome === 'number' && typeof totalExpenses === 'number';
  const balance = totalIncome - totalExpenses;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip 
            formatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            contentStyle={{
              backgroundColor: 'rgb(31 41 55)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white'
            }}
          />
          <Bar dataKey="total" fill="#3b82f6" name="Amount" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
