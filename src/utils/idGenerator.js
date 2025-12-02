export function getNextExpenseId() {
  const key = 'expense_last_id'
  const raw = localStorage.getItem(key)
  const last = raw ? Number(raw) : 0
  const next = last + 1
  localStorage.setItem(key, String(next))
  return next
}

export function initExpenseIdFromList(list) {
  const maxId = list.reduce((m, e) => {
    const n = typeof e.id === 'number' ? e.id : (Number(e.id) || 0)
    return Math.max(m, n)
  }, 0)
  const lastStored = Number(localStorage.getItem('expense_last_id')) || 0
  const newLast = Math.max(lastStored, maxId)
  if (newLast > 0) localStorage.setItem('expense_last_id', String(newLast))
}
