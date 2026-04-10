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
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {t('goals.contributions.add')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {goal.name}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setAction('add')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              action === 'add'
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700'
            }`}
          >
            {t('goals.contributions.add')}
          </button>
          <button
            type="button"
            onClick={() => setAction('withdraw')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              action === 'withdraw'
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700'
            }`}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('goals.contributions.note')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('goals.contributions.notePlaceholder')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
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
