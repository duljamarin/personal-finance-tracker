import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { trackEvent } from '../../lib/analytics';
import { supabase } from '../../utils/supabaseClient';
import { fetchCategories, addCategory, addTransaction } from '../../utils/api';
import { fetchExchangeRate } from '../../utils/exchangeRate';
import { translateCategoryName } from '../../utils/categoryTranslation';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ProgressBar from './ProgressBar';
import CurrencyStep from './steps/CurrencyStep';
import ExpensesStep from './steps/ExpensesStep';
import CurrencyArt from './art/CurrencyArt';
import ExpensesArt from './art/ExpensesArt';

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { addToast } = useToast();
  const { reloadTransactions, reloadCategories } = useTransactions();

  // Step sequence: currency, then starting expenses.
  const steps = ['currency', 'expenses'];
  const TOTAL_STEPS = steps.length;

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  const [wizardData, setWizardData] = useState({
    currency: 'EUR',
    exchangeRate: 1.0,
    expenses: [{ id: crypto.randomUUID(), amount: '', categoryId: '' }],
  });

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  useEffect(() => {
    const currency = wizardData.currency;
    if (currency === 'EUR') {
      updateData('exchangeRate', 1.0);
      return;
    }
    let cancelled = false;
    setIsFetchingRate(true);
    fetchExchangeRate(currency).then((rate) => {
      if (!cancelled && rate !== null) updateData('exchangeRate', rate);
      if (!cancelled) setIsFetchingRate(false);
    });
    return () => { cancelled = true; };
  }, [wizardData.currency]);

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

  async function handleFinish() {
    setSubmitting(true);
    try {
      const { currency, exchangeRate, expenses } = wizardData;
      const todayStr = new Date().toISOString().split('T')[0];
      const rate = currency === 'EUR' ? 1.0 : Number(exchangeRate) || 1.0;

      let localCategories = categories;

      const validExpenses = expenses.filter((e) => e.amount && Number(e.amount) > 0);
      if (validExpenses.length > 0) {
        const needsUncategorized = validExpenses.some((e) => !e.categoryId);
        let uncategorizedCategory = null;

        if (needsUncategorized) {
          uncategorizedCategory = localCategories.find(
            (c) => c.name.toLowerCase() === 'uncategorized'
          );
          if (!uncategorizedCategory) {
            uncategorizedCategory = await addCategory({ name: 'Uncategorized' });
            localCategories = [...localCategories, uncategorizedCategory];
            setCategories(localCategories);
          }
        }

        const categoryById = new Map(localCategories.map((c) => [c.id, c]));

        await Promise.all(
          validExpenses.map((expense) => {
            const resolvedCategoryId = expense.categoryId || uncategorizedCategory?.id;
            const cat = categoryById.get(resolvedCategoryId);
            return addTransaction({
              title: cat?.name ? translateCategoryName(cat.name) : t('transactions.expense'),
              amount: Number(expense.amount),
              type: 'expense',
              categoryId: resolvedCategoryId,
              date: todayStr,
              currencyCode: currency,
              exchangeRate: rate,
            });
          })
        );
      }

      // Update onboarding flag after all data is written, then reload everything once.
      // Doing this last avoids the race where refreshUser triggers TransactionContext's
      // auth-change useEffect which re-fetches and overwrites our freshly imported data.
      await supabase.auth.updateUser({
        data: { onboarding_completed: true, preferred_currency: currency },
      });
      await refreshUser();
      await Promise.all([reloadTransactions(), reloadCategories()]);

      trackEvent('OnboardingComplete');
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
        <div className="animate-celebrate inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-brand-600 rounded-md shadow-lg shadow-brand-500/30 mb-6">
          <svg viewBox="0 0 24 24" className="w-10 h-10 sm:w-12 sm:h-12" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-white tracking-tight leading-[1.05] text-center mb-3">
          {username
            ? `${t('onboarding.wizard.successTitle').replace(/!$/, '')}, ${username}!`
            : t('onboarding.wizard.successTitle')}
        </h1>
        <p className="text-base text-ink-muted dark:text-white text-center max-w-md">
          {t('onboarding.wizard.successSubtitle')}
        </p>
      </div>
    );
  }

  const stepKey = steps[currentStep - 1];
  const isLastStep = currentStep === TOTAL_STEPS;

  const StepArt = {
    currency: CurrencyArt,
    expenses: ExpensesArt,
  }[stepKey];

  // The expenses (last) step can be skipped if the user has no starting expenses.
  const canSkip = !isLastStep || stepKey === 'expenses';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-md mb-5 shadow-lg shadow-brand-500/30">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 L10 11 L14 14 L20 6" />
              <path d="M15 6 L20 6 L20 11" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-white tracking-tight leading-[1.05] mb-3">
            {t('onboarding.wizard.title')}
          </h1>
          <p className="text-base text-ink-muted dark:text-white max-w-md mx-auto">
            {t('onboarding.wizard.subtitle')}
          </p>
        </div>

        <ProgressBar
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          stepLabels={steps.map((s) => t(`onboarding.steps.${s}`))}
        />

        {/* Step content — split layout */}
        <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline shadow-sm">
          <div className="grid lg:grid-cols-[5fr_7fr]">
            {/* Illustration column */}
            <div className="hidden lg:flex items-center justify-center p-8 bg-brand-50/30 dark:bg-brand-950/10 border-r border-surface-hairline dark:border-surface-dark-hairline rounded-l-xl overflow-hidden">
              <div className="w-full max-w-[320px]">{StepArt && <StepArt />}</div>
            </div>

            {/* Form column */}
            <div className="p-6 sm:p-8 overflow-visible">
              {stepKey === 'currency' && (
                <CurrencyStep
                  currency={wizardData.currency}
                  exchangeRate={wizardData.exchangeRate}
                  isFetchingRate={isFetchingRate}
                  onCurrencyChange={(val) => updateData('currency', val)}
                  onExchangeRateChange={(val) => updateData('exchangeRate', val === '' ? '' : parseFloat(val))}
                />
              )}
              {stepKey === 'expenses' && (
                <ExpensesStep
                  expenses={wizardData.expenses}
                  onChange={(val) => updateData('expenses', val)}
                  categories={categories}
                  currency={wizardData.currency}
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
            {canSkip && !isLastStep && (
              <Button variant="ghost" onClick={handleSkip} disabled={submitting}>
                {t('onboarding.wizard.skip')}
              </Button>
            )}

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
