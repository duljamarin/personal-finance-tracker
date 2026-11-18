import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import StatStrip from '../UI/StatStrip';
import EmptyState from '../UI/EmptyState';
import CategoryAvatar from '../UI/CategoryAvatar';
import { Pause, Play, Pencil, Trash2, ArrowRight, Repeat as RepeatIcon } from 'lucide-react';
import Card from '../UI/Card';
import { dataDelay, delayStyle, rowDelay } from '../../utils/motion';
import Modal from '../UI/Modal';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import { fetchRecurringTransactions, deleteRecurringTransaction, pauseRecurringTransaction, resumeRecurringTransaction, processRecurringTransactions } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useToast } from '../../context/ToastContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useCrypto } from '../../context/CryptoContext';
import { useFormModal } from '../../hooks/useFormModal';
import { getDateLocale } from '../../utils/date';
import RecurringForm from './RecurringForm';
import LoadingSpinner from '../UI/LoadingSpinner';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';

export default function RecurringPage() {
  const { t, i18n } = useTranslation();
  const { format: formatCurrency } = useDisplayCurrency();
  const dateLocale = getDateLocale(i18n.language);
  const fmtDate = (str) => {
    if (!str) return '-';
    return new Date(str).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const { addToast } = useToast();
  const { isPremium, recurringLimit } = useSubscription();
  const { status: cryptoStatus } = useCrypto();
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen: showModal, editingItem: editRecurring, openEdit: handleEdit, close: closeFormModal } = useFormModal();
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadRecurrings();
  }, []);

  // Re-fetch once encryption unlocks after a restored session — the initial
  // load may have raced ahead of unlock and rendered locked-placeholder titles.
  const prevCryptoStatusRef = useRef(cryptoStatus);
  useEffect(() => {
    const prev = prevCryptoStatusRef.current;
    prevCryptoStatusRef.current = cryptoStatus;
    if (prev === 'locked' && cryptoStatus === 'unlocked') {
      loadRecurrings();
    }
  }, [cryptoStatus]);

  async function loadRecurrings() {
    try {
      const data = await fetchRecurringTransactions();
      setRecurrings(data);
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
      addToast(t('recurring.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRecurringTransaction(id);
      addToast(t('recurring.deleted'), 'success');
      setDeleteConfirm(null);
      loadRecurrings();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      addToast(t('recurring.deleteError'), 'error');
    }
  }

  async function handleToggleActive(recurring) {
    try {
      if (recurring.is_active) {
        await pauseRecurringTransaction(recurring.id);
        addToast(t('recurring.paused'), 'success');
      } else {
        await resumeRecurringTransaction(recurring.id);
        addToast(t('recurring.resumed'), 'success');
      }
      loadRecurrings();
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      addToast(t('recurring.toggleError'), 'error');
    }
  }

  const getFrequencyText = (frequency, intervalCount) => {
    const count = intervalCount || 1;
    if (count === 1) {
      return t(`recurring.${frequency}`);
    }
    return t('recurring.every') + ' ' + count + ' ' + t(`recurring.${frequency}Unit`, { count });
  };

  if (loading) {
    return <LoadingSpinner size="md" className="min-h-[60vh]" />;
  }

  const activeRecurringCount = recurrings.filter((r) => r.is_active).length;

  // Rough per-month equivalent of each schedule, for the summary strip only.
  const PER_MONTH = { daily: 30.44, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };
  const monthly = recurrings
    .filter(r => r.is_active)
    .reduce((acc, r) => {
      const factor = (PER_MONTH[r.frequency] || 1) / (r.interval_count || 1);
      acc[r.type === 'income' ? 'income' : 'expense'] += (Number(r.amount) || 0) * factor;
      return acc;
    }, { income: 0, expense: 0 });
  const monthlyNet = monthly.income - monthly.expense;

  // Soonest first; paused schedules sink to the bottom.
  const sorted = [...recurrings].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return String(a.next_run_at || '').localeCompare(String(b.next_run_at || ''));
  });

  const iconBtn =
    'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner-2';

  return (
    <div className="space-y-gap">
      <PageHeader title={t('recurring.manageTitle')} subtitle={t('recurring.manageDescription')} className="!mb-0" />

      {/* Free plan usage counter. Counts ACTIVE templates only, matching both
          canCreateRecurring() and the check_recurring_limit trigger — pausing a
          template frees a slot, so the cap is concurrent, not cumulative. */}
      <FreePlanUsageCounter
        used={activeRecurringCount}
        limit={recurringLimit}
        labelKey="freePlanCounter.recurring"
      />

      {/* Free tier limit banner */}
      {!isPremium && activeRecurringCount >= recurringLimit && (
        <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-fg">
            {t('limits.recurringLimitReached', { limit: recurringLimit })}
          </p>
          <Link to="/pricing" className="group btn-motion btn-lift inline-flex items-center gap-2 min-h-11 px-5 rounded-pill bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold whitespace-nowrap">
            {t('upgrade.upgradeCta')}
            <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </Card>
      )}

      {recurrings.length === 0 ? (
        <EmptyState
          icon={<RepeatIcon className="w-[22px] h-[22px]" strokeWidth={2} />}
          title={t('recurring.noRecurring')}
          description={t('recurring.noRecurringDesc')}
        />
      ) : (
        <>
          <StatStrip
            variant="hero"
            index={0}
            items={[
              {
                label: t('recurring.monthlyCosts'),
                value: formatCurrency(monthly.expense),
                hero: true,
                note: t('recurring.netNote', { amount: formatCurrency(monthlyNet) }),
              },
              {
                label: t('recurring.monthlyIncome'),
                value: formatCurrency(monthly.income),
                tone: 'income',
                note: t('recurring.estimateNote'),
              },
              { label: t('recurring.activeCount'), value: activeRecurringCount },
            ]}
          />

          <Card as="section" index={1} padding="sm">
            <ul className="flex flex-col gap-1">
              {sorted.map(recurring => {
                const ends = recurring.end_date
                  ? t('recurring.endsOn', { date: fmtDate(recurring.end_date) })
                  : recurring.occurrences_limit
                    ? t('recurring.afterCount', { count: recurring.occurrences_limit })
                    : null;
                const meta = [
                  getFrequencyText(recurring.frequency, recurring.interval_count),
                  recurring.category?.name ? translateCategoryName(recurring.category.name) : null,
                  ends,
                  t('recurring.ranTimes', { count: recurring.occurrences_created || 0 }),
                ].filter(Boolean);

                return (
                  <li
                    key={recurring.id}
                    className={`activity-row animate-rise group flex items-center gap-[14px] p-3 rounded-icon ${recurring.is_active ? '' : 'bg-inner'}`}
                    style={delayStyle(rowDelay(sorted.indexOf(recurring), dataDelay(1)))}
                  >
                    <span className="activity-icon shrink-0">
                      <CategoryAvatar category={recurring.category} fallbackName={recurring.title} size="lg" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-extrabold text-fg [overflow-wrap:anywhere]">
                          {recurring.title}
                        </p>
                        {!recurring.is_active && (
                          <span className="shrink-0 inline-flex items-center h-[26px] px-2.5 rounded-pill bg-tile border border-line text-min font-bold text-fg">
                            {t('recurring.paused')}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-fg">{meta.join(' · ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-h3 font-extrabold tabular-nums ${recurring.type === 'income' ? 'text-brand-text' : 'text-fg'}`}>
                        {recurring.type === 'income' ? '+' : '−'}{formatCurrency(Number(recurring.amount))}
                      </p>
                      {recurring.is_active && recurring.next_run_at && (
                        <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
                          {t('recurring.next', { date: fmtDate(recurring.next_run_at) })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
                      <button
                        onClick={() => handleToggleActive(recurring)}
                        className={iconBtn}
                        aria-label={recurring.is_active ? t('recurring.pause') : t('recurring.resume')}
                        title={recurring.is_active ? t('recurring.pause') : t('recurring.resume')}
                      >
                        {recurring.is_active
                          ? <Pause className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                          : <Play className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />}
                      </button>
                      <button onClick={() => handleEdit(recurring)} className={iconBtn} aria-label={t('transactions.edit')} title={t('transactions.edit')}>
                        <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(recurring)}
                        className={`${iconBtn} hover:!text-danger`}
                        aria-label={t('transactions.deleteBtn')}
                        title={t('transactions.deleteBtn')}
                      >
                        <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      {showModal && (
        <Modal drawer onClose={closeFormModal}>
          <RecurringForm
            initial={editRecurring}
            onSubmit={async () => {
              closeFormModal();
              await processRecurringTransactions();
              await loadRecurrings();
            }}
            onCancel={closeFormModal}
          />
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmDeleteModal
          title={t('recurring.deleteConfirm')}
          message={t('recurring.deleteWarning', { title: deleteConfirm.title })}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmLabel={t('transactions.delete.confirm')}
          cancelLabel={t('forms.cancel')}
        />
      )}
    </div>
  );
}
