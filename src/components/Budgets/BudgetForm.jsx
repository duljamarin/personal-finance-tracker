import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { translateCategoryName, getCategoryIcon } from '../../utils/categoryTranslation';
import { CategoryIconSvg } from '../UI/CategoryIconSvg';
import CustomSelect from '../UI/CustomSelect';

export default function BudgetForm({ budget, availableCategories, onSave, onClose }) {
  const { t } = useTranslation();
  const isEditing = !!budget;

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (budget) {
      setCategoryId(budget.category_id);
      setAmount(String(budget.amount));
    }
  }, [budget]);

  const validate = () => {
    const newErrors = {};
    if (!isEditing && !categoryId) {
      newErrors.category = t('budgets.form.categoryError');
    }
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = t('budgets.form.amountError');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEditing) {
      onSave({ amount: parseFloat(amount) });
    } else {
      onSave({ categoryId, amount: parseFloat(amount) });
    }
  };

  return (
    <Modal onClose={onClose} drawer>
      <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary mb-6">
        {isEditing ? t('budgets.editBudget') : t('budgets.addBudget')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-1">
              {t('budgets.form.category')}
            </label>
            <p className="px-3 py-2 bg-surface-subtle dark:bg-surface-dark-subtle rounded-md text-ink-secondary dark:text-ink-dark-secondary">
              {translateCategoryName(budget.category?.name || '')}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-1">
              {t('budgets.form.category')}
            </label>
            <CustomSelect
              value={categoryId}
              onChange={(value) => { setCategoryId(value); setErrors(prev => ({ ...prev, category: undefined })); }}
              disabled={availableCategories.length === 0}
              error={!!errors.category}
              placeholder={
                availableCategories.length === 0
                  ? t('budgets.form.noCategoriesAvailable')
                  : t('budgets.form.categoryPlaceholder')
              }
              ariaLabel={t('budgets.form.category')}
              options={availableCategories.map(cat => {
                const iconKey = getCategoryIcon(cat);
                return {
                  value: cat.id,
                  label: translateCategoryName(cat.name),
                  leading: (
                    <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                      <CategoryIconSvg iconKey={iconKey || 'Shopping'} className="w-3.5 h-3.5" />
                    </span>
                  ),
                };
              })}
            />
            {errors.category && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {errors.category}
              </p>
            )}
          </div>
        )}

        <Input
          label={t('budgets.form.amount')}
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setErrors(prev => ({ ...prev, amount: undefined })); }}
          placeholder="0.00"
          error={errors.amount}
          required
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {t('forms.save')}
          </Button>
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            {t('forms.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
