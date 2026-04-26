import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';

export default function ContributionForm({ goal, onSave, onClose }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [action, setAction] = useState('add'); // 'add' or 'withdraw'

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!amount || numAmount <= 0) {
      setError(t('transactions.amountError'));
      return;
    }

    onSave({
      amount: numAmount,
      date,
      note: note.trim() || null,
      action,
    });
  };

  return (
    <Modal onClose={onClose} drawer>
      <h2 className="font-display font-semibold tracking-tight text-2xl text-ink-primary dark:text-ink-dark-primary mb-2">
        {t('goals.contributions.add')}
      </h2>
      <p className="text-ink-secondary dark:text-ink-dark-secondary mb-6">
        {goal.name}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action toggle */}
        <div className="flex rounded-md border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
          <button
            type="button"
            onClick={() => setAction('add')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              action === 'add'
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-surface-dark-card text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
            }`}
          >
            {t('goals.contributions.add')}
          </button>
          <button
            type="button"
            onClick={() => setAction('withdraw')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              action === 'withdraw'
                ? 'text-white'
                : 'bg-white dark:bg-surface-dark-card text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle'
            }`}
            style={action === 'withdraw' ? { backgroundColor: '#e05c6b' } : undefined}
          >
            {t('goals.contributions.withdraw')}
          </button>
        </div>

        <Input
          label={t('goals.contributions.amount')}
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          placeholder="0.00"
          error={error}
          required
        />

        <Input
          label={t('goals.contributions.date')}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div>
          <label className="block text-sm font-medium text-ink-secondary dark:text-ink-dark-secondary mb-1">
            {t('goals.contributions.note')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('goals.contributions.notePlaceholder')}
            rows="3"
            className="w-full px-3 py-2 border border-surface-hairline dark:border-surface-dark-hairline rounded-md focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-ink-dark-primary"
          />
        </div>

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
