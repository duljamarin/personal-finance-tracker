import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// These components read the currency from useDisplayCurrency. Rendering them
// catches a class of mistake the build cannot: a formatter pulled from the hook
// inside one component but referenced from another (ReferenceError at render),
// or a helper that no longer exists on the hook (TypeError at render).
//
// useAuth() is intentionally undefined here — that is the logged-out / no-provider
// path the hook has to tolerate.
vi.mock('../../context/AuthContext', () => ({ useAuth: () => undefined }));
let mockTransactions = [];
vi.mock('../../context/TransactionContext', () => ({
  useTransactions: () => ({ net: 0, transactions: mockTransactions, categories: [], mutationCount: 0, loading: false }),
}));
vi.mock('../../context/CryptoContext', () => ({ useCrypto: () => ({ status: 'off' }) }));
vi.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false, isTrialing: false }),
}));
vi.mock('../../utils/api', () => ({
  fetchRecurringTransactions: async () => [],
  fetchBudgets: async () => [],
  fetchSplitsForTransactions: async () => ({}),
}));

const SummaryCards = (await import('../Dashboard/SummaryCards.jsx')).default;
const MonthForecastTile = (await import('../Dashboard/MonthForecastTile.jsx')).default;
const NetWorthChart = (await import('../NetWorth/NetWorthChart.jsx')).default;

describe('currency-aware components render', () => {
  it('SummaryCards renders', () => {
    expect(() =>
      render(<SummaryCards totalIncome={100} totalExpense={40} net={60} loading={false} />)
    ).not.toThrow();
  });

  // The month forecast card formats every engine value with the display
  // currency: render its empty state and its full state.
  it('MonthForecastTile renders its empty state', () => {
    mockTransactions = [];
    expect(() => render(<MemoryRouter><MonthForecastTile /></MemoryRouter>)).not.toThrow();
    expect(screen.getByText('No forecast yet')).toBeInTheDocument();
  });

  it('MonthForecastTile renders a forecast', async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    mockTransactions = [
      { id: 'a', date: iso, type: 'income', amount: 1000, base_amount: 1000, category_id: 'salary' },
      { id: 'b', date: iso, type: 'expense', amount: 200, base_amount: 200, category_id: 'food' },
    ];
    render(<MemoryRouter><MonthForecastTile /></MemoryRouter>);
    expect(await screen.findByText(/^On track to keep in /)).toBeInTheDocument();
    // Free plan with scope 'breakdown': headline shown, breakdown locked.
    expect(screen.getByText('Premium shows what drives this forecast')).toBeInTheDocument();
    mockTransactions = [];
  });

  it('NetWorthChart renders', () => {
    expect(() => render(<NetWorthChart data={[]} transactions={[]} />)).not.toThrow();
  });
});
