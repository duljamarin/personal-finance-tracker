import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import { Pencil, Trash2, Landmark, CreditCard, Wallet } from 'lucide-react';
import Card from '../UI/Card';
import { useCountUp } from '../../hooks/useCountUp';
import { MINUS, linePath } from '../../utils/bento';
import { dataDelay, delayStyle } from '../../utils/motion';
import LoadingSpinner from '../UI/LoadingSpinner';
import AssetForm from './AssetForm';
import NetWorthChart, { buildNetWorthSeries } from './NetWorthChart';
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
  // Hero count-up (hooks must run before the loading early return).
  const netWorthTotal = useMemo(() => {
    const sum = (type) => assets.filter(a => a.type === type).reduce((s, a) => s + (a.current_value || 0), 0);
    return sum('asset') + cashFlow.net - sum('liability');
  }, [assets, cashFlow]);
  const netWorthShown = useCountUp(netWorthTotal, { delay: dataDelay(0) });
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
  const heroValues = buildNetWorthSeries(netWorthHistory, transactions).slice(-8).map((p) => p.netWorth);
  const heroLine = linePath(heroValues);

  // Assets/liabilities are stored in the user's single currency, like every
  // other amount, so they render through the same formatter.
  const fmt = (v) => formatCurrency(Math.abs(v));

  const assetRows = assets.filter(a => a.type === 'asset');
  const liabilityRows = assets.filter(a => a.type === 'liability');

  const iconBtn = 'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner-2';
  const rowActions = (item) => (
    <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
      <button type="button" onClick={() => handleEdit(item)} className={iconBtn} aria-label={t('networth.editAsset')} title={t('networth.editAsset')}>
        <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => handleDelete(item.id)} className={`${iconBtn} hover:text-danger`} aria-label={t('networth.deleteAsset')} title={t('networth.deleteAsset')}>
        <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );

  const ledger = ({ title, total, totalTone, rows, typeKey, Glyph, empty, leading, index }) => (
    <Card as="section" index={index} padding="sm">
      <div className="flex items-baseline justify-between gap-3 px-3 pb-2">
        <h2 className="text-h3 font-bold text-fg">{title}</h2>
        <span className={`text-h3 font-extrabold tabular-nums ${totalTone}`}>{total}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {leading}
        {rows.map(item => (
          <li key={item.id} className="activity-row group flex items-center gap-[14px] p-3 rounded-icon">
            <span className="activity-icon w-12 h-12 rounded-icon flex items-center justify-center shrink-0 bg-inner text-brand-text" aria-hidden="true">
              <Glyph className="w-[22px] h-[22px]" strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-fg [overflow-wrap:anywhere]">{item.name}</p>
              <p className="text-sm font-semibold text-fg">{t(`networth.${typeKey}.${item.asset_type}`)}</p>
            </div>
            <span className="text-h3 font-extrabold tabular-nums text-fg">
              {formatCurrency(item.current_value)}
            </span>
            {rowActions(item)}
          </li>
        ))}
      </ul>
      {rows.length === 0 && !leading && (
        <p className="tile-inner mt-1 px-4 py-8 text-center text-base font-semibold text-fg">{empty}</p>
      )}
      {rows.length === 0 && leading && (
        <p className="px-3 py-3 text-base font-semibold text-fg">{empty}</p>
      )}
    </Card>
  );

  return (
    <div className="space-y-gap">
      <PageHeader
        title={t('networth.title')}
        className="!mb-0"
        actions={
          <Button onClick={handleAdd} leading="plus" type="button">
            {t('networth.addAsset')}
          </Button>
        }
      />

      {/* Hero (spec 4.4): net worth kpi, assets / liabilities chips and the
          net-worth line from the same series as the history chart. */}
      <Card variant="hero" index={0} className="flex flex-col gap-[14px] overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-gap">
          <div className="min-w-0">
            <p className="text-sm font-bold">{t('networth.netWorth')}</p>
            <p className="mt-1 [overflow-wrap:anywhere] text-kpi font-extrabold tabular-nums">
              {netWorthShown < 0 ? MINUS : ''}{fmt(netWorthShown)}
            </p>
          </div>
          <dl className="flex flex-wrap gap-2.5">
            <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset">
              <dt className="text-sm font-semibold">{t('networth.totalAssets')}</dt>
              <dd className="text-h3 font-extrabold tabular-nums">{fmt(assetsWithCashFlow)}</dd>
            </div>
            <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset">
              <dt className="text-sm font-semibold">{t('networth.totalLiabilities')}</dt>
              <dd className="text-h3 font-extrabold tabular-nums">{fmt(totalLiabilities)}</dd>
            </div>
          </dl>
        </div>
        {heroLine && (
          <svg role="img" aria-label={t('networth.historyChart')} width="100%" height="120" viewBox="0 0 600 120" preserveAspectRatio="none" className="block">
            <path d={`${heroLine} L600 120 L0 120 Z`} className="animate-fade-in" style={{ fill: 'var(--hero-area)', ...delayStyle(dataDelay(0) + 300) }} />
            <path
              d={heroLine}
              fill="none"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              className="animate-draw"
              style={{ stroke: 'var(--white)', strokeDashoffset: 0, '--len': 1, ...delayStyle(dataDelay(0)) }}
            />
          </svg>
        )}
      </Card>

      <Card index={1}>
        <h2 className="text-h3 font-bold text-fg mb-gap">{t('networth.historyChart')}</h2>
        <NetWorthChart data={netWorthHistory} transactions={transactions} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gap items-start">
        {ledger({
          title: t('networth.assets'),
          total: fmt(assetsWithCashFlow),
          totalTone: 'text-fg',
          rows: assetRows,
          typeKey: 'assetTypes',
          Glyph: Landmark,
          empty: t('networth.noAssets'),
          index: 2,
          // Tracked cash is part of the asset side of the sum; show it as a
          // read-only line so the total above is explainable.
          leading: (
            <li className="flex items-center gap-[14px] p-3 rounded-icon bg-inner">
              <span className="w-12 h-12 rounded-icon flex items-center justify-center shrink-0 bg-tile text-brand-text" aria-hidden="true">
                <Wallet className="w-[22px] h-[22px]" strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-fg">{t('networth.cashBalance')}</p>
                <p className="text-sm font-semibold text-fg">{t('networth.cashFlowDesc')}</p>
              </div>
              <span className="text-h3 font-extrabold tabular-nums text-fg">
                {cashFlow.net < 0 ? MINUS : ''}{fmt(cashFlow.net)}
              </span>
              {/* Same width as the edit/delete pair on editable rows, so amounts align. */}
              <span className="w-[90px] -mr-1.5 shrink-0 hidden sm:block" aria-hidden="true" />
            </li>
          ),
        })}
        {ledger({
          title: t('networth.liabilities'),
          total: fmt(totalLiabilities),
          totalTone: 'text-fg',
          index: 3,
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
          <h2 className="text-h3 font-bold text-fg pr-12 mb-gap">
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
