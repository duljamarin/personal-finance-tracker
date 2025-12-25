import i18n from '../i18n';
import { translateCategoryName } from './categoryTranslation';

// CSV helpers for export (and import if needed)
export function toCSV(items, t) {
  // Get translated headers
  const headers = [
    'ID',
    t('transactions.titleLabel'),
    t('transactions.type'),
    t('transactions.amount'),
    t('currency.code'),
    t('currency.exchangeRate'),
    t('currency.baseAmount'),
    t('transactions.date'),
    t('transactions.category'),
    t('transactions.tagsLabel')
  ]
  
  const rows = items.map((e, i) => {
    // Use sequential ID for export
    const id = i + 1
    const title = String(e.title || '').replace(/"/g, '""')
    
    // Translate type
    const typeTranslated = e.type === 'income' 
      ? t('transactions.income') 
      : e.type === 'expense' 
        ? t('transactions.expense') 
        : ''
    
    const amount = e.amount ?? ''
    const currencyCode = e.currency_code || 'EUR'
    const exchangeRate = e.exchange_rate ?? '1.0'
    const baseAmount = e.base_amount ?? e.amount ?? ''
    
    let dateStr = ''
    if (e.date) {
      const d = (e.date instanceof Date) ? e.date : new Date(e.date)
      if (!isNaN(d)) dateStr = d.toISOString().slice(0, 10)
    }
    
    // Translate category
    const categoryName = e.category?.name || ''
    const categoryTranslated = translateCategoryName(categoryName, i18n.language)
    const category = String(categoryTranslated).replace(/"/g, '""')
    
    const tags = Array.isArray(e.tags) ? e.tags.join(', ').replace(/"/g, '""') : '' 
    
    return `${id},"${title}","${typeTranslated}",${amount},"${currencyCode}",${exchangeRate},${baseAmount},"${dateStr}","${category}","${tags}"`
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
