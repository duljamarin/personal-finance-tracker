import { useEffect, useState } from 'react';
import { addCategory, updateCategory, deleteCategory, fetchTransactions } from '../../utils/api';
import Button from '../UI/Button.jsx';
import Modal from '../UI/Modal.jsx';

export default function CategoriesPage({ reloadExpenses, reloadCategories, categories, catError }) {
  // categories is now a prop
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [error, setError] = useState(null); // global error
  const [modalError, setModalError] = useState(null); // error for modal only
  const [modal, setModal] = useState({ open: false, categoryId: null });


  useEffect(() => {
    fetchTransactions().then(setTransactions).catch(() => setTransactions([]));
  }, []);

  function openAddModal() {
    setModalMode('add');
    setEditName('');
    setShowModal(true);
  }

  function openEditModal(id) {
    setModalMode('edit');
    setEditing(id);
    const cat = (categories || []).find(c => c.id === id);
    setEditName(cat ? cat.name : '');
    setShowModal(true);
  }

  async function handleModalSave() {
    if (!editName.trim()) {
      setModalError('Category name cannot be empty.');
      return;
    }
    setModalError(null);
    if (modalMode === 'add') {
      try {
        await addCategory({ name: editName.trim() });
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
        setEditName('');
        setShowModal(false);
      } catch (err) {
        if (err && err.message && (err.message.includes('409') || err.message.toLowerCase().includes('already'))) {
          setModalError('This category already exists.');
        } else {
          setModalError('Failed to add category');
        }
      }
    } else if (modalMode === 'edit' && editing) {
      try {
        await updateCategory(editing, { name: editName.trim() });
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
        setEditing(null);
        setEditName('');
        setShowModal(false);
      } catch (err) {
        if (err && err.message && (err.message.includes('409') || err.message.toLowerCase().includes('already'))) {
          setModalError('This category already exists.');
        } else {
          setModalError('Failed to update category');
        }
      }
    }
  }

  function handleDelete(id) {
    const hasTransactions = transactions.some(t => t.category?.id === id);
    if (hasTransactions) {
      setModal({ open: true, categoryId: id });
      return;
    }
    deleteCategory(id)
      .then(() => {
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
      })
      .catch(() => setError('Failed to delete category'));
  }

  function confirmDelete() {
    const id = modal.categoryId;
    setModal({ open: false, categoryId: null });
    deleteCategory(id)
      .then(() => {
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
      })
      .catch(() => setError('Failed to delete category'));
  }

  function cancelDelete() {
    setModal({ open: false, categoryId: null });
  }

  const filtered = (categories || []).filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Categories</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {catError && <div className="text-red-600 mb-2">{catError}</div>}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center">
        <input
          type="text"
          placeholder="Search categories"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 p-3 rounded-lg w-full text-base focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-500 transition"
        />
        <Button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold text-base"
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
          Add Category
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-5">
        {filtered.map(cat => (
            <div
              key={cat.id}
              className="bg-gradient-to-br from-white via-green-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 rounded-3xl shadow-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-all duration-200 group"
            >
              <span className="font-semibold text-lg text-gray-800 dark:text-gray-100 group-hover:text-green-600 transition">{cat.name}</span>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <Button onClick={() => openEditModal(cat.id)} className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-medium shadow hover:bg-yellow-500 transition">Edit</Button>
                <Button onClick={() => handleDelete(cat.id)} className="bg-red-500 text-black px-4 py-2 rounded-xl font-medium shadow hover:bg-red-600 transition">Delete</Button>
              </div>
            </div>
        ))}
      </div>

      {/* Modal for add/edit category */}
      {showModal && (
        <Modal onClose={() => { setShowModal(false); setEditing(null); setEditName(''); setModalError(null); }}>
          <form
            onSubmit={e => { e.preventDefault(); handleModalSave(); }}
            className="flex flex-col gap-6"
          >
            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">{modalMode === 'add' ? 'Add Category' : 'Edit Category'}</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`border p-3 text-base rounded-lg w-full min-w-[200px] max-w-[400px] border-gray-300 ${modalError ? 'border-red-500' : ''}`}
                autoFocus
              />
              {modalError && (
                <span className="block mt-1 text-xs text-red-600">{modalError}</span>
              )}
            </div>
            <div className="flex gap-4 justify-center">
              <Button type="button" onClick={() => { setShowModal(false); setEditing(null); setEditName(''); setModalError(null); }} className="bg-gray-300">Cancel</Button>
              <Button type="submit" className="bg-green-600 text-white">Save</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal for delete confirmation */}
      {modal.open && (
        <Modal onClose={cancelDelete}>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Delete Category</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">This category contains some transactions. Are you sure you want to delete it?</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={cancelDelete} className="bg-gray-300">Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 text-white">Confirm</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
