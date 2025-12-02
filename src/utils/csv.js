// CSV helpers for export (and import if needed)
export function toCSV(items) {
  const headers = ['id', 'title', 'amount', 'date']
  const rows = items.map(e => {
    const id = e.id ?? ''
    const title = String(e.title || '').replace(/"/g, '""')
    const amount = e.amount ?? ''
    let dateStr = ''
    if (e.date) {
      const d = (e.date instanceof Date) ? e.date : new Date(e.date)
      if (!isNaN(d)) dateStr = d.toISOString().slice(0, 10)
    }
    return `${id},"${title}",${amount},"${dateStr}"`
  })
  return [headers.join(','), ...rows].join('\r\n')
}

export function downloadCSV(csv, filename = 'expenses.csv') {
  const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
