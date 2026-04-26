import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../UI/Input';
import Button from '../UI/Button';
import CustomSelect from '../UI/CustomSelect';

const inputBaseClass =
  'w-full px-3 py-2 text-sm rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';

const TYPE_ICONS = {
  cash: ['M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'],
  checking: ['M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'],
  savings: ['M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  investment: ['M3 17L9 11l4 3 8-8', 'M14 6l7 0 0 7'],
  retirement: ['M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.364 5.636l.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z'],
  real_estate: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  vehicle: ['M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z', 'M5 17H3v-6l2-5h12l2 5v6h-2'],
  crypto: ['M12 2l7 4v6c0 4.418-3.134 8.573-7 9.95C8.134 20.573 5 16.418 5 12V6l7-4z'],
  other: ['M5 12h14', 'M12 5l7 7-7 7'],
  credit_card: ['M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'],
  mortgage: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  car_loan: ['M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z', 'M5 17H3v-6l2-5h12l2 5v6h-2'],
  student_loan: ['M12 14l9-5-9-5-9 5 9 5z', 'M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z'],
  personal_loan: ['M16 7a4 4 0 11-8 0 4 4 0 018 0z', 'M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
  medical_debt: ['M12 6v4m0 0v4m0-4h4m-4 0H8m13 2a9 9 0 11-18 0 9 9 0 0118 0z'],
  other_debt: ['M5 12h14', 'M12 5l7 7-7 7'],
};

function TypeIcon({ typeKey }) {
  const paths = TYPE_ICONS[typeKey];
  if (!paths) return null;
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

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
        <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1">
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
        <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1">
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
              className="mr-2 accent-brand-600"
            />
            <span className="text-ink-primary dark:text-ink-dark-primary">{t('networth.asset')}</span>
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
              className="mr-2 accent-brand-600"
            />
            <span className="text-ink-primary dark:text-ink-dark-primary">{t('networth.liability')}</span>
          </label>
        </div>
      </div>

      {/* Asset Type */}
      <div>
        <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1">
          {type === 'asset' ? t('networth.assetTypeLabel') : t('networth.liabilityTypeLabel')}
        </label>
        <CustomSelect
          value={assetType}
          onChange={(value) => setAssetType(value)}
          ariaLabel={type === 'asset' ? t('networth.assetTypeLabel') : t('networth.liabilityTypeLabel')}
          options={(type === 'asset' ? assetTypes : liabilityTypes).map(typeKey => ({
            value: typeKey,
            label: t(`networth.${type === 'asset' ? 'assetTypes' : 'liabilityTypes'}.${typeKey}`),
            leading: (
              <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                <TypeIcon typeKey={typeKey} />
              </span>
            ),
          }))}
        />
      </div>

      {/* Current Value */}
      <div>
        <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1">
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
        <label className="block text-sm font-medium text-ink-primary dark:text-ink-dark-primary mb-1">
          {t('networth.notesLabel')} {t('transactions.tagsOptional')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('networth.notesPlaceholder')}
          className={inputBaseClass}
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
