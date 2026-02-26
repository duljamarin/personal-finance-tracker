import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addCategory, updateCategory, deleteCategory, fetchTransactions } from '../../utils/api';
import Button from '../UI/Button.jsx';
import Modal from '../UI/Modal.jsx';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { translateCategoryName, getCategoryEmoji, EMOJI_PALETTE } from '../../utils/categoryTranslation';

export default function CategoriesPage() {
  const { categories, catError, reloadCategories, reloadTransactions: reloadExpenses } = useTransactions();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📂');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [modal, setModal] = useState({ open: false, categoryId: null });

  useEffect(() => {
    fetchTransactions().then(setTransactions).catch(() => setTransactions([]));
  }, []);

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
        if (user?.id) localStorage.setItem(`onboarding_categories_done_${user.id}`, '1');
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
        if (user?.id) localStorage.setItem(`onboarding_categories_done_${user.id}`, '1');
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
    const hasTransactions = transactions.some(tx => tx.category?.id === id);
    if (hasTransactions) {
      setModal({ open: true, categoryId: id });
      return;
    }
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
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-600 transition"
        />
        <Button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold text-base whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
              <div className="grid grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
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
                className={`border p-3 text-base rounded-lg w-full bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-emerald-400 transition ${
                  modalError ? 'border-red-500' : ''
                }`}
                autoFocus
              />
              {modalError && <span className="text-xs text-red-600">{modalError}</span>}
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
                {t('forms.cancel')}
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('forms.save')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {modal.open && (
        <Modal onClose={() => setModal({ open: false, categoryId: null })}>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('categories.delete')}</h3>
            <p className="text-gray-700 dark:text-gray-300">{t('categories.deleteConfirm')}</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setModal({ open: false, categoryId: null })} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white">
                {t('forms.cancel')}
              </Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                {t('forms.submit')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Individual category card showing emoji + name with hover-reveal action buttons */
function CategoryCard({ cat, onEdit, onDelete, editLabel, deleteLabel }) {
  const emoji = getCategoryEmoji(cat);
  const displayName = translateCategoryName(cat.name);

  return (
    <div className="relative group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 cursor-pointer min-h-[110px]">
      {/* Emoji icon */}
      <span className="text-4xl leading-none select-none">{emoji}</span>

      {/* Category name */}
      <span className="text-sm font-semibold text-center text-gray-700 dark:text-gray-200 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
        {displayName}
      </span>

      {/* Hover overlay with edit / delete */}
      <div className="absolute inset-0 rounded-2xl flex items-end justify-center gap-1 pb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/30 dark:from-black/50 to-transparent pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-lg shadow transition"
          title={editLabel}
        >
          ✏️
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg shadow transition"
          title={deleteLabel}
        >
          🗑️
        </button>
      </div>    </div>
  );
}