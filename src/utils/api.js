
import { API_BASE_URL } from './config';
// Generate or retrieve a persistent client ID for this browser/account
const CLIENT_ID_KEY = 'expense_tracker_client_id';
function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}


function withClientId(headers = {}) {
  return { ...headers, 'X-Client-Id': getClientId() };
}

// Category API
export async function fetchCategories() {
  const res = await fetch(`${API_BASE_URL}/api/categories`, {
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function addCategory(category) {
  const res = await fetch(`${API_BASE_URL}/api/categories`, {
    method: 'POST',
    headers: withClientId({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error('Failed to add category');
  return res.json();
}

export async function updateCategory(id, category) {
  const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    method: 'PUT',
    headers: withClientId({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(category),
  });
  if (!res.ok) throw new Error('Failed to update category');
  return res.json();
}

export async function deleteCategory(id) {
  const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    method: 'DELETE',
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to delete category');
  return res.text();
}

export async function getCategory(id) {
  const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to fetch category');
  return res.json();
}



// Fetch transactions, optionally filtered by type ('income', 'expense', or undefined)
export async function fetchTransactions({ type } = {}) {
  let url = `${API_BASE_URL}/api/transactions`;
  if (type && type !== 'all') {
    url += `?type=${encodeURIComponent(type)}`;
  }
  const res = await fetch(url, {
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}



export async function addTransaction(transaction) {
  const res = await fetch(`${API_BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: withClientId({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error('Failed to add transaction');
  return res.json();
}



export async function updateTransaction(id, transaction) {
  const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: 'PUT',
    headers: withClientId({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(transaction),
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  return res.json();
}



export async function deleteTransaction(id) {
  const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    method: 'DELETE',
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to delete transaction');
  return res.text();
}



export async function getTransaction(id) {
  const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
    headers: withClientId(),
  });
  if (!res.ok) throw new Error('Failed to fetch transaction');
  return res.json();
}
