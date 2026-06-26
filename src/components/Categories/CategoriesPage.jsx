import { useState } from 'react';
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

export default function CategoriesPage() {
  const { categories, catError, reloadCategories, reloadTransactions } = useTransactions();
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
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-semibold tracking-tight text-ink-primary dark:text-white mb-6">
        {t('categories.title')}
      </h2>

      {error && <div className="text-expense mb-2 text-sm">{error}</div>}
      {catError && <div className="text-expense mb-2 text-sm">{catError}</div>}

      <div className="mb-8 flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder={t('categories.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 p-3 rounded-md w-full text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40"
        />
        <Button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-md shadow-sm hover:bg-brand-700 transition font-medium text-base whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('categories.addNew')}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-ink-muted dark:text-white mt-16 text-base">
          {t('categories.noCategories')}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              onEdit={() => openEditModal(cat)}
              onDelete={() => handleDelete(cat.id)}
              editLabel={t('categories.edit')}
              deleteLabel={t('categories.delete')}
            />
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={closeModal}>
          <form onSubmit={e => { e.preventDefault(); handleModalSave(); }} className="flex flex-col gap-5">
            <h3 className="text-xl font-semibold text-ink-primary dark:text-white">
              {modalMode === 'add' ? t('categories.addNew') : t('categories.edit')}
            </h3>

            {/* Icon picker */}
            <div className="flex flex-col gap-2">
              <label className="eyebrow">
                {t('categories.emojiLabel')}
              </label>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-md bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
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
                        : 'text-ink-muted dark:text-white hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-600 dark:hover:text-brand-400'
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
                className={`border p-3 text-base rounded-md w-full bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors ${
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
