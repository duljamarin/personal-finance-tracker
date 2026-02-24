import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { getInputClassName } from '../../utils/classNames';

export default function TransactionSplitForm({ 
  totalAmount, 
  categories, 
  initialSplits = [], 
  onSplitsChange,
  errors = {}
}) {
  const { t, i18n } = useTranslation();
  const [splits, setSplits] = useState(
    initialSplits.length > 0 
      ? initialSplits 
      : [{ category_id: '', amount: '', percentage: '' }]
  );

  const handleAddSplit = () => {
    setSplits([...splits, { category_id: '', amount: '', percentage: '' }]);
  };

  const handleRemoveSplit = (index) => {
    if (splits.length <= 1) return;
    const newSplits = splits.filter((_, i) => i !== index);
    setSplits(newSplits);
    onSplitsChange?.(newSplits);
  };

  const handleSplitChange = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;

    // Auto-calculate percentage from amount
    if (field === 'amount' && totalAmount > 0) {
      const amount = parseFloat(value);
      if (!isNaN(amount)) {
        newSplits[index].percentage = ((amount / totalAmount) * 100).toFixed(2);
      }
    }

    // Auto-calculate amount from percentage
    if (field === 'percentage' && totalAmount > 0) {
      const percentage = parseFloat(value);
      if (!isNaN(percentage)) {
        newSplits[index].amount = ((percentage / 100) * totalAmount).toFixed(2);
      }
    }

    setSplits(newSplits);
    onSplitsChange?.(newSplits);
  };

  const getTotalSplitAmount = () => {
    return splits.reduce((sum, split) => {
      const amount = parseFloat(split.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  const getTotalPercentage = () => {
    return splits.reduce((sum, split) => {
      const pct = parseFloat(split.percentage);
      return sum + (isNaN(pct) ? 0 : pct);
    }, 0);
  };

  const totalSplitAmount = getTotalSplitAmount();
  const totalPercentage = getTotalPercentage();
  const splitDifference = totalAmount - totalSplitAmount;
  const hasValidSplit = Math.abs(splitDifference) < 0.01;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('split.title')}
        </label>
        <Button 
          type="button" 
          onClick={handleAddSplit} 
          variant="secondary" 
          size="sm"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('split.addSplit')}
        </Button>
      </div>

      <div className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        {splits.map((split, index) => (
          <div key={index} className="flex items-start gap-2">
            {/* Category */}
            <div className="flex-1">
              <select
                value={split.category_id}
                onChange={(e) => handleSplitChange(index, 'category_id', e.target.value)}
                className={getInputClassName(errors[`split_${index}_category`])}
              >
                <option value="">{t('transactions.selectCategory')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {translateCategoryName(cat.name, i18n.language)}
                  </option>
                ))}
              </select>
              {errors[`split_${index}_category`] && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {t(errors[`split_${index}_category`])}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="w-28">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={split.amount}
                onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                placeholder="0.00"
                error={errors[`split_${index}_amount`] && t(errors[`split_${index}_amount`])}
                className="text-sm"
              />
            </div>

            {/* Percentage */}
            <div className="w-20">
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={split.percentage}
                  onChange={(e) => handleSplitChange(index, 'percentage', e.target.value)}
                  placeholder="0"
                  className="text-sm pr-6"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  %
                </span>
              </div>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemoveSplit(index)}
              disabled={splits.length <= 1}
              className="mt-2 text-red-600 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-sm space-y-1 bg-gray-100 dark:bg-gray-700 p-3 rounded">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">{t('split.totalAmount')}:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            €{totalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">{t('split.splitTotal')}:</span>
          <span className={`font-medium ${hasValidSplit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            €{totalSplitAmount.toFixed(2)} ({totalPercentage.toFixed(2)}%)
          </span>
        </div>
        {!hasValidSplit && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('split.difference')}:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              €{Math.abs(splitDifference).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {!hasValidSplit && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {t('split.mustEqualTotal')}
        </p>
      )}
    </div>
  );
}
