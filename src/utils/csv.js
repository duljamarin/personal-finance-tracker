import i18n from '../i18n';
import { translateCategoryName } from './categoryTranslation';

// CSV helpers for export (and import if needed)
// `fallbackCurrency` is the user's single app currency, used for rows written
// before currency_code was per-row (or when it is missing). Defaults to EUR only
// so existing callers/tests keep working.
export function toCSV(items, t, fallbackCurrency = 'EUR') {
  // Get translated headers
  const headers = [
    'ID',
    t('transactions.titleLabel'),
    t('transactions.type'),
    t('transactions.amount'),
    t('currency.code'),
    t('transactions.date'),
    t('transactions.category'),
    t('transactions.tagsLabel'),
    t('transactions.isRecurring')
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
    const currencyCode = e.currency_code || fallbackCurrency

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
    const isRecurring = e.source_recurring_id ? t('common.yes', 'Yes') : t('common.no', 'No')

    return `${id},"${title}","${typeTranslated}",${amount},"${currencyCode}","${dateStr}","${category}","${tags}","${isRecurring}"`
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
