import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// These components read the currency from useDisplayCurrency. Rendering them
// catches a class of mistake the build cannot: a formatter pulled from the hook
// inside one component but referenced from another (ReferenceError at render),
// or a helper that no longer exists on the hook (TypeError at render).
//
// useAuth() is intentionally undefined here — that is the logged-out / no-provider
// path the hook has to tolerate.
vi.mock('../../context/AuthContext', () => ({ useAuth: () => undefined }));
vi.mock('../../context/TransactionContext', () => ({
  useTransactions: () => ({ net: 0, transactions: [] }),
}));
vi.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false, isTrialing: false }),
}));
vi.mock('../../utils/api', () => ({
  fetchRecurringTransactions: async () => [],
  calculateNextDate: () => new Date().toISOString(),
}));

const SummaryCards = (await import('../Dashboard/SummaryCards.jsx')).default;
const CashFlowForecast = (await import('../Dashboard/CashFlowForecast.jsx')).default;
const NetWorthChart = (await import('../NetWorth/NetWorthChart.jsx')).default;

describe('currency-aware components render', () => {
  it('SummaryCards renders', () => {
    expect(() =>
      render(<SummaryCards totalIncome={100} totalExpense={40} net={60} loading={false} />)
    ).not.toThrow();
  });

  // Regression: fmtCurrency was destructured inside ForecastTooltip only, while
  // the main component still called it — ReferenceError, blank Dashboard.
  it('CashFlowForecast renders', () => {
    expect(() => render(<CashFlowForecast />)).not.toThrow();
  });

  it('NetWorthChart renders', () => {
    expect(() => render(<NetWorthChart data={[]} transactions={[]} />)).not.toThrow();
  });
});
