import Papa from 'papaparse';

/**
 * Normalised row shape output by all parsers.
 * @typedef {Object} ImportRow
 * @property {string}  title
 * @property {number}  amount        always positive
 * @property {'income'|'expense'} type
 * @property {string}  date          YYYY-MM-DD
 * @property {string}  categoryName  raw string - caller resolves to categoryId
 * @property {string[]} tags
 * @property {string}  currencyCode  default 'EUR'
 * @property {number}  exchangeRate  default 1.0
 */

// ─── Header aliases ─────────────────────────────────────────────────────────
// The app's own CSV export writes TRANSLATED headers (toCSV uses t(...)), so an
// Albanian export comes back as "Titulli | Lloji | Shuma | Data". Matching only
// English names made every re-import fail with "missing title/amount/date" on
// every row. Aliases are lowercased; keep both locales in sync with csv.js.
export const HEADER_ALIASES = {
  title:    ['title', 'titulli', 'titull', 'description', 'përshkrimi', 'pershkrimi', 'name', 'emri'],
  type:     ['type', 'lloji', 'llojo'],
  amount:   ['amount', 'shuma', 'vlera'],
  currency: ['currency code', 'kodi i valutës', 'kodi i valutes', 'currency', 'valuta', 'monedha'],
  date:     ['date', 'data'],
  category: ['category', 'kategoria', 'kategori'],
  tags:     ['tags', 'etiketat', 'etiketa'],
  recurring:['recurring', 'përsëritës', 'perseritues', 'i përsëritur'],
};

