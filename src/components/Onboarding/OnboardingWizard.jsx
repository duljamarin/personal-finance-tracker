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

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const { reloadTransactions, reloadCategories } = useTransactions();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [wizardData, setWizardData] = useState({
    currency: 'EUR',
    exchangeRate: 1.0,
    monthlyIncome: '',
    expenses: [{ amount: '', categoryId: '' }],
  });

  // If user already completed onboarding, redirect
  useEffect(() => {
    if (user?.user_metadata?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

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

  async function handleFinish() {
    setSubmitting(true);
    try {
      const { currency, exchangeRate, monthlyIncome, expenses } = wizardData;
      const todayStr = new Date().toISOString().split('T')[0];
      const rate = currency === 'EUR' ? 1.0 : Number(exchangeRate) || 1.0;

      // 1. If income was entered, find or create Salary category + add transaction
      if (monthlyIncome && Number(monthlyIncome) > 0) {
        let salaryCategory = categories.find((c) => c.name === 'Salary');
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

      // 2. Add expenses
      for (const expense of expenses) {
        if (expense.amount && Number(expense.amount) > 0 && expense.categoryId) {
          const cat = categories.find((c) => c.id === expense.categoryId);
          await addTransaction({
            title: cat?.name || 'Expense',
            amount: Number(expense.amount),
            type: 'expense',
            categoryId: expense.categoryId,
            date: todayStr,
            currencyCode: currency,
            exchangeRate: rate,
          });
        }
      }

      // 3. Update user metadata: currency + onboarding flag
      await supabase.auth.updateUser({
        data: { onboarding_completed: true, preferred_currency: currency },
      });
      await refreshUser();

      // Reload TransactionContext so dashboard shows the new data
      await Promise.all([reloadTransactions(), reloadCategories()]);

      navigate('/dashboard', { replace: true });
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

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.wizard.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {t('onboarding.wizard.subtitle')}
          </p>
        </div>

        {/* Progress */}
        <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        {/* Step content */}
        <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl border border-gray-200 dark:border-zinc-800 p-6 sm:p-8">
          {currentStep === 1 && (
            <CurrencyStep
              currency={wizardData.currency}
              exchangeRate={wizardData.exchangeRate}
              onCurrencyChange={(val) => {
                updateData('currency', val);
                if (val === 'EUR') updateData('exchangeRate', 1.0);
              }}
              onExchangeRateChange={(val) => updateData('exchangeRate', val)}
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
              onChange={(val) => updateData('expenses', val)}
              categories={categories}
              currency={wizardData.currency}
            />
          )}
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
              <Button onClick={() => handleFinish()} disabled={submitting}>
                {submitting ? t('onboarding.wizard.submitting') : t('onboarding.wizard.finish')}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {t('onboarding.wizard.next')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
