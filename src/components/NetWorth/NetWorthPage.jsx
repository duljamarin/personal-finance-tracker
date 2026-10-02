import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import { Plus, Pencil, Trash2, Landmark, CreditCard, Wallet } from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';
import AssetForm from './AssetForm';
import NetWorthChart from './NetWorthChart';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../context/TransactionContext';
import { fetchAssets, addAsset, updateAsset, deleteAsset, fetchNetWorthHistory } from '../../utils/api';
import { useFormModal } from '../../hooks/useFormModal';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

export default function NetWorthPage() {
  const { t } = useTranslation();
  const { format: formatCurrency } = useDisplayCurrency();
  const { addToast } = useToast();
  const { transactions } = useTransactions();
  const [assets, setAssets] = useState([]);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const cashFlow = useMemo(() => {
    const income = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    const expenses = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);
  const { isOpen: showModal, editingItem: editAsset, openAdd: handleAdd, openEdit: handleEdit, close: closeAssetModal } = useFormModal();
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, historyData] = await Promise.all([
        fetchAssets(),
        fetchNetWorthHistory(),
      ]);
      setAssets(assetsData);
      setNetWorthHistory(historyData);
    } catch (error) {
      console.error('Error loading net worth data:', error);
      addToast(t('networth.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editAsset) {
        await updateAsset(editAsset.id, data);
        addToast(t('networth.assetUpdated'), 'success');
      } else {
        await addAsset(data);
        addToast(t('networth.assetAdded'), 'success');
      }
      closeAssetModal();
      loadData();
    } catch (error) {
      console.error('Error saving asset:', error);
      addToast(t('networth.saveError'), 'error');
    }
  };

  const handleDelete = (id) => {
    setAssetToDelete(id);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAsset(assetToDelete);
      addToast(t('networth.assetDeleted'), 'success');
      setAssetToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      addToast(t('networth.deleteError'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={t('messages.loading')} />;
  }

  // Calculate totals
  const totalAssets = assets
    .filter(a => a.type === 'asset')
    .reduce((sum, a) => sum + (a.current_value || 0), 0);

  const totalLiabilities = assets
    .filter(a => a.type === 'liability')
    .reduce((sum, a) => sum + (a.current_value || 0), 0);

  const assetsWithCashFlow = totalAssets + cashFlow.net;
  const netWorth = assetsWithCashFlow - totalLiabilities;

  // Assets/liabilities are stored in the user's single currency, like every
  // other amount, so they render through the same formatter.
  const fmt = (v) => formatCurrency(Math.abs(v));

  const assetRows = assets.filter(a => a.type === 'asset');
  const liabilityRows = assets.filter(a => a.type === 'liability');

  const rowActions = (item) => (
    <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
      <button
        onClick={() => handleEdit(item)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-ink-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
        aria-label={t('networth.editAsset')}
        title={t('networth.editAsset')}
      >
        <Pencil className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <button
        onClick={() => handleDelete(item.id)}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-expense dark:hover:text-expense hover:bg-expense/5 transition-colors"
        aria-label={t('networth.deleteAsset')}
        title={t('networth.deleteAsset')}
      >
        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );

  const ledger = ({ title, total, totalTone, rows, typeKey, Glyph, empty, leading }) => (
    <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline">
        <h2 className="text-heading text-ink-primary dark:text-white">{title}</h2>
        <span className={`text-sm font-semibold tabular-nums ${totalTone}`}>{total}</span>
      </div>
      <ul className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
        {leading}
        {rows.map(item => (
          <li key={item.id} className="group flex items-center gap-3 px-4 sm:px-5 py-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-ink-muted dark:text-white/70" aria-hidden="true">
              <Glyph className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-primary dark:text-white [overflow-wrap:anywhere]">{item.name}</p>
              <p className="text-xs text-ink-muted dark:text-white">{t(`networth.${typeKey}.${item.asset_type}`)}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-ink-primary dark:text-white">
              {formatCurrency(item.current_value)}
            </span>
            {rowActions(item)}
          </li>
        ))}
      </ul>
      {rows.length === 0 && !leading && (
        <p className="px-4 sm:px-5 py-8 text-center text-sm text-ink-muted dark:text-white">{empty}</p>
      )}
      {rows.length === 0 && leading && (
        <p className="px-4 sm:px-5 py-4 text-sm text-ink-muted dark:text-white border-t border-surface-hairline dark:border-surface-dark-hairline">{empty}</p>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('networth.title')}
        className="!mb-0"
        actions={
          <Button onClick={handleAdd}>
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              {t('networth.addAsset')}
            </span>
          </Button>
        }
      />

      {/* Hero: the one number, its two components, then the history */}
      <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="min-w-0">
            <p className="eyebrow">{t('networth.netWorth')}</p>
            <p className={`mt-2 [overflow-wrap:anywhere] text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight leading-none ${netWorth < 0 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
              {netWorth < 0 ? '-' : ''}{fmt(netWorth)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <dt className="eyebrow">{t('networth.totalAssets')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-brand-600 dark:text-brand-400">{fmt(assetsWithCashFlow)}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('networth.totalLiabilities')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-expense">{fmt(totalLiabilities)}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
          <h2 className="text-sm font-medium text-ink-primary dark:text-white mb-3">{t('networth.historyChart')}</h2>
          <NetWorthChart data={netWorthHistory} transactions={transactions} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {ledger({
          title: t('networth.assets'),
          total: fmt(assetsWithCashFlow),
          totalTone: 'text-ink-primary dark:text-white',
          rows: assetRows,
          typeKey: 'assetTypes',
          Glyph: Landmark,
          empty: t('networth.noAssets'),
          // Tracked cash is part of the asset side of the sum; show it as a
          // read-only line so the total above is explainable.
          leading: (
            <li className="flex items-center gap-3 px-4 sm:px-5 py-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-surface-subtle dark:bg-surface-dark-subtle text-ink-muted dark:text-white/70" aria-hidden="true">
                <Wallet className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary dark:text-white">{t('networth.cashBalance')}</p>
                <p className="text-xs text-ink-muted dark:text-white">{t('networth.cashFlowDesc')}</p>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${cashFlow.net < 0 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
                {cashFlow.net < 0 ? '-' : ''}{fmt(cashFlow.net)}
              </span>
              {/* Same width as the edit/delete pair on editable rows, so amounts align. */}
              <span className="w-[66px] -mr-1.5 shrink-0" aria-hidden="true" />
            </li>
          ),
        })}
        {ledger({
          title: t('networth.liabilities'),
          total: fmt(totalLiabilities),
          totalTone: 'text-expense',
          rows: liabilityRows,
          typeKey: 'liabilityTypes',
          Glyph: CreditCard,
          empty: t('networth.noLiabilities'),
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          onClose={closeAssetModal}
        >
          <h2 className="font-display text-title text-ink-primary dark:text-white mb-6">
            {editAsset ? t('networth.editAsset') : t('networth.addAsset')}
          </h2>
          <AssetForm
            initial={editAsset}
            onSubmit={handleSubmit}
            onCancel={closeAssetModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {assetToDelete && (
        <ConfirmDeleteModal
          title={t('networth.deleteAsset')}
          message={t('networth.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setAssetToDelete(null)}
          confirmLabel={t('forms.submit')}
          cancelLabel={t('forms.cancel')}
          deleting={deleting}
        />
      )}
    </div>
  );
}
