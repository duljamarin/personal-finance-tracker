import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { getInputClassName } from '../../utils/classNames';

export default function AssetForm({ initial, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState(initial?.type || 'asset');
  const [assetType, setAssetType] = useState(initial?.asset_type || 'cash');
  const [currentValue, setCurrentValue] = useState(initial?.current_value ?? '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [errors, setErrors] = useState({});

  const assetTypes = [
    'cash', 'checking', 'savings', 'investment', 'retirement',
    'real_estate', 'vehicle', 'crypto', 'other'
  ];

  const liabilityTypes = [
    'credit_card', 'mortgage', 'car_loan', 'student_loan',
    'personal_loan', 'medical_debt', 'other_debt'
  ];

  const assetTypeEmojis = {
    cash:        '💵',
    checking:    '🏦',
    savings:     '🐷',
    investment:  '📈',
    retirement:  '🏖️',
    real_estate: '🏠',
    vehicle:     '🚗',
    crypto:      '🪙',
    other:       '📦',
  };

  const liabilityTypeEmojis = {
    credit_card:   '💳',
    mortgage:      '🏛️',
    car_loan:      '🚘',
    student_loan:  '🎓',
    personal_loan: '💸',
    medical_debt:  '🏥',
    other_debt:    '📋',
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'networth.nameError';
    if (!currentValue || isNaN(currentValue) || Number(currentValue) < 0) {
      newErrors.currentValue = 'networth.valueError';
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      type,
      asset_type: assetType,
      current_value: Number(currentValue),
      notes: notes.trim()
    });
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (errors.name && value.trim()) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleValueChange = (e) => {
    const value = e.target.value;
    setCurrentValue(value);
    if (errors.currentValue && value && !isNaN(value) && Number(value) >= 0) {
      setErrors(prev => ({ ...prev, currentValue: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('networth.nameLabel')}
        </label>
        <Input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder={t('networth.namePlaceholder')}
          error={errors.name ? t(errors.name) : undefined}
        />
      </div>

      {/* Type (Asset/Liability) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('networth.typeLabel')}
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="asset"
              checked={type === 'asset'}
              onChange={(e) => {
                setType(e.target.value);
                setAssetType('cash');
              }}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-white">{t('networth.asset')}</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="liability"
              checked={type === 'liability'}
              onChange={(e) => {
                setType(e.target.value);
                setAssetType('credit_card');
              }}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-white">{t('networth.liability')}</span>
          </label>
        </div>
      </div>

      {/* Asset Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {type === 'asset' ? t('networth.assetTypeLabel') : t('networth.liabilityTypeLabel')}
        </label>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className={getInputClassName()}
        >
          {(type === 'asset' ? assetTypes : liabilityTypes).map(typeKey => {
            const emojiMap = type === 'asset' ? assetTypeEmojis : liabilityTypeEmojis;
            return (
              <option key={typeKey} value={typeKey}>
                {emojiMap[typeKey]} {t(`networth.${type === 'asset' ? 'assetTypes' : 'liabilityTypes'}.${typeKey}`)}
              </option>
            );
          })}
        </select>
      </div>

      {/* Current Value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('networth.currentValueLabel')}
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={currentValue}
          onChange={handleValueChange}
          placeholder="0.00"
          error={errors.currentValue ? t(errors.currentValue) : undefined}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('networth.notesLabel')} {t('transactions.tagsOptional')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('networth.notesPlaceholder')}
          className={getInputClassName()}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" onClick={onCancel} variant="secondary">
          {t('common.cancel')}
        </Button>
        <Button type="submit">
          {initial ? t('forms.update') : t('forms.add')}
        </Button>
      </div>
    </form>
  );
}
