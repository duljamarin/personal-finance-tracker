import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { translateCategoryName } from '../../utils/categoryTranslation';

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
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        {isEditing ? t('budgets.editBudget') : t('budgets.addBudget')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budgets.form.category')}
            </label>
            <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
              {translateCategoryName(budget.category?.name || '')}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('budgets.form.category')}
            </label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setErrors(prev => ({ ...prev, category: undefined })); }}
              disabled={availableCategories.length === 0}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition ${
                errors.category
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">
                {availableCategories.length === 0
                  ? t('budgets.form.noCategoriesAvailable')
                  : t('budgets.form.categoryPlaceholder')}
              </option>
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {translateCategoryName(cat.name)}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
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
