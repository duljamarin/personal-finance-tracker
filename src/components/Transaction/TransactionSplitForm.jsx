import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import Input from '../UI/Input';
import CustomSelect from '../UI/CustomSelect';
import { translateCategoryName } from '../../utils/categoryTranslation';

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
        <label className="block text-sm font-medium text-ink-primary dark:text-white">
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

      <div className="space-y-2 bg-surface-subtle dark:bg-surface-dark-subtle p-3 rounded-lg">
        {splits.map((split, index) => (
          <div key={index} className={`flex items-center gap-2${index > 0 ? ' pt-2 border-t border-surface-hairline dark:border-surface-dark-hairline' : ''}`}>
            {/* Category */}
            <div className="flex-1 min-w-0">
              <CustomSelect
                value={split.category_id}
                onChange={(val) => handleSplitChange(index, 'category_id', val)}
                placeholder={t('transactions.selectCategory')}
                error={!!errors[`split_${index}_category`]}
                options={categories.map(cat => ({
                  value: cat.id,
                  label: translateCategoryName(cat.name, i18n.language),
                }))}
              />
              {errors[`split_${index}_category`] && (
                <p className="text-xs text-[#e8394d] mt-1">
                  {t(errors[`split_${index}_category`])}
                </p>
              )}
            </div>

            {/* Amount — use inline border class for error, not Input's error prop (avoids ! icon) */}
            <div className="w-24 shrink-0">
              <input
                type="number"
                step="0.01"
                min="0"
                value={split.amount}
                onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                placeholder="0.00"
                className={
                  'w-full py-3 px-3.5 text-sm rounded-md border bg-white dark:bg-surface-dark-card ' +
                  'text-ink-primary dark:text-white ' +
                  'placeholder:text-ink-muted/40 dark:placeholder:text-white/40 ' +
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors ' +
                  (errors[`split_${index}_amount`]
                    ? 'border-[#e8394d]'
                    : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40')
                }
              />
              {errors[`split_${index}_amount`] && (
                <p className="text-xs text-[#e8394d] mt-1">
                  {t(errors[`split_${index}_amount`])}
                </p>
              )}
            </div>

            {/* Percentage — suffix outside Input to avoid padding clash */}
            <div className="w-20 shrink-0 flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={split.percentage}
                onChange={(e) => handleSplitChange(index, 'percentage', e.target.value)}
                placeholder="0"
                className="text-sm"
              />
              <span className="text-xs text-ink-muted/60 dark:text-white/60 select-none shrink-0">%</span>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={() => handleRemoveSplit(index)}
              disabled={splits.length <= 1}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="text-sm space-y-1 bg-surface-subtle dark:bg-surface-dark-elevated p-3 rounded">
        <div className="flex justify-between">
          <span className="text-ink-secondary dark:text-white">{t('split.totalAmount')}:</span>
          <span className="font-medium text-ink-primary dark:text-white">
            €{totalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-secondary dark:text-white">{t('split.splitTotal')}:</span>
          <span className={`font-medium ${hasValidSplit ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#e8394d]'}`}>
            €{totalSplitAmount.toFixed(2)} ({totalPercentage.toFixed(2)}%)
          </span>
        </div>
        {!hasValidSplit && (
          <div className="flex justify-between">
            <span className="text-ink-secondary dark:text-white">{t('split.difference')}:</span>
            <span className="font-medium text-[#e8394d]">
              €{Math.abs(splitDifference).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {!hasValidSplit && (
        <p className="text-xs text-[#e8394d]">
          {t('split.mustEqualTotal')}
        </p>
      )}
    </div>
  );
}
