import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useSubscription } from './SubscriptionContext';
import { useCrypto } from './CryptoContext';
import { fetchTransactions, addTransaction as apiAddTransaction, updateTransaction as apiUpdateTransaction, deleteTransaction as apiDeleteTransaction, fetchCategories, processRecurringTransactions } from '../utils/api';

const TransactionContext = createContext();

// A tab left open re-checks for due recurring entries when it becomes visible
// again, at most this often.
const RECURRING_RECHECK_MS = 30 * 60 * 1000;

export function TransactionProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const { refreshSubscription } = useSubscription();
  const { unlockEpoch = 0, migrationEpoch = 0, status: cryptoStatus } = useCrypto();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [catError, setCatError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  // Increments on every mutation so consumers can use it as a stable onReloadTrigger
  const [mutationCount, setMutationCount] = useState(0);

  const totalIncome = useMemo(
    () => transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0),
    [transactions]
  );
  const net = totalIncome - totalExpense;

  const reloadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions();
      setTransactions(Array.isArray(data) ? data : []);
      refreshSubscription();
    } catch (e) {
      console.error('❌ Error loading transactions:', e);
      setError(t('messages.error'));
    } finally {
      setLoading(false);
    }
  }, [t, refreshSubscription]);

  const reloadCategories = useCallback(async () => {
    setCatError(null);
    try {
      const cats = await fetchCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      console.error('❌ Error loading categories:', e);
      setCatError('Failed to load categories');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.id) {
      reloadTransactions();
      reloadCategories();
    } else {
      setTransactions([]);
      setCategories([]);
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  // Re-fetch once the user unlocks encryption after a restored session
  // (initial load rendered locked placeholders) and when a background
  // encryption migration finishes. mutationCount is bumped too, so every
  // consumer that re-fetches on it (dashboard budgets, health, goals, coming
  // up) replaces its placeholders as well; before, only this list reloaded
  // and the dashboard tiles stayed empty until a page refresh.
  const cryptoEpoch = unlockEpoch + migrationEpoch;
  const lastCryptoEpochRef = useRef(cryptoEpoch);
  useEffect(() => {
    if (lastCryptoEpochRef.current === cryptoEpoch) return;
    lastCryptoEpochRef.current = cryptoEpoch;
    if (!user?.id) return;
    reloadTransactions();
    reloadCategories();
    setMutationCount((c) => c + 1);
  }, [cryptoEpoch, user?.id, reloadTransactions, reloadCategories]);

  // ── Recurring entries post themselves ────────────────────────────────────
  // Due instances are created client-side (amounts are encrypted, the server
  // cannot), so this runs as soon as the app can write: once per signed-in
  // session when the key is ready ('unlocked', or 'off' without encryption),
  // and again when the tab comes back after RECURRING_RECHECK_MS. Every page
  // (dashboard included) then sees rent and salary without visiting
  // Transactions first. Never while 'loading' or 'locked': encryptRow refuses
  // to write without the key.
  const cryptoReady = cryptoStatus === 'unlocked' || cryptoStatus === 'off';
  const recurringRunRef = useRef({ userId: null, at: 0 });
  const runRecurring = useCallback(async () => {
    recurringRunRef.current.at = Date.now();
    try {
      const result = await processRecurringTransactions();
      if (result?.generated > 0) {
        addToast(t('recurring.generatedToast', { count: result.generated }), 'success');
        await reloadTransactions();
        setMutationCount((c) => c + 1);
      }
    } catch (e) {
      console.error('Error processing recurring transactions:', e);
    }
  }, [addToast, t, reloadTransactions]);
  const runRecurringRef = useRef(runRecurring);
  useEffect(() => { runRecurringRef.current = runRecurring; }, [runRecurring]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { recurringRunRef.current = { userId: null, at: 0 }; return; }
    if (!cryptoReady || recurringRunRef.current.userId === user.id) return;
    recurringRunRef.current.userId = user.id;
    runRecurringRef.current();
  }, [authLoading, user?.id, cryptoReady]);

  useEffect(() => {
    if (!user?.id || !cryptoReady) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - recurringRunRef.current.at < RECURRING_RECHECK_MS) return;
      runRecurringRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id, cryptoReady]);

  // options.successMessage lets the caller word the toast (quick-add sheet:
  // "Saved: {title} {amount}"). Resolves true on success, false on failure.
  const addTransaction = useCallback(async (item, options = {}) => {
    try {
      const newItem = await apiAddTransaction(item);
      setTransactions(prev => [newItem, ...prev]);
      setMutationCount(c => c + 1);
      addToast(options.successMessage || t('messages.transactionAdded'), 'success');
      refreshSubscription();
      return true;
    } catch (e) {
      if (e?.code === 'P0001' || e?.message?.includes('transaction limit')) {
        addToast(t('upgrade.transactionLimitReached'), 'warning');
      } else {
        addToast(t('messages.error'), 'error');
      }
      return false;
    }
  }, [addToast, t, refreshSubscription]);

  const updateTransaction = useCallback(async (id, updated) => {
    try {
      const newItem = await apiUpdateTransaction(id, updated);
      setTransactions(prev => prev.map(e => e.id === id ? newItem : e));
      setMutationCount(c => c + 1);
      addToast(t('messages.transactionUpdated'), 'success');
    } catch (e) {
      addToast(t('messages.error'), 'error');
    }
  }, [addToast, t]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await apiDeleteTransaction(id);
      setTransactions(prev => prev.filter(e => e.id !== id));
      setMutationCount(c => c + 1);
      addToast(t('messages.transactionDeleted'), 'info');
      refreshSubscription();
    } catch (e) {
      addToast(t('messages.error'), 'error');
    }
  }, [addToast, t, refreshSubscription]);

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
      mutationCount,
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
