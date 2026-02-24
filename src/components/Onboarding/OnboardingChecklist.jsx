import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Shown to users on the dashboard until all tracked steps are done or dismissed.
 * Steps 1 (transaction), 4 (csv), 5 (split) are tracked; 2 (dashboard) and 3 (premium) are informational.
 */
export default function OnboardingChecklist({ transactionCount, hasSplitTransactions, onAddTransaction }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const storageKey = user ? `onboarding_dismissed_${user.id}` : null;
  const [dismissed, setDismissed] = useState(
    () => storageKey ? localStorage.getItem(storageKey) === 'true' : false
  );
  const [doneCsv, setDoneCsv] = useState(
    () => localStorage.getItem('onboarding_csv_imported') === '1'
  );

  // Re-read CSV flag whenever transactionCount changes
  useEffect(() => {
    setDoneCsv(localStorage.getItem('onboarding_csv_imported') === '1');
  }, [transactionCount]);

  const step1Done = transactionCount > 0;
  const doneSplit = hasSplitTransactions; // Use actual data, not localStorage
  const allDone = step1Done && doneCsv && doneSplit;

  if (dismissed || allDone) return null;

  function handleDismiss() {
    if (storageKey) localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  }

  const steps = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'green',
      done: step1Done,
      title: t('onboarding.step1'),
      desc: t('onboarding.step1Desc'),
      action: step1Done ? null : { label: t('onboarding.action1'), onClick: onAddTransaction },
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'blue',
      done: false,
      title: t('onboarding.step2'),
      desc: t('onboarding.step2Desc'),
      action: null,
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'purple',
      done: false,
      title: t('onboarding.step3'),
      desc: t('onboarding.step3Desc'),
      action: { label: t('onboarding.action3'), onClick: () => navigate('/pricing') },
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'teal',
      done: doneCsv,
      title: t('onboarding.step4'),
      desc: t('onboarding.step4Desc'),
      action: null,
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      color: 'indigo',
      done: doneSplit,
      title: t('onboarding.step5'),
      desc: t('onboarding.step5Desc'),
      action: doneSplit ? null : { label: t('onboarding.action5'), onClick: onAddTransaction },
    },
  ];

  const colorMap = {
    green:  { bg: 'bg-green-100 dark:bg-green-900/30',  icon: 'text-green-600 dark:text-green-400',  btn: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600' },
    blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',    icon: 'text-blue-600 dark:text-blue-400',    btn: 'bg-blue-600 hover:bg-blue-700' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30',icon: 'text-purple-600 dark:text-purple-400',btn: 'bg-purple-600 hover:bg-purple-700' },
    teal:   { bg: 'bg-teal-100 dark:bg-teal-900/30',    icon: 'text-teal-600 dark:text-teal-400',    btn: 'bg-teal-600 hover:bg-teal-700' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30',icon: 'text-indigo-600 dark:text-indigo-400',btn: 'bg-indigo-600 hover:bg-indigo-700' },
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-indigo-100 dark:border-indigo-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div>
          <h3 className="text-white font-bold text-base sm:text-lg">{t('onboarding.title')}</h3>
          <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">{t('onboarding.subtitle')}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
        >
          {t('onboarding.dismiss')}
        </button>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-700">
        {steps.map((step, i) => {
          const c = colorMap[step.color];
          return (
            <div key={i} className={`relative flex flex-col gap-3 p-4 sm:p-5 transition-all ${step.done ? 'opacity-60' : ''}`}>
              {step.done && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('onboarding.completed')}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-100 dark:bg-green-900/30' : c.bg}`}>
                  <span className={step.done ? 'text-green-600 dark:text-green-400' : c.icon}>{step.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm ${step.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>{step.title}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {!step.done && step.action && (
                <button
                  onClick={step.action.onClick}
                  className={`w-full text-white text-xs font-semibold py-2 rounded-lg transition-colors ${c.btn}`}
                >
                  {step.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('shortcuts.title')}:</span>
        <ShortcutBadge keys={['Alt', 'N']} label={t('shortcuts.addTransaction')} />
        <ShortcutBadge keys={['Ctrl', 'K']} label={t('shortcuts.search')} />
        <ShortcutBadge keys={['Esc']} label={t('shortcuts.closeModal')} />
      </div>
    </div>
  );
}

function ShortcutBadge({ keys, label }) {
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {keys.map((k, i) => (
        <kbd key={i} className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[10px] font-bold border border-gray-300 dark:border-gray-600">
          {k}
        </kbd>
      ))}
      <span className="ml-0.5">{label}</span>
    </span>
  );
}
