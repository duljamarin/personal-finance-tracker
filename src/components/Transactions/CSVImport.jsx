import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Card from '../UI/Card';
import { useToast } from '../../context/ToastContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { bulkImportTransactions } from '../../utils/api';

export default function CSVImport({ categories, onImportComplete }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isPremium, isTrialing, monthlyTransactionCount, transactionLimit, refreshSubscription } = useSubscription();
  const isFree = !isPremium && !isTrialing;

  // Current month key e.g. "2026-02"
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setPreviewData([]);
    setValidationErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { data, errors } = results;
        
        if (errors.length > 0) {
          addToast(t('import.parseError'), 'error');
          return;
        }

        // Validate and transform data
        const { valid, invalid } = validateAndTransform(data);

        if (valid.length === 0 && invalid.length === 0) {
          addToast(t('import.noRows'), 'error');
          return;
        }

        setPreviewData(valid);
        setValidationErrors(invalid);
        setShowModal(true);
      },
      error: (error) => {
        addToast(t('import.parseError'), 'error');
        console.error('CSV parse error:', error);
      }
    });

    // Reset file input
    e.target.value = '';
  };

  const validateAndTransform = (data) => {
    const valid = [];
    const invalid = [];

    data.forEach((row, index) => {
      const errors = [];
      const lineNum = index + 2; // +2 for header and 1-indexed

      // Validate required fields
      if (!row.title && !row.Title && !row.description && !row.Description) {
        errors.push(t('import.missingTitle'));
      }

      const amount = parseFloat(row.amount || row.Amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(t('import.invalidAmount'));
      }

      // Validate type
      const typeRaw = (row.type || row.Type || '').toLowerCase();
      let type = 'expense'; // default
      if (typeRaw.includes('income') || typeRaw === t('transactions.income').toLowerCase()) {
        type = 'income';
      } else if (typeRaw.includes('expense') || typeRaw === t('transactions.expense').toLowerCase()) {
        type = 'expense';
      }

      // Validate date
      const dateStr = row.date || row.Date;
      let date = null;
      if (dateStr) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) {
          date = parsed.toISOString().split('T')[0];
        }
      }
      if (!date) {
        errors.push(t('import.invalidDate'));
      }

      // Match category (optional — unrecognised names are silently accepted as uncategorised)
      const categoryName = row.category || row.Category || '';
      const category = categories.find(c => 
        c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (errors.length > 0) {
        invalid.push({ line: lineNum, errors, row });
      } else {
        valid.push({
          title: row.title || row.Title || row.description || row.Description,
          amount,
          type,
          date,
          category_id: category?.id ?? null,
          tags: parseTags(row.tags || row.Tags),
          currency_code: row.currency_code || row.Currency || 'EUR',
          exchange_rate: parseFloat(row.exchange_rate || row.ExchangeRate) || 1.0,
        });
      }
    });

    return { valid, invalid };
  };

  const parseTags = (tagsStr) => {
    if (!tagsStr) return [];
    return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      addToast(t('import.noValidData'), 'error');
      return;
    }

    // For free users cap current-month rows to the remaining slots
    let dataToImport = previewData;
    if (isFree) {
      const remaining = Math.max(0, transactionLimit - monthlyTransactionCount);
      const currentMonthRows = previewData.filter(r => r.date?.startsWith(currentMonthKey));
      const otherRows = previewData.filter(r => !r.date?.startsWith(currentMonthKey));
      dataToImport = [...otherRows, ...currentMonthRows.slice(0, remaining)];
      if (dataToImport.length === 0) {
        addToast(t('import.limitBlocked', { limit: transactionLimit }), 'error');
        return;
      }
    }

    setImporting(true);
    try {
      const result = await bulkImportTransactions(dataToImport);
      addToast(t('import.success', { count: result.count }), 'success');
      setShowModal(false);
      onImportComplete?.();
      // Refresh subscription so monthly transaction count updates immediately
      refreshSubscription();
    } catch (error) {
      console.error('Import error:', error);
      addToast(t('import.error'), 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {t('transactions.import')}
      </Button>

      {showModal && <Modal
        onClose={() => setShowModal(false)}
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-4">
            <Card className="flex-1 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('import.validRows')}</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {previewData.length}
              </div>
            </Card>
            <Card className="flex-1 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('import.invalidRows')}</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {validationErrors.length}
              </div>
            </Card>
          </div>

          {/* Free-tier limit warning */}
          {(() => {
            if (!isFree) return null;
            const remaining = Math.max(0, transactionLimit - monthlyTransactionCount);
            const currentMonthRows = previewData.filter(r => r.date?.startsWith(currentMonthKey));
            const capped = currentMonthRows.length - Math.min(currentMonthRows.length, remaining);
            if (capped <= 0) return null;
            return (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>{t('import.limitWarning', { capped, remaining, limit: transactionLimit })}</span>
              </div>
            );
          })()}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                {t('import.errors')}
              </h3>
              <div className="space-y-1 text-xs">
                {validationErrors.map((err, i) => (
                  <div key={i} className="text-red-600 dark:text-red-400">
                    {t('import.lineError', { line: err.line })}: {err.errors.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                {t('import.preview')} ({previewData.slice(0, 10).length} {t('import.of')} {previewData.length})
              </h3>
              <table className="w-full text-xs">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">{t('transactions.titleLabel')}</th>
                    <th className="px-2 py-1 text-left">{t('transactions.type')}</th>
                    <th className="px-2 py-1 text-right">{t('transactions.amount')}</th>
                    <th className="px-2 py-1 text-left">{t('transactions.category')}</th>
                    <th className="px-2 py-1 text-left">{t('transactions.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="text-gray-900 dark:text-gray-100">
                      <td className="px-2 py-1">{row.title}</td>
                      <td className="px-2 py-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                          row.type === 'income' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {row.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right">{row.amount.toFixed(2)}</td>
                      <td className="px-2 py-1">
                        {categories.find(c => c.id === row.category_id)?.name}
                      </td>
                      <td className="px-2 py-1">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              disabled={importing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={previewData.length === 0 || importing}
            >
              {(() => {
                if (importing) return t('import.importing');
                if (isFree) {
                  const remaining = Math.max(0, transactionLimit - monthlyTransactionCount);
                  const currentMonthRows = previewData.filter(r => r.date?.startsWith(currentMonthKey));
                  const allowed = previewData.filter(r => !r.date?.startsWith(currentMonthKey)).length
                    + Math.min(currentMonthRows.length, remaining);
                  return t('import.confirmImport', { count: allowed });
                }
                return t('import.confirmImport', { count: previewData.length });
              })()}
            </Button>
          </div>
        </div>
      </Modal>}
    </>
  );
}
