import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../src/context/ToastContext';
import { CATEGORIES } from './fixtures';
import { store } from './store';

// Same value shape as src/context/TransactionContext.jsx, backed by fixtures.
const Ctx = createContext(null);

export function TransactionProvider({ children }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState(store.transactions);
  const [mutationCount, setMutationCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const loading = new URLSearchParams(location.search).get('loading') === '1';

  const commit = (next) => { store.transactions = next; setTransactions(next); setMutationCount((c) => c + 1); };

  const addTransaction = useCallback(async (item, options = {}) => {
    const tx = {
      ...item, id: `n${Date.now()}`, category_id: item.categoryId, base_amount: item.amount,
      category: CATEGORIES.find((c) => c.id === item.categoryId), source_recurring_id: null,
    };
    commit([tx, ...store.transactions]);
    addToast(options.successMessage || t('messages.transactionAdded'), 'success');
    return true;
  }, [addToast, t]);
  const updateTransaction = useCallback(async (id, item) => {
    commit(store.transactions.map((x) => (x.id === id ? { ...x, ...item, base_amount: item.amount, category: CATEGORIES.find((c) => c.id === item.categoryId) || x.category } : x)));
    addToast(t('messages.transactionUpdated'), 'success');
  }, [addToast, t]);
  const deleteTransaction = useCallback(async (id) => {
    commit(store.transactions.filter((x) => x.id !== id));
    addToast(t('messages.transactionDeleted'), 'info');
  }, [addToast, t]);

  const totalIncome = useMemo(() => transactions.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0), [transactions]);

  const value = {
    transactions: loading ? [] : transactions,
    categories: CATEGORIES,
    loading,
    error: null,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    mutationCount,
    typeFilter,
    setTypeFilter,
    reloadTransactions: async () => {},
    reloadCategories: async () => {},
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransactions() {
  return useContext(Ctx);
}
