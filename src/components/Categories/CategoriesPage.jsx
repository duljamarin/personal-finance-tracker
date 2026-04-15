import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addCategory, updateCategory, deleteCategory } from '../../utils/api';
import Button from '../UI/Button.jsx';
import Modal from '../UI/Modal.jsx';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import { useToast } from '../../context/ToastContext';

import { useTransactions } from '../../context/TransactionContext';
import { translateCategoryName, getCategoryEmoji, EMOJI_PALETTE } from '../../utils/categoryTranslation';
import CategoryCard from './CategoryCard';

export default function CategoriesPage() {
  const { categories, catError, reloadCategories, reloadTransactions: reloadExpenses } = useTransactions();
  const { addToast } = useToast();

  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📂');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modal, setModal] = useState({ open: false, categoryId: null });

  function openAddModal() {
    setModalMode('add');
    setEditName('');
    setEditEmoji('📂');
    setModalError(null);
    setShowModal(true);
  }

  function openEditModal(cat) {
    setModalMode('edit');
    setEditing(cat.id);
    setEditName(translateCategoryName(cat.name));
    setEditEmoji(getCategoryEmoji(cat));
    setModalError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setEditName('');
    setEditEmoji('📂');
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
        await addCategory({ name: editName.trim(), emoji: editEmoji });
        reloadCategories?.();
        reloadExpenses?.();
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
        await updateCategory(editing, { name: editName.trim(), emoji: editEmoji });
        reloadCategories?.();
        reloadExpenses?.();
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

  function confirmDelete() {
    const id = modal.categoryId;
    setModal({ open: false, categoryId: null });
    deleteCategory(id)
      .then(() => {
        reloadCategories?.();
        reloadExpenses?.();
        addToast(t('messages.categoryDeleted'), 'info');
      })
      .catch(() => {
        setError(t('messages.error'));
        addToast(t('messages.error'), 'error');
      });
  }

  const filtered = (categories || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    translateCategoryName(c.name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        {t('categories.title')}
      </h2>

      {error && <div className="text-red-600 mb-2">{error}</div>}
      {catError && <div className="text-red-600 mb-2">{catError}</div>}

      {/* Search + Add */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder={t('categories.name')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-zinc-800 bg-white dark:bg-surface-dark-tertiary text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-brand-500 transition"
        />
        <Button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl shadow-sm hover:bg-brand-700 transition font-semibold text-base whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          {t('categories.addNew')}
        </Button>
      </div>

      {/* Category Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-lg">
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

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal onClose={closeModal}>
          <form onSubmit={e => { e.preventDefault(); handleModalSave(); }} className="flex flex-col gap-5">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              {modalMode === 'add' ? t('categories.addNew') : t('categories.edit')}
            </h3>

            {/* Emoji picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('categories.emojiLabel')}
              </label>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-4xl leading-none">{editEmoji}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('categories.emoji')}</span>
              </div>
              <div className="grid grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 bg-gray-50 dark:bg-surface-dark-tertiary rounded-xl border border-gray-200 dark:border-zinc-800">
                {EMOJI_PALETTE.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEditEmoji(em)}
                    className={`text-xl p-1 rounded-lg transition hover:bg-emerald-100 dark:hover:bg-emerald-900 ${
                      editEmoji === em ? 'bg-emerald-200 dark:bg-emerald-800 ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Name field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('categories.name')}
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`border p-3 text-base rounded-lg w-full bg-white dark:bg-surface-dark-tertiary dark:text-white border-gray-300 dark:border-zinc-700 focus:ring-2 focus:ring-brand-500 transition ${
                  modalError ? 'border-red-500' : ''
                }`}
                autoFocus
              />
              {modalError && <span className="text-xs text-red-600">{modalError}</span>}
            </div>

            <div className="flex gap-4 justify-end">
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

      {/* Delete confirmation */}
      {modal.open && (
        <ConfirmDeleteModal
          title={t('categories.delete')}
          message={t('categories.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setModal({ open: false, categoryId: null })}
          confirmLabel={t('forms.submit')}
          cancelLabel={t('forms.cancel')}
        />
      )}
    </div>
  );
}