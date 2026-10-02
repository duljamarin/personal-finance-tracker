import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addCategory, updateCategory, deleteCategory } from '../../utils/api';
import Button from '../UI/Button.jsx';
import Modal from '../UI/Modal.jsx';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import { useToast } from '../../context/ToastContext';

import { useTransactions } from '../../context/TransactionContext';
import { translateCategoryName, getCategoryIcon, ICON_PALETTE, CATEGORY_ICONS } from '../../utils/categoryTranslation';
import CategoryCard from './CategoryCard';
import { CategoryIconSvg } from '../UI/CategoryIconSvg.jsx';
import PageHeader from '../UI/PageHeader';
import { Plus, Search } from 'lucide-react';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { toISODate } from '../../utils/date';  

export default function CategoriesPage() {
  const { categories, catError, reloadCategories, reloadTransactions, transactions } = useTransactions();
  const { format: formatCurrency } = useDisplayCurrency();

  // Per-category usage for the list: how often it's used overall, and how
  // much was spent in it this month.
  const usage = useMemo(() => {
    const ym = toISODate(new Date()).slice(0, 7);
    const out = {};
    for (const tx of transactions || []) {
      const id = tx.category?.id || tx.category_id;
      if (!id) continue;
      const u = (out[id] ??= { count: 0, month: 0 });
      u.count += 1;
      if (tx.type === 'expense' && tx.date?.startsWith(ym)) u.month += tx.base_amount || tx.amount || 0;
    }
    return out;
  }, [transactions]);
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIconKey, setEditIconKey] = useState('Shopping');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modal, setModal] = useState({ open: false, categoryId: null });
  const [deleting, setDeleting] = useState(false);

  function openAddModal() {
    setModalMode('add');
    setEditName('');
    setEditIconKey('Shopping');
    setModalError(null);
    setShowModal(true);
  }

  function openEditModal(cat) {
    setModalMode('edit');
    setEditing(cat.id);
    setEditName(translateCategoryName(cat.name));
    setEditIconKey(getCategoryIcon(cat));
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setEditName('');
    setEditIconKey('Shopping');
    setModalError(null);
  }

  async function handleModalSave() {
    if (!editName.trim()) {
      setModalError(t('forms.required'));
      return;
    }
    setModalError(null);

    if (modalMode === 'add') {
      try {
        await addCategory({ name: editName.trim(), emoji: editIconKey });
        await Promise.all([reloadCategories?.(), reloadTransactions?.()]);
        closeModal();
        addToast(t('messages.categoryAdded'), 'success');
      } catch (err) {
        if (err?.message?.toLowerCase().includes('already')) {
          setModalError(t('categories.exists'));
        } else {
          setModalError(t('messages.error'));
          addToast(t('messages.error'), 'error');
        }
      }
    } else if (modalMode === 'edit' && editing) {
      try {
        await updateCategory(editing, { name: editName.trim(), emoji: editIconKey });
        await Promise.all([reloadCategories?.(), reloadTransactions?.()]);
        closeModal();
        addToast(t('messages.categoryUpdated'), 'success');
      } catch (err) {
        if (err?.message?.toLowerCase().includes('already')) {
          setModalError(t('categories.exists'));
        } else {
          setModalError(t('messages.error'));
          addToast(t('messages.error'), 'error');
        }
      }
    }
  }

  function handleDelete(id) {
    setModal({ open: true, categoryId: id });
  }

  async function confirmDelete() {
    if (deleting) return;
    const id = modal.categoryId;
    setDeleting(true);
    setModal({ open: false, categoryId: null });
    try {
      await deleteCategory(id);
      await Promise.all([reloadCategories?.(), reloadTransactions?.()]);
      addToast(t('messages.categoryDeleted'), 'info');
    } catch {
      setError(t('messages.error'));
      addToast(t('messages.error'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = (categories || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    translateCategoryName(c.name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        className="!mb-0"
        actions={
          <Button onClick={openAddModal}>
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              {t('categories.addNew')}
            </span>
          </Button>
        }
      />

      {error && <div className="text-expense text-sm">{error}</div>}
      {catError && <div className="text-expense text-sm">{catError}</div>}

      <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-surface-hairline dark:border-surface-dark-hairline">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-ink-muted dark:text-white/60">
              <Search className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <input
              type="text"
              placeholder={t('categories.searchPlaceholder')}
              aria-label={t('categories.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/50 dark:placeholder:text-white/40 border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-ink-muted dark:text-white">
            {t('categories.noCategories')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-surface-hairline dark:bg-surface-dark-hairline">
            {filtered.map(cat => {
              const s = usage[cat.id];
              return (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => openEditModal(cat)}
                  onDelete={() => handleDelete(cat.id)}
                  editLabel={t('categories.edit')}
                  deleteLabel={t('categories.delete')}
                  meta={t('categories.txCount', { count: s?.count || 0 })}
                  amount={s?.month ? formatCurrency(s.month) : null}
                  amountLabel={t('categories.spentThisMonth')}
                />
              );
            })}
            {/* Keep the two-column grid's last cell white when the count is odd. */}
            {filtered.length % 2 === 1 && <div className="hidden md:block bg-white dark:bg-surface-dark-card" />}
          </div>
        )}
      </section>

      {showModal && (
        <Modal onClose={closeModal}>
          <form onSubmit={e => { e.preventDefault(); handleModalSave(); }} className="flex flex-col gap-5">
            <h3 className="font-display text-title text-ink-primary dark:text-white">
              {modalMode === 'add' ? t('categories.addNew') : t('categories.edit')}
            </h3>

            {/* Icon picker */}
            <div className="flex flex-col gap-2">
              <label className="eyebrow">
                {t('categories.emojiLabel')}
              </label>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-md bg-surface-subtle dark:bg-surface-dark-subtle flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <CategoryIconSvg iconKey={editIconKey} className="w-5 h-5" />
                </span>
                <span className="text-xs text-ink-muted dark:text-white">{t('categories.emoji')}</span>
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto scrollbar-hide p-2 bg-surface-subtle dark:bg-surface-dark-subtle rounded-md border border-surface-hairline dark:border-surface-dark-hairline">
                {ICON_PALETTE.map(key => (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={() => setEditIconKey(key)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                      editIconKey === key
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-ink-muted dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle hover:text-brand-600 dark:hover:text-brand-400'
                    }`}
                  >
                    <CategoryIconSvg iconKey={key} className="w-4.5 h-4.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Name field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink-primary dark:text-white">
                {t('categories.name')}
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`border p-3 text-base rounded-md w-full bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition-colors ${
                  modalError ? 'border-expense' : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40'
                }`}
                autoFocus
              />
              {modalError && <span className="text-xs text-expense">{modalError}</span>}
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" onClick={closeModal} variant="secondary">
                {t('forms.cancel')}
              </Button>
              <Button type="submit" variant="success">
                {t('forms.save')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {modal.open && (
        <ConfirmDeleteModal
          title={t('categories.delete')}
          message={t('categories.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setModal({ open: false, categoryId: null })}
          confirmLabel={t('forms.submit')}
          cancelLabel={t('forms.cancel')}
          deleting={deleting}
        />
      )}
    </div>
  );
}
