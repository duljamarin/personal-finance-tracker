import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';

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
    color: '#3B82F6'
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
        color: goal.color || '#3B82F6'
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
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  return (
    <Modal onClose={onClose} drawer>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('goals.form.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('goals.form.descriptionPlaceholder')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('goals.form.goalType')}
          </label>
          <select
            value={formData.goalType}
            onChange={(e) => setFormData({ ...formData, goalType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            {goalTypes.map(type => (
              <option key={type} value={type}>
                {t(`goals.types.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('goals.form.priority')}
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            {priorities.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('goals.form.color')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-10 h-10 rounded-full transition ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
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
