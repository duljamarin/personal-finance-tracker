import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

// Month name mapping for translation
const MONTH_MAP = {
  'Jan': 'jan', 'Feb': 'feb', 'Mar': 'mar', 'Apr': 'apr',
  'May': 'may', 'Jun': 'jun', 'Jul': 'jul', 'Aug': 'aug',
  'Sep': 'sep', 'Oct': 'oct', 'Nov': 'nov', 'Dec': 'dec',
  'Shk': 'feb', 'Pri': 'apr', 'Gus': 'aug', 'Sht': 'sep', 'Tet': 'oct', 'Nën': 'nov', 'Dhj': 'dec'
};

function CombinedMonthChartLegend() {
  const { t } = useTranslation();

  const items = [
    { key: 'income', color: '#10b981', label: t('chart.income') },
    { key: 'expense', color: '#ef4444', label: t('chart.expense') }
  ];

  return (
    <div
      className="flex justify-center gap-6 mt-2 text-sm text-gray-600 dark:text-gray-300"
    >
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function translateMonth(monthKey) {
  // monthKey is like "Dec 2025" or "Dhj 2025"
  const parts = monthKey.split(' ');
  const monthAbbr = parts[0];
  const year = parts[1];
  
  // Get the translation key
  const key = MONTH_MAP[monthAbbr] || monthAbbr.toLowerCase().substring(0, 3);
  const translatedMonth = i18n.t(`chart.months.${key}`, { defaultValue: monthAbbr });
  
  return `${translatedMonth} ${year}`;
}

function CombinedMonthTooltip({ active, payload, label }) {
  const { t } = useTranslation();

  if (!active || !payload || payload.length === 0) return null;

  const incomeEntry = payload.find(p => p.name === 'income');
  const expenseEntry = payload.find(p => p.name === 'expense');

  const incomeValue = incomeEntry ? incomeEntry.value : 0;
  const expenseValue = expenseEntry ? expenseEntry.value : 0;

  const formatCurrency = (value) => `€${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  return (
    <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-emerald-400">
        {t('chart.income')} : {formatCurrency(incomeValue)}
      </p>
      <p className="text-red-400 mt-1">
        {t('chart.expense')} : {formatCurrency(expenseValue)}
      </p>
    </div>
  );
}

export default function CombinedMonthChart({ transactions }) {
  const { t } = useTranslation();
  
  // Aggregate transactions by month for both income and expense
  const monthlyData = {};
  
  transactions.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { 
        income: 0, 
        expense: 0,
        date: new Date(date.getFullYear(), date.getMonth(), 1)
      };
    }
    
    // Use base_amount for multi-currency support, fallback to amount
    const amount = entry.base_amount || entry.amount || 0;
    
    if (entry.type === 'income') {
      monthlyData[monthKey].income += amount;
    } else if (entry.type === 'expense') {
      monthlyData[monthKey].expense += amount;
    }
  });

  // Convert to array format for Recharts and sort chronologically
  const data = Object.entries(monthlyData)
    .map(([month, values]) => ({
      month,
      monthDisplay: translateMonth(month),
      income: parseFloat(values.income.toFixed(2)),
      expense: parseFloat(values.expense.toFixed(2)),
      dateObj: values.date
    }))
    .sort((a, b) => a.dateObj - b.dateObj)
    .map(({ monthDisplay, income, expense }) => ({ month: monthDisplay, income, expense }));

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
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
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
          <Tooltip content={<CombinedMonthTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            height={40}
            content={<CombinedMonthChartLegend />}
          />
          <Bar dataKey="income" fill="#10b981" name="income" radius={[8, 8, 0, 0]} />
          <Bar dataKey="expense" fill="#ef4444" name="expense" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
