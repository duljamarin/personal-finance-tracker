import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { fetchTransactions, addTransaction as apiAddTransaction, updateTransaction as apiUpdateTransaction, deleteTransaction as apiDeleteTransaction, fetchCategories } from '../utils/api';

const TransactionContext = createContext();

export function TransactionProvider({ children }) {
  const { accessToken, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catError, setCatError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const totalIncome = useMemo(
    () => transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0),
    [transactions]
  );
  const net = totalIncome - totalExpense;

  const hasMixedCurrencies = useMemo(() => {
    const currencies = new Set(transactions.map(tx => tx.currency_code || tx.currencyCode || 'EUR'));
    return currencies.size > 1;
  }, [transactions]);

  const reloadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTransactions([]);
    try {
      const data = await fetchTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Error loading transactions:', e);
      setTransactions([]);
    }
    setLoading(false);
  }, []);

  const reloadCategories = useCallback(async () => {
    setCategories([]);
    setCatError(null);
    try {
      const cats = await fetchCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      console.error('❌ Error loading categories:', e);
      setCategories([]);
      setCatError('Failed to load categories');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (accessToken) {
      reloadTransactions();
      reloadCategories();
    } else {
      setTransactions([]);
      setCategories([]);
      setLoading(false);
    }
  }, [accessToken, authLoading]);

  const addTransaction = useCallback(async (item) => {
    try {
      const newItem = await apiAddTransaction(item);
      setTransactions(prev => [newItem, ...prev]);
      addToast(t('messages.transactionAdded'), 'success');
    } catch (e) {
      addToast(t('messages.error'), 'error');
    }
  }, [addToast, t]);

  const updateTransaction = useCallback(async (id, updated) => {
    try {
      const newItem = await apiUpdateTransaction(id, updated);
      setTransactions(prev => prev.map(e => e.id === id ? newItem : e));
      addToast(t('messages.transactionUpdated'), 'success');
    } catch (e) {
      addToast(t('messages.error'), 'error');
    }
  }, [addToast, t]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await apiDeleteTransaction(id);
      setTransactions(prev => prev.filter(e => e.id !== id));
      addToast(t('messages.transactionDeleted'), 'info');
    } catch (e) {
      addToast(t('messages.error'), 'error');
    }
  }, [addToast, t]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      loading,
      error,
      categories,
      catError,
      typeFilter,
      setTypeFilter,
      totalIncome,
      totalExpense,
      net,
      hasMixedCurrencies,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      reloadTransactions,
      reloadCategories,
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionContext);
}
