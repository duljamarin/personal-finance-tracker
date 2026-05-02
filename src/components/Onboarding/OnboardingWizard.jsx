import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { supabase } from '../../utils/supabaseClient';
import { fetchCategories, addCategory, addTransaction } from '../../utils/api';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ProgressBar from './ProgressBar';
import CurrencyStep from './steps/CurrencyStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';

const TOTAL_STEPS = 3;

/* Step illustrations — hairline brand SVGs */
const StepArt = {
  1: (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="100" cy="80" r="48" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30 animate-pulse opacity-40" />
      <circle cx="100" cy="80" r="32" stroke="#22ad93" strokeWidth="2" />
      <text x="100" y="92" textAnchor="middle" className="fill-brand-600 dark:fill-brand-400" style={{ fontFamily: 'Space Grotesk', fontSize: '28px', fontWeight: 600 }}>€</text>
      <text x="40" y="40" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 500 }}>$</text>
      <text x="160" y="48" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 500 }}>£</text>
      <text x="40" y="130" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 500 }}>¥</text>
      <text x="160" y="124" className="fill-ink-muted dark:fill-ink-dark-muted" style={{ fontFamily: 'Space Grotesk', fontSize: '14px', fontWeight: 500 }}>₣</text>
    </svg>
  ),
  2: (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="20" y1="140" x2="180" y2="140" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <line x1="20" y1="100" x2="180" y2="100" className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <line x1="20" y1="60" x2="180" y2="60" className="stroke-ink-primary/15 dark:stroke-ink-dark-primary/15" strokeDasharray="2 3" />
      <path d="M20 130 L60 110 L100 80 L140 60 L180 30" stroke="#22ad93" strokeWidth="2.2" />
      <circle cx="60" cy="110" r="3" fill="#22ad93" />
      <circle cx="100" cy="80" r="3" fill="#22ad93" />
      <circle cx="140" cy="60" r="3" fill="#22ad93" />
      <circle cx="180" cy="30" r="4" fill="#22ad93" />
      <rect x="160" y="14" width="32" height="22" rx="3" fill="#22ad93" />
      <text x="176" y="30" textAnchor="middle" fill="white" style={{ fontFamily: 'Space Grotesk', fontSize: '12px', fontWeight: 600 }}>+</text>
    </svg>
  ),
  3: (
    <svg viewBox="0 0 200 160" className="w-full h-auto" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="30" y="30" width="60" height="44" rx="4" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <line x1="40" y1="44" x2="80" y2="44" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <line x1="40" y1="54" x2="68" y2="54" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <line x1="40" y1="62" x2="74" y2="62" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <rect x="110" y="30" width="60" height="44" rx="4" className="stroke-ink-primary/40 dark:stroke-ink-dark-primary/40" />
      <line x1="120" y1="44" x2="160" y2="44" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <line x1="120" y1="54" x2="148" y2="54" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <line x1="120" y1="62" x2="154" y2="62" className="stroke-ink-primary/30 dark:stroke-ink-dark-primary/30" />
      <rect x="30" y="86" width="140" height="14" rx="3" stroke="#22ad93" />
      <rect x="30" y="86" width="84" height="14" rx="3" fill="#22ad93" />
      <rect x="30" y="110" width="140" height="14" rx="3" stroke="#22ad93" />
      <rect x="30" y="110" width="48" height="14" rx="3" fill="#22ad93" />
    </svg>
  ),
};

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { addToast } = useToast();
  const { reloadTransactions, reloadCategories } = useTransactions();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expenseErrors, setExpenseErrors] = useState([]);

  const [wizardData, setWizardData] = useState({
    currency: 'EUR',
    exchangeRate: 1.0,
    monthlyIncome: '',
    expenses: [{ id: crypto.randomUUID(), amount: '', categoryId: '' }],
  });

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  function updateData(field, value) {
    setWizardData((prev) => ({ ...prev, [field]: value }));
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS) setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  function handleSkip() {
    if (currentStep < TOTAL_STEPS) {
      handleNext();
    } else {
      handleFinish();
    }
  }

  function validateExpenses() {
    const { expenses } = wizardData;
    const errors = expenses.map((e) =>
      e.amount && Number(e.amount) > 0 && !e.categoryId ? true : false
    );
    setExpenseErrors(errors);
    return !errors.some(Boolean);
  }

  async function handleFinish() {
    if (!validateExpenses()) return;
    setSubmitting(true);
    try {
      const { currency, exchangeRate, monthlyIncome, expenses } = wizardData;
      const todayStr = new Date().toISOString().split('T')[0];
      const rate = currency === 'EUR' ? 1.0 : Number(exchangeRate) || 1.0;

      if (monthlyIncome && Number(monthlyIncome) > 0) {
        let salaryCategory = categories.find((c) => c.name.toLowerCase() === 'salary');
        if (!salaryCategory) {
          salaryCategory = await addCategory({ name: 'Salary' });
          const updated = await fetchCategories();
          setCategories(updated);
        }

        await addTransaction({
          title: 'Salary',
          amount: Number(monthlyIncome),
          type: 'income',
          categoryId: salaryCategory.id,
          date: todayStr,
          currencyCode: currency,
          exchangeRate: rate,
        });
      }

      const validExpenses = expenses.filter(
        (e) => e.amount && Number(e.amount) > 0 && e.categoryId
      );
      await Promise.all(
        validExpenses.map((expense) => {
          const cat = categories.find((c) => c.id === expense.categoryId);
          return addTransaction({
            title: cat?.name || 'Expense',
            amount: Number(expense.amount),
            type: 'expense',
            categoryId: expense.categoryId,
            date: todayStr,
            currencyCode: currency,
            exchangeRate: rate,
          });
        })
      );

      await supabase.auth.updateUser({
        data: { onboarding_completed: true, preferred_currency: currency },
      });
      await refreshUser();

      await Promise.all([reloadTransactions(), reloadCategories()]);

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1800);
    } catch (err) {
      console.error('Onboarding error:', err);
      addToast(t('messages.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (showSuccess) {
    const username =
      (typeof window !== 'undefined' && localStorage.getItem('username')) || '';
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-page dark:bg-surface-dark-page px-4">
        <div className="animate-celebrate inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-brand-600 rounded-full shadow-lg shadow-brand-500/30 mb-6">
          <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] text-center mb-3">
          {username
            ? `${t('onboarding.wizard.successTitle').replace(/!$/, '')}, ${username}!`
            : t('onboarding.wizard.successTitle')}
        </h1>
        <p className="text-base text-ink-muted dark:text-ink-dark-muted text-center max-w-md">
          {t('onboarding.wizard.successSubtitle')}
        </p>
      </div>
    );
  }

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-5 shadow-lg shadow-brand-500/30">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 L10 11 L14 14 L20 6" />
              <path d="M15 6 L20 6 L20 11" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight-display leading-[1.05] mb-3">
            {t('onboarding.wizard.title')}
          </h1>
          <p className="text-base text-ink-muted dark:text-ink-dark-muted max-w-md mx-auto">
            {t('onboarding.wizard.subtitle')}
          </p>
        </div>

        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content — split layout */}
        <div className="bg-white dark:bg-surface-dark-card rounded-xl border border-surface-hairline dark:border-surface-dark-hairline shadow-sm">
          <div className="grid lg:grid-cols-[5fr_7fr]">
            {/* Illustration column */}
            <div className="hidden lg:flex items-center justify-center p-8 bg-brand-50/30 dark:bg-brand-950/10 border-r border-surface-hairline dark:border-surface-dark-hairline rounded-l-xl overflow-hidden">
              <div className="w-full max-w-[320px]">{StepArt[currentStep]}</div>
            </div>

            {/* Form column */}
            <div className="p-6 sm:p-8 overflow-visible">
              {currentStep === 1 && (
                <CurrencyStep
                  currency={wizardData.currency}
                  exchangeRate={wizardData.exchangeRate}
                  onCurrencyChange={(val) => {
                    updateData('currency', val);
                    if (val === 'EUR') updateData('exchangeRate', 1.0);
                  }}
                  onExchangeRateChange={(val) => updateData('exchangeRate', val === '' ? '' : parseFloat(val))}
                />
              )}
              {currentStep === 2 && (
                <IncomeStep
                  monthlyIncome={wizardData.monthlyIncome}
                  onChange={(val) => updateData('monthlyIncome', val)}
                  currency={wizardData.currency}
                />
              )}
              {currentStep === 3 && (
                <ExpensesStep
                  expenses={wizardData.expenses}
                  onChange={(val) => { updateData('expenses', val); setExpenseErrors([]); }}
                  categories={categories}
                  currency={wizardData.currency}
                  errors={expenseErrors}
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="secondary" onClick={handleBack} disabled={submitting}>
                {t('onboarding.wizard.back')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSkip} disabled={submitting}>
              {isLastStep ? t('onboarding.wizard.skipAndFinish') : t('onboarding.wizard.skip')}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleFinish}
                disabled={submitting}
                className="shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
              >
                {submitting ? t('onboarding.wizard.submitting') : t('onboarding.wizard.finish')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
              >
                {t('onboarding.wizard.next')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
