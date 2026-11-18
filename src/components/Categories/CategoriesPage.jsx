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
import { Search } from 'lucide-react';
import Card from '../UI/Card';
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
    <div className="space-y-gap">
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        className="!mb-0"
        actions={
          <Button onClick={openAddModal} leading="plus" type="button">
            {t('categories.addNew')}
          </Button>
        }
      />

      {error && <div role="alert" className="text-expense text-sm font-bold">{error}</div>}
      {catError && <div role="alert" className="text-expense text-sm font-bold">{catError}</div>}

      <Card as="section" index={0} padding="sm" className="flex flex-col gap-3">
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-fg">
              <Search className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder={t('categories.searchPlaceholder')}
              aria-label={t('categories.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full min-h-11 pl-11 pr-3 py-2.5 text-base font-bold placeholder:font-medium bg-tile text-fg placeholder:text-ink-muted/50 dark:placeholder:text-white/40 border-2 border-line hover:border-inner-2 rounded-input focus:border-brand-600 dark:focus:border-brand-400 transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="tile-inner px-4 py-14 text-center text-base font-semibold text-fg">
            {t('categories.noCategories')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1">
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
          </div>
        )}
      </Card>

      {showModal && (
        <Modal onClose={closeModal}>
          <form onSubmit={e => { e.preventDefault(); handleModalSave(); }} className="flex flex-col gap-5">
            <h3 className="text-h3 font-bold text-fg pr-12">
              {modalMode === 'add' ? t('categories.addNew') : t('categories.edit')}
            </h3>

            {/* Icon picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-fg">
                {t('categories.emojiLabel')}
              </label>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-input bg-inner flex items-center justify-center text-brand-text">
                  <CategoryIconSvg iconKey={editIconKey} className="w-5 h-5" />
                </span>
                <span className="text-sm text-fg">{t('categories.emoji')}</span>
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto scrollbar-hide p-2 bg-inner rounded-input border border-line">
                {ICON_PALETTE.map(key => (
                  <button
                    key={key}
                    type="button"
                    title={key}
                    onClick={() => setEditIconKey(key)}
                    className={`w-10 h-10 flex items-center justify-center rounded-input transition-colors ${
 editIconKey === key
 ? 'bg-brand-600 text-white '
 : 'text-fg hover:bg-inner hover:text-brand-600 dark:hover:text-brand-400'
 }`}
                  >
                    <CategoryIconSvg iconKey={key} className="w-4.5 h-4.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Name field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-fg">
                {t('categories.name')}
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`border-2 p-3 text-base rounded-input w-full bg-tile text-fg placeholder:text-ink-muted/40 dark:placeholder:text-white/40 focus:border-brand-600 dark:focus:border-brand-400 transition-colors ${
 modalError ? 'border-expense' : 'border-line hover:border-inner-2'
 }`}
                autoFocus
              />
              {modalError && <span className="text-sm text-expense">{modalError}</span>}
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
