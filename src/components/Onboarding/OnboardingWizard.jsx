import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { trackEvent } from '../../lib/analytics';
import { supabase } from '../../utils/supabaseClient';
import { fetchCategories, addCategory, addTransaction, addRecurringTransaction } from '../../utils/api';
import { fetchExchangeRate } from '../../utils/exchangeRate';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { computeSnapshot } from '../../utils/reveal/computeSnapshot';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ProgressBar from './ProgressBar';
import CurrencyStep from './steps/CurrencyStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';
import CurrencyArt from './art/CurrencyArt';
import IncomeArt from './art/IncomeArt';
import ExpensesArt from './art/ExpensesArt';
import FinancialReveal from './Reveal/FinancialReveal';

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { addToast } = useToast();
  const { reloadTransactions, reloadCategories } = useTransactions();

  // Step sequence: currency, monthly income, then fixed monthly bills.
  const steps = ['currency', 'income', 'expenses'];
  const TOTAL_STEPS = steps.length;

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [reveal, setReveal] = useState(null); // { snapshot, seededSummary } | null

  const [wizardData, setWizardData] = useState({
    currency: 'EUR',
    exchangeRate: 1.0,
    income: '',
    payday: '',
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
      const { currency, exchangeRate, income, payday, expenses } = wizardData;
      const todayStr = new Date().toISOString().split('T')[0];
      const rate = currency === 'EUR' ? 1.0 : Number(exchangeRate) || 1.0;
      const now = new Date();

      // Start-of-next-month date (YYYY-MM-DD) for recurring templates so the
      // processor doesn't double-create this month's instance we add directly.
      const nextRun = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextRunStr = nextRun.toISOString().split('T')[0];

      let localCategories = categories;
      const incomeNum = income ? Number(income) : 0;
      const validExpenses = expenses.filter((e) => e.amount && Number(e.amount) > 0);

      let seededRecurring = 0;

      // --- Ensure an Uncategorized fallback if any bill lacks a category ---
      const needsUncategorized = validExpenses.some((e) => !e.categoryId);
      let uncategorizedCategory = null;
      if (needsUncategorized) {
        uncategorizedCategory = localCategories.find((c) => c.name.toLowerCase() === 'uncategorized');
        if (!uncategorizedCategory) {
          uncategorizedCategory = await addCategory({ name: 'Uncategorized' });
          localCategories = [...localCategories, uncategorizedCategory];
          setCategories(localCategories);
        }
      }
      const categoryById = new Map(localCategories.map((c) => [c.id, c]));

      // Seeding is best-effort: the reveal snapshot is computed purely in
      // memory from the wizard inputs, so a single failed insert (e.g. a
      // transient DB/RLS error, or the monthly free-tier transaction limit
      // being hit) must NOT trap the user on the onboarding screen with a
      // generic error. Each seed is isolated; failures are logged with their
      // real reason and the flow still reaches the reveal/dashboard.
      let seedFailed = false;
      const seed = async (label, fn) => {
        try {
          await fn();
          return true;
        } catch (e) {
          console.error(`onboarding seed failed (${label}):`, e);
          seedFailed = true;
          return false;
        }
      };

      // --- Income: this-month transaction + monthly recurring template ---
      if (incomeNum > 0) {
        await seed('income transaction', () => addTransaction({
          title: t('onboarding.reveal.salaryTitle'),
          amount: incomeNum,
          type: 'income',
          categoryId: null,
          date: todayStr,
          currencyCode: currency,
          exchangeRate: rate,
        }));
        const ok = await seed('income recurring', () => addRecurringTransaction({
          title: t('onboarding.reveal.salaryTitle'),
          amount: incomeNum,
          type: 'income',
          categoryId: null,
          currencyCode: currency,
          exchangeRate: rate,
          frequency: 'monthly',
          intervalCount: 1,
          startDate: nextRunStr,
        }));
        if (ok) seededRecurring += 1;
      }

      // --- Bills: this-month transaction + monthly recurring template ---
      const billsForSnapshot = [];
      for (const expense of validExpenses) {
        const resolvedCategoryId = expense.categoryId || uncategorizedCategory?.id;
        const cat = categoryById.get(resolvedCategoryId);
        const title = cat?.name ? translateCategoryName(cat.name) : t('transactions.expense');
        const amountNum = Number(expense.amount);

        await seed('bill transaction', () => addTransaction({
          title,
          amount: amountNum,
          type: 'expense',
          categoryId: resolvedCategoryId,
          date: todayStr,
          currencyCode: currency,
          exchangeRate: rate,
        }));

        const ok = await seed('bill recurring', () => addRecurringTransaction({
          title,
          amount: amountNum,
          type: 'expense',
          categoryId: resolvedCategoryId,
          currencyCode: currency,
          exchangeRate: rate,
          frequency: 'monthly',
          intervalCount: 1,
          startDate: nextRunStr,
        }));
        if (ok) seededRecurring += 1;

        // No auto budgets: seeding a budget equal to a same-day transaction made
        // every category read 100% spent (red) on the fresh dashboard, which
        // looked alarming. Users set budgets themselves later; the dashboard
        // still comes alive via the transactions + recurring templates above.

        billsForSnapshot.push({ amount: amountNum * rate, categoryName: cat?.name || '' });
      }

      if (seedFailed) {
        // Surface a soft warning but keep going — the user can add data later.
        addToast(t('onboarding.wizard.seedWarning'), 'warning');
      }

      // --- Compute the in-memory snapshot (base currency / EUR) ---
      const snapshot = computeSnapshot({
        income: incomeNum * rate,
        bills: billsForSnapshot,
        payday: payday ? Number(payday) : null,
      });

      await Promise.all([reloadTransactions(), reloadCategories()]);

      trackEvent('OnboardingComplete');

      const canReveal = incomeNum > 0 || validExpenses.length > 0;
      if (canReveal) {
        // Show the reveal FIRST. onboarding_completed is flipped only when the
        // user finishes the reveal (finalizeOnboarding on onDone) — flipping it
        // here would make OnboardingRoute redirect to /dashboard and unmount
        // this wizard before the reveal ever paints.
        setReveal({
          snapshot,
          currency,
          seededSummary: { recurring: seededRecurring, budgets: 0 },
        });
      } else {
        // Nothing entered — keep the original lightweight success screen.
        await finalizeOnboarding(currency);
        setShowSuccess(true);
        setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      addToast(t('messages.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Persist the onboarding_completed flag + preferred currency, then refresh the
  // auth user so the app routes into the authenticated shell. Called when the
  // user leaves onboarding (after the reveal, or after the success screen) so
  // OnboardingRoute's redirect never fires while the reveal is still on screen.
  async function finalizeOnboarding(currency) {
    await supabase.auth.updateUser({
      data: { onboarding_completed: true, preferred_currency: currency },
    });
    await refreshUser();
  }

  if (loadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (reveal) {
    return (
      <FinancialReveal
        snapshot={reveal.snapshot}
        currency={reveal.currency}
        seededSummary={reveal.seededSummary}
        onDone={async () => {
          // Flip onboarding_completed now (user is leaving the reveal), then
          // navigate. Finalizing here — not in handleFinish — is what keeps the
          // reveal on screen instead of being redirected away immediately.
          try {
            await finalizeOnboarding(reveal.currency);
          } catch (err) {
            console.error('Onboarding finalize error:', err);
          }
          navigate('/dashboard', { replace: true });
        }}
      />
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
    income: IncomeArt,
    expenses: ExpensesArt,
  }[stepKey];

  // Income and the final expenses step are both skippable.
  const canSkip = stepKey === 'income' || stepKey === 'expenses';

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
            <div className="hidden lg:flex items-center justify-center p-8 bg-surface-subtle dark:bg-surface-dark-subtle border-r border-surface-hairline dark:border-surface-dark-hairline rounded-l-xl overflow-hidden">
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
              {stepKey === 'income' && (
                <IncomeStep
                  income={wizardData.income}
                  payday={wizardData.payday}
                  currency={wizardData.currency}
                  onIncomeChange={(val) => updateData('income', val)}
                  onPaydayChange={(val) => updateData('payday', val)}
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
