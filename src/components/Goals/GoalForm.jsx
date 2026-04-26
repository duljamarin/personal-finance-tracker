import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';

const GOAL_TYPE_ICONS = {
  savings: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18h-2v1.93A8.001 8.001 0 0 1 4.07 13H6v-2H4.07A8.001 8.001 0 0 1 11 4.07V6h2V4.07A8.001 8.001 0 0 1 19.93 11H18v2h1.93A8.001 8.001 0 0 1 13 19.93zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
    </svg>
  ),
  debt_payoff: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" />
    </svg>
  ),
  investment: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 L9 11 L13 14 L21 6" /><path d="M14 6 L21 6 L21 13" />
    </svg>
  ),
  purchase: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
};

export default function GoalForm({ goal, onSave, onClose }) {
  const { t } = useTranslation();
  const isEditing = !!goal;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    goalType: 'savings',
    priority: 2,
    color: '#168b78'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        description: goal.description || '',
        targetAmount: goal.target_amount || '',
        targetDate: goal.target_date || '',
        goalType: goal.goal_type || 'savings',
        priority: goal.priority || 2,
        color: goal.color || '#168b78'
      });
    }
  }, [goal]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('forms.required');
    }
    if (!formData.targetAmount || formData.targetAmount <= 0) {
      newErrors.targetAmount = t('transactions.amountError');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      targetAmount: parseFloat(formData.targetAmount),
      targetDate: formData.targetDate || null,

      goalType: formData.goalType,
      priority: formData.priority,
      color: formData.color
    });
  };

  const goalTypes = ['savings', 'debt_payoff', 'investment', 'purchase'];
  const priorities = [
    { value: 1, label: t('goals.priority.high') },
    { value: 2, label: t('goals.priority.medium') },
    { value: 3, label: t('goals.priority.low') }
  ];

  const colors = [
    '#168b78', '#0ea5a3', '#d97706', '#e05c6b',
    '#7c4ddc', '#c2519c', '#0891b2', '#65a30d'
  ];

  return (
    <Modal onClose={onClose} drawer>
      <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary mb-6">
        {isEditing ? t('goals.editGoal') : t('goals.addGoal')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('goals.form.name')}
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('goals.form.namePlaceholder')}
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-1">
            {t('goals.form.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('goals.form.descriptionPlaceholder')}
            rows="3"
            className="w-full px-3 py-2 border border-surface-hairline dark:border-surface-dark-hairline rounded-md focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary"
          />
        </div>

        <Input
          label={t('goals.form.targetAmount')}
          type="number"
          step="0.01"
          min="0"
          value={formData.targetAmount}
          onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
          placeholder="0.00"
          error={errors.targetAmount}
          required
        />

        <Input
          label={t('goals.form.targetDate')}
          type="date"
          value={formData.targetDate}
          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
          helperText={t('goals.form.targetDateOptional')}
        />

        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-2">
            {t('goals.form.goalType')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {goalTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, goalType: type })}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border font-medium text-sm transition-colors ${
                  formData.goalType === type
                    ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-500 text-brand-700 dark:text-brand-300'
                    : 'bg-white dark:bg-surface-dark-card border-surface-hairline dark:border-surface-dark-hairline text-ink-secondary dark:text-ink-dark-secondary hover:border-brand-300 dark:hover:border-brand-700'
                }`}
              >
                <span className={`flex-shrink-0 ${formData.goalType === type ? 'text-brand-600 dark:text-brand-400' : 'text-ink-muted dark:text-ink-dark-muted'}`}>
                  {GOAL_TYPE_ICONS[type]}
                </span>
                {t(`goals.types.${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-1">
            {t('goals.form.priority')}
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-surface-hairline dark:border-surface-dark-hairline rounded-md appearance-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary"
          >
            {priorities.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-2">
            {t('goals.form.color')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-10 h-10 rounded-full transition ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-brand-500' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1">
            {t('goals.form.save')}
          </Button>
          <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
            {t('goals.form.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
