import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

export default function LandingPage() {
  const { t } = useTranslation();

  // Dummy data for preview charts
  const dummyMonthlyData = [
    { month: t('landing.months.jan'), income: 3500, expense: 2200 },
    { month: t('landing.months.feb'), income: 3200, expense: 2800 },
    { month: t('landing.months.mar'), income: 4000, expense: 2500 },
    { month: t('landing.months.apr'), income: 3800, expense: 3000 },
  ];

  const dummyCategoryData = [
    { name: t('landing.categories.food'), value: 800, color: '#ef4444' },
    { name: t('landing.categories.transport'), value: 300, color: '#f59e0b' },
    { name: t('landing.categories.entertainment'), value: 200, color: '#8b5cf6' },
    { name: t('landing.categories.utilities'), value: 400, color: '#3b82f6' },
  ];

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      titleKey: 'landing.features.tracking.title',
      descKey: 'landing.features.tracking.desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      titleKey: 'landing.features.charts.title',
      descKey: 'landing.features.charts.desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleKey: 'landing.features.categories.title',
      descKey: 'landing.features.categories.desc',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleKey: 'landing.features.multicurrency.title',
      descKey: 'landing.features.multicurrency.desc',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/5 dark:via-purple-600/5 dark:to-pink-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
              {t('landing.hero.title')}
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg"
              >
                {t('landing.hero.getStarted')}
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 text-gray-700 dark:text-gray-200 font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-lg"
              >
                {t('landing.hero.signIn')}
              </Link>
            </div>
          </div>

          {/* Feature Preview - Dummy Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Bar Chart Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {t('landing.preview.monthlyOverview')}
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dummyMonthlyData}>
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
                    formatter={(value, name) => [`€${value}`, t(`transactions.${name}`)]}
                    contentStyle={{
                      backgroundColor: 'rgb(31 41 55)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="income" fill="#10b981" name="income" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="expense" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {t('landing.preview.categoryBreakdown')}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dummyCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {dummyCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `$${value}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      color: '#1f2937',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            {t('landing.features.title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-md">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg"
          >
            {t('landing.cta.button')}
          </Link>
        </div>
      </div>
    </div>
  );
}
