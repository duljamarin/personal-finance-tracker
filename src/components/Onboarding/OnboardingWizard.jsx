import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { trackEvent } from '../../lib/analytics';
import { supabase } from '../../utils/supabaseClient';
import {
  fetchCategories,
  addCategory,
  addTransaction,
  addRecurringTransaction,
  processRecurringTransactions,
  createGoal,
  createBudget,
} from '../../utils/api';
import { fetchExchangeRate } from '../../utils/exchangeRate';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { computeSnapshot } from '../../utils/reveal/computeSnapshot';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ProgressBar from './ProgressBar';
import CurrencyStep from './steps/CurrencyStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';
import GoalsStep from './steps/GoalsStep';
import BudgetsStep from './steps/BudgetsStep';
import CurrencyArt from './art/CurrencyArt';
import IncomeArt from './art/IncomeArt';
import ExpensesArt from './art/ExpensesArt';
import GoalsArt from './art/GoalsArt';
import BudgetsArt from './art/BudgetsArt';
import FinancialReveal from './Reveal/FinancialReveal';

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { addToast } = useToast();
  const { reloadTransactions, reloadCategories } = useTransactions();

  // Step sequence: currency, monthly income, fixed monthly bills, then the two
  // optional commitment steps (goals + budgets). Goals/budgets come after bills
  // because both derive their suggestions from what was entered there.
  const steps = ['currency', 'income', 'expenses', 'goals', 'budgets'];
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
    goals: [],
    budgets: [],
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
      const { currency, exchangeRate, income, payday, expenses, goals, budgets } = wizardData;
      const todayStr = new Date().toISOString().split('T')[0];
      const rate = currency === 'EUR' ? 1.0 : Number(exchangeRate) || 1.0;
      const now = new Date();

      // Recurring templates start TODAY, not next month. The first instance is
      // created by processRecurringTransactions() below rather than by a direct
      // addTransaction — that's what stamps source_recurring_id on it, which is
      // the key the processor's de-dup check looks at. Seeding the instance
      // directly (as before) left it unlinked, so every later run happily
      // created a second identical copy.

      // Income is pinned to the payday the user entered, when they entered one,
      // so the salary template lands on their real pay date instead of whatever
      // day they happened to sign up on. Bills have no equivalent field and stay
      // on today. The chosen day is resolved to this month if it hasn't passed
      // yet, otherwise next month, so start_date is never backdated.
      const paydayNum = payday ? Number(payday) : null;
      let incomeStartStr = todayStr;
      if (paydayNum >= 1 && paydayNum <= 31) {
        const todayDay = now.getUTCDate();
        const monthOffset = paydayNum >= todayDay ? 0 : 1;
        const targetMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
        const daysInTarget = new Date(Date.UTC(
          targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0
        )).getUTCDate();
        targetMonth.setUTCDate(Math.min(paydayNum, daysInTarget));
        incomeStartStr = targetMonth.toISOString().split('T')[0];
      }

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
      // Returns the inserted row on success and null on failure, so callers can
      // chain off it (the income seed needs the template id). Truthiness still
      // works as the old boolean did for the counters below.
      const seed = async (label, fn) => {
        try {
          return (await fn()) ?? true;
        } catch (e) {
          console.error(`onboarding seed failed (${label}):`, e);
          seedFailed = true;
          return null;
        }
      };

      // --- Income: monthly recurring template + its first instance ---
      if (incomeNum > 0) {
        const template = await seed('income recurring', () => addRecurringTransaction({
          title: t('onboarding.reveal.salaryTitle'),
          amount: incomeNum,
          type: 'income',
          categoryId: null,
          currencyCode: currency,
          exchangeRate: rate,
          frequency: 'monthly',
          intervalCount: 1,
          startDate: incomeStartStr,
        }));
        if (template) seededRecurring += 1;

        // Insert the first salary on the payday the user picked. The processor
        // only materialises rows whose next_run_at has already passed, so a
        // future payday would otherwise leave the dashboard with no income at
        // all. Stamping source_recurring_id keeps the processor from creating a
        // second copy of this same date later.
        if (template?.id) {
          await seed('income transaction', () => addTransaction({
            title: t('onboarding.reveal.salaryTitle'),
            amount: incomeNum,
            type: 'income',
            categoryId: null,
            date: incomeStartStr,
            currencyCode: currency,
            exchangeRate: rate,
            sourceRecurringId: template.id,
          }));
        }
      }

      // --- Bills: monthly recurring template (first instance generated below) ---
      const billsForSnapshot = [];
      for (const expense of validExpenses) {
        const resolvedCategoryId = expense.categoryId || uncategorizedCategory?.id;
        const cat = categoryById.get(resolvedCategoryId);
        const title = cat?.name ? translateCategoryName(cat.name) : t('transactions.expense');
        const amountNum = Number(expense.amount);

        const ok = await seed('bill recurring', () => addRecurringTransaction({
          title,
          amount: amountNum,
          type: 'expense',
          categoryId: resolvedCategoryId,
          currencyCode: currency,
          exchangeRate: rate,
          frequency: 'monthly',
          intervalCount: 1,
          startDate: todayStr,
        }));
        if (ok) seededRecurring += 1;

        // No auto budgets: seeding a budget equal to a same-day transaction made
        // every category read 100% spent (red) on the fresh dashboard, which
        // looked alarming. Users set budgets themselves later; the dashboard
        // still comes alive via the transactions + recurring templates above.

        billsForSnapshot.push({ amount: amountNum * rate, categoryName: cat?.name || '' });
      }

      // --- Goals (optional step) ---
      // target_amount is stored in the base currency (EUR), the same basis goal
      // contributions use, so convert what the user typed in their own currency.
      let seededGoals = 0;
      const validGoals = (goals || []).filter(
        (g) => g.name?.trim() && Number(g.amount) > 0
      );
      for (const goal of validGoals) {
        const ok = await seed('goal', () => createGoal({
          name: goal.name.trim(),
          targetAmount: Number(goal.amount) * rate,
          targetDate: goal.targetDate || null,
          goalType: 'savings',
        }));
        if (ok) seededGoals += 1;
      }

      // --- Budgets (optional step) ---
      // Budget caps are compared against base_amount spend, which is EUR, so the
      // typed amount needs the same rate conversion as bills above.
      let seededBudgets = 0;
      const seenBudgetCategories = new Set();
      const validBudgets = (budgets || []).filter((b) => {
        if (!b.categoryId || !(Number(b.amount) > 0)) return false;
        if (seenBudgetCategories.has(b.categoryId)) return false; // one cap per category
        seenBudgetCategories.add(b.categoryId);
        return true;
      });
      for (const budget of validBudgets) {
        const ok = await seed('budget', () => createBudget({
          categoryId: budget.categoryId,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          amount: Number(budget.amount) * rate,
        }));
        if (ok) seededBudgets += 1;
      }

      // Materialise this month's instance for each template just seeded. Doing
      // it here (rather than inserting the transaction directly) means every
      // seeded transaction carries source_recurring_id, so the processor's
      // de-dup check recognises it on all later runs. Best-effort like the
      // seeds above: the Transactions page runs this on mount anyway.
      if (seededRecurring > 0) {
        await seed('recurring first run', () => processRecurringTransactions());
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

      const canReveal =
        incomeNum > 0 || validExpenses.length > 0 || validGoals.length > 0 || validBudgets.length > 0;
      if (canReveal) {
        // Show the reveal FIRST. onboarding_completed is flipped only when the
        // user finishes the reveal (finalizeOnboarding on onDone) — flipping it
        // here would make OnboardingRoute redirect to /dashboard and unmount
        // this wizard before the reveal ever paints.
        setReveal({
          snapshot,
          currency,
          seededSummary: {
            recurring: seededRecurring,
            budgets: seededBudgets,
            goals: seededGoals,
          },
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
    goals: GoalsArt,
    budgets: BudgetsArt,
  }[stepKey];

  // Everything after the currency step is optional.
  const canSkip = stepKey !== 'currency';

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
              {stepKey === 'goals' && (
                <GoalsStep
                  goals={wizardData.goals}
                  onChange={(val) => updateData('goals', val)}
                  currency={wizardData.currency}
                  income={wizardData.income}
                />
              )}
              {stepKey === 'budgets' && (
                <BudgetsStep
                  budgets={wizardData.budgets}
                  onChange={(val) => updateData('budgets', val)}
                  categories={categories}
                  currency={wizardData.currency}
                  expenses={wizardData.expenses}
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