/** Index of the first column whose header matches any alias for `field`. */
export function aliasIndex(headers, field) {
  const h = headers.map((s) => String(s || '').toLowerCase().trim());
  for (const alias of HEADER_ALIASES[field] || []) {
    const i = h.indexOf(alias);
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Read a field from a header-keyed row object (PapaParse `header: true`) using
 * the alias table, so callers do not have to know the export language.
 */
export function pickField(row, field) {
  const aliases = HEADER_ALIASES[field] || [];
  for (const key of Object.keys(row || {})) {
    if (aliases.includes(String(key).toLowerCase().trim())) {
      const v = row[key];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
    }
  }
  return '';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Accepts the localised labels toCSV writes ("Income" / "E ardhur") plus common
// bank wordings. Anything unrecognised falls back to expense, which is the safe
// default: an expense mistaken for income inflates the health score.
const INCOME_WORDS = ['income', 'e ardhur', 'të ardhura', 'te ardhura', 'ardhur', 'credit', 'cr', 'deposit'];

export function normaliseType(raw = '') {
  const v = String(raw || '').toLowerCase().trim();
  return INCOME_WORDS.includes(v) ? 'income' : 'expense';
}

export function normaliseDate(raw = '') {
  const s = raw.trim();
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // MM/DD/YYYY
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  // Numeric YYYYMMDD
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  // Try native Date parsing as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

function isValidRow(row) {
  return (
    row.title?.trim() &&
    row.amount > 0 &&
    !isNaN(row.amount) &&
    row.date &&
    (row.type === 'income' || row.type === 'expense')
  );
}

// ─── App-own export format ──────────────────────────────────────────────────
// Columns: ID | Title | Type | Amount | Currency Code | Date | Category | Tags | Recurring
// Older exports also carried Exchange Rate and Base Amount between Currency Code
// and Date; columns are looked up by header name, so both layouts still parse.

// Resolved via HEADER_ALIASES, so an export made in Albanian re-imports too.
const APP_REQUIRED_FIELDS = ['title', 'type', 'amount'];

function isAppFormat(headers) {
  return APP_REQUIRED_FIELDS.every(field => aliasIndex(headers, field) !== -1);
}

function parseAppFormat(rows) {
  const [headerRow, ...dataRows] = rows;
  const idx = field => aliasIndex(headerRow, field);

  const iTitle = idx('title');
  const iType = idx('type');
  const iAmount = idx('amount');
  const iCurrency = idx('currency');
  const iDate = idx('date');
  const iCategory = idx('category');
  const iTags = idx('tags');

  return dataRows
    .filter(r => r.length >= headerRow.length)
    .map(r => {
      const rawAmount = parseFloat(r[iAmount]);
      const tagsStr = iTags !== -1 ? (r[iTags] || '') : '';
      return {
        title:        (r[iTitle] || '').trim(),
        type:         normaliseType(r[iType]),
        amount:       Math.abs(rawAmount),
        // undefined when the CSV omits it, so the API stamps the user's
        // currency instead of silently labelling the rows EUR.
        currencyCode: iCurrency !== -1 ? ((r[iCurrency] || '').trim() || undefined) : undefined,
        exchangeRate: 1.0,
        date:         iDate !== -1 ? normaliseDate(r[iDate]) : null,
        categoryName: iCategory !== -1 ? (r[iCategory] || '').trim() : '',
        tags:         tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
    })
    .filter(isValidRow);
}

// ─── Generic bank CSV format ────────────────────────────────────────────────

const TITLE_KEYWORDS   = ['description', 'memo', 'narrative', 'details', 'title', 'name', 'payee', 'merchant', 'transaction'];
const DATE_KEYWORDS    = ['date', 'datum', 'data', 'transaction date', 'posted', 'value date'];
const AMOUNT_KEYWORDS  = ['amount', 'sum', 'value', 'debit', 'credit', 'transaction amount'];
const DEBIT_KEYWORDS   = ['debit', 'withdrawal', 'out', 'dr'];
const CREDIT_KEYWORDS  = ['credit', 'deposit', 'in', 'cr'];
const CURRENCY_KEYWORDS= ['currency', 'ccy', 'curr'];
const CATEGORY_KEYWORDS= ['category', 'type', 'kategoria'];

function findCol(headers, keywords) {
  const h = headers.map(s => s.toLowerCase().trim());
  for (const kw of keywords) {
    const i = h.findIndex(s => s.includes(kw));
    if (i !== -1) return i;
  }
  return -1;
}

function parseGenericFormat(rows) {
  if (rows.length < 2) return [];
  const [headerRow, ...dataRows] = rows;

  const titleCol    = findCol(headerRow, TITLE_KEYWORDS);
  const dateCol     = findCol(headerRow, DATE_KEYWORDS);
  const amountCol   = findCol(headerRow, AMOUNT_KEYWORDS);
  const debitCol    = findCol(headerRow, DEBIT_KEYWORDS);
  const creditCol   = findCol(headerRow, CREDIT_KEYWORDS);
  const currencyCol = findCol(headerRow, CURRENCY_KEYWORDS);
  const categoryCol = findCol(headerRow, CATEGORY_KEYWORDS);

  // Need at least title + date + (amount OR debit/credit)
  const hasAmount = amountCol !== -1 || (debitCol !== -1 || creditCol !== -1);
  if (titleCol === -1 || dateCol === -1 || !hasAmount) return [];

  return dataRows
    .filter(r => r.some(cell => cell?.trim()))
    .map(r => {
      const title = (r[titleCol] || '').trim();
      const date  = normaliseDate(r[dateCol] || '');

      let amount = 0;
      let type   = 'expense';

      if (amountCol !== -1) {
        // Single signed amount: negative = expense, positive = income
        const raw = parseFloat((r[amountCol] || '0').replace(/[^0-9.\-]/g, ''));
        amount = Math.abs(raw);
        type   = raw >= 0 ? 'income' : 'expense';
      } else {
        // Separate debit / credit columns
        const debit  = debitCol  !== -1 ? parseFloat((r[debitCol]  || '0').replace(/[^0-9.]/g, '')) : 0;
        const credit = creditCol !== -1 ? parseFloat((r[creditCol] || '0').replace(/[^0-9.]/g, '')) : 0;
        if (credit > 0) { amount = credit; type = 'income'; }
        else            { amount = debit;  type = 'expense'; }
      }

      const currencyCode = currencyCol !== -1
        ? (r[currencyCol] || '').trim().toUpperCase() || undefined
        : undefined;

      const categoryName = categoryCol !== -1 ? (r[categoryCol] || '').trim() : '';

      return { title, type, amount, currencyCode, exchangeRate: 1.0, date, categoryName, tags: [] };
    })
    .filter(isValidRow);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV File object and return an array of ImportRow.
 * @param {File} file
 * @returns {Promise<ImportRow[]>}
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete(result) {
        try {
          const rows = result.data;
          if (!rows || rows.length < 2) {
            resolve([]);
            return;
          }
          const parsed = isAppFormat(rows[0])
            ? parseAppFormat(rows)
            : parseGenericFormat(rows);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      },
      error(err) { reject(err); },
    });
  });
}

/**
 * Check which of the candidate rows are likely duplicates of existing transactions.
 * @param {ImportRow[]} candidates
 * @param {Object[]} existing  - transaction objects already in state
 * @returns {Set<string>}  set of "date|amount|title" keys that are duplicates
 */
export function findDuplicates(candidates, existing) {
  const existingKeys = new Set(
    existing.map(t => `${t.date}|${Number(t.amount).toFixed(2)}|${(t.title || '').toLowerCase().trim()}`)
  );
  return new Set(
    candidates
      .filter(c => existingKeys.has(`${c.date}|${Number(c.amount).toFixed(2)}|${c.title.toLowerCase().trim()}`))
      .map(c => `${c.date}|${Number(c.amount).toFixed(2)}|${c.title.toLowerCase().trim()}`)
  );
}

/**
 * Resolve category name → category id (case-insensitive).
 * Returns null if not found.
 * @param {string} name
 * @param {Object[]} categories
 */
export function resolveCategoryId(name, categories) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const match = categories.find(c => c.name.toLowerCase().trim() === lower);
  return match?.id ?? null;
}
