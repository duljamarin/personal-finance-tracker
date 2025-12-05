import React, { useEffect, useState } from 'react';
import { addCategory, updateCategory, deleteCategory, fetchTransactions } from '../../utils/api';
import Button from '../UI/Button.jsx';

export default function CategoriesPage({ reloadExpenses, reloadCategories, categories, catError }) {
  // categories is now a prop
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, categoryId: null });


  useEffect(() => {
    fetchTransactions().then(setTransactions).catch(() => setTransactions([]));
  }, []);

  function handleAdd() {
    if (!newName.trim()) return;
    addCategory({ name: newName.trim() })
      .then(() => {
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
        setNewName('');
      })
      .catch(() => setError('Failed to add category'));
  }

  function handleEdit(id) {
    setEditing(id);
    const cat = (categories || []).find(c => c.id === id);
    setEditName(cat ? cat.name : '');
  }

  function handleUpdate(id) {
    if (!editName.trim()) return;
    updateCategory(id, { name: editName.trim() })
      .then(() => {
        if (reloadCategories) reloadCategories();
        if (reloadExpenses) reloadExpenses();
        setEditing(null);
        setEditName('');
      })
      .catch(() => setError('Failed to update category'));
  }

  function handleDelete(id) {
    const hasTransactions = transactions.some(t => t.category.id === id);
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
      <h2 className="text-2xl font-bold mb-4">Categories</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {catError && <div className="text-red-600 mb-2">{catError}</div>}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search categories"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New category name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <Button onClick={handleAdd} className="bg-green-600 text-white">Add</Button>
      </div>
      <ul className="divide-y">
        {filtered.map(cat => (
          <li key={cat.id} className="py-2 flex items-center gap-2">
            {editing === cat.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border p-2 rounded"
                />
                <Button onClick={() => handleUpdate(cat.id)} className="bg-blue-600 text-white">Save</Button>
                <Button onClick={() => setEditing(null)} className="bg-gray-300">Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1">{cat.name}</span>
                <Button onClick={() => handleEdit(cat.id)} className="bg-yellow-500 text-white">Edit</Button>
                <Button onClick={() => handleDelete(cat.id)} className="bg-red-600 text-white">Delete</Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Modal for delete confirmation */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete Category</h3>
            <p className="mb-4 text-gray-700">This category contains some transactions. Are you sure you want to delete it?</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={cancelDelete} className="bg-gray-300">Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-600 text-white">Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
