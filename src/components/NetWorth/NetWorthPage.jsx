import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import AssetForm from './AssetForm';
import NetWorthChart from './NetWorthChart';
import { useToast } from '../../context/ToastContext';
import { useSubscription } from '../../context/SubscriptionContext';
import PremiumFeatureLock from '../Subscription/PremiumFeatureLock';
import { fetchAssets, addAsset, updateAsset, deleteAsset, fetchNetWorthHistory } from '../../utils/api';
import { CURRENCY_SYMBOLS } from '../../utils/constants';

export default function NetWorthPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isPremium, isTrialing } = useSubscription();
  const [assets, setAssets] = useState([]);
  const [netWorthHistory, setNetWorthHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAsset, setEditAsset] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, historyData] = await Promise.all([
        fetchAssets(),
        fetchNetWorthHistory()
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

  const handleAdd = () => {
    setEditAsset(null);
    setShowModal(true);
  };

  const handleEdit = (asset) => {
    setEditAsset(asset);
    setShowModal(true);
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
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving asset:', error);
      addToast(t('networth.saveError'), 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('networth.deleteConfirm'))) return;
    
    try {
      await deleteAsset(id);
      addToast(t('networth.assetDeleted'), 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      addToast(t('networth.deleteError'), 'error');
    }
  };

  if (!isPremium && !isTrialing) {
    return <PremiumFeatureLock feature={t('networth.title')} />;
  }

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
    
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('networth.title')}
        </h1>
        <Button onClick={handleAdd}>
          {t('networth.addAsset')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('networth.totalAssets')}
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {CURRENCY_SYMBOLS.EUR}{totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('networth.totalLiabilities')}
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {CURRENCY_SYMBOLS.EUR}{totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('networth.netWorth')}
          </div>
          <div className={`text-3xl font-bold ${
            netWorth >= 0 
              ? 'text-indigo-600 dark:text-indigo-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {CURRENCY_SYMBOLS.EUR}{netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Chart */}
      {netWorthHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('networth.historyChart')}
          </h2>
          <NetWorthChart data={netWorthHistory} />
        </Card>
      )}

      {/* Assets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assets */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('networth.assets')} ({assets.filter(a => a.type === 'asset').length})
          </h2>
          <div className="space-y-3">
            {assets.filter(a => a.type === 'asset').map(asset => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {asset.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {{
                      cash: '💵', checking: '🏦', savings: '🐷', investment: '📈',
                      retirement: '🏖️', real_estate: '🏠', vehicle: '🚗', crypto: '🪙', other: '📦'
                    }[asset.asset_type] || '📦'} {t(`networth.assetTypes.${asset.asset_type}`)}
                  </div>
                </div>
                <div className="text-right mr-4">
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {CURRENCY_SYMBOLS.EUR}{asset.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(asset)}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {assets.filter(a => a.type === 'asset').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('networth.noAssets')}
              </p>
            )}
          </div>
        </Card>

        {/* Liabilities */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('networth.liabilities')} ({assets.filter(a => a.type === 'liability').length})
          </h2>
          <div className="space-y-3">
            {assets.filter(a => a.type === 'liability').map(liability => (
              <div
                key={liability.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {liability.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {{
                      credit_card: '💳', mortgage: '🏛️', car_loan: '🚘', student_loan: '🎓',
                      personal_loan: '💸', medical_debt: '🏥', other_debt: '📋'
                    }[liability.asset_type] || '📋'} {t(`networth.liabilityTypes.${liability.asset_type}`)}
                  </div>
                </div>
                <div className="text-right mr-4">
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {CURRENCY_SYMBOLS.EUR}{liability.current_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(liability)}
                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(liability.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {assets.filter(a => a.type === 'liability').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('networth.noLiabilities')}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {editAsset ? t('networth.editAsset') : t('networth.addAsset')}
          </h2>
          <AssetForm
            initial={editAsset}
            onSubmit={handleSubmit}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
