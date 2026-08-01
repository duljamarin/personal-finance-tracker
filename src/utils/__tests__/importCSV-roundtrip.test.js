import { describe, it, expect, vi } from 'vitest';
import Papa from 'papaparse';
import { pickField, normaliseType, normaliseDate, HEADER_ALIASES } from '../importCSV';
import { toCSV } from '../csv';

vi.mock('../../i18n', () => ({ default: { language: 'sq' } }));
vi.mock('../categoryTranslation', () => ({ translateCategoryName: (n) => n }));

// The app's CSV export writes TRANSLATED headers (toCSV uses t(...)). Importing
// an Albanian export used to fail every row with "missing title / amount / date"
// because the importer only matched hardcoded English keys. These tests pin the
// round trip in both languages.

// Header rows exactly as toCSV emits them (see src/utils/csv.js).
const EN_HEADERS = ['ID', 'Title', 'Type', 'Amount', 'Currency Code', 'Date', 'Category', 'Tags', 'Recurring'];
const SQ_HEADERS = ['ID', 'Titulli', 'Lloji', 'Shuma', 'Kodi i Valutës', 'Data', 'Kategoria', 'Etiketat', 'Përsëritës'];

const rowObject = (headers, values) =>
  Object.fromEntries(headers.map((h, i) => [h, values[i]]));

describe('pickField resolves translated headers', () => {
  const enRow = rowObject(EN_HEADERS, ['1', 'Coffee', 'Expense', '3.50', 'EUR', '2026-07-14', 'Food', 'cafe', 'No']);
  const sqRow = rowObject(SQ_HEADERS, ['1', 'Kafe', 'Shpenzim', '3.50', 'EUR', '2026-07-14', 'Ushqim', 'kafe', 'Jo']);

  it.each([
    ['title', 'Coffee', 'Kafe'],
    ['amount', '3.50', '3.50'],
    ['date', '2026-07-14', '2026-07-14'],
    ['category', 'Food', 'Ushqim'],
    ['currency', 'EUR', 'EUR'],
  ])('reads %s from both locales', (field, en, sq) => {
    expect(pickField(enRow, field)).toBe(en);
    expect(pickField(sqRow, field)).toBe(sq);
  });

  it('returns empty string for a field the CSV does not have', () => {
    expect(pickField({ Foo: 'bar' }, 'title')).toBe('');
  });

  it('ignores blank cells rather than returning whitespace', () => {
    expect(pickField({ Title: '   ' }, 'title')).toBe('');
  });

  it('tolerates a null row', () => {
    expect(pickField(null, 'title')).toBe('');
  });
});

describe('normaliseType across locales', () => {
  it.each(['Income', 'income', 'E ardhur', 'e ardhur', 'Credit', 'CR'])(
    'treats %s as income',
    (v) => expect(normaliseType(v)).toBe('income')
  );

  it.each(['Expense', 'Shpenzim', 'Debit', '', 'nonsense'])(
    'treats %s as expense',
    (v) => expect(normaliseType(v)).toBe('expense')
  );

  it('defaults unknown values to expense, never income', () => {
    // Safer default: an expense misread as income inflates the health score.
    expect(normaliseType(undefined)).toBe('expense');
    expect(normaliseType(null)).toBe('expense');
  });
});

describe('normaliseDate handles the layouts exports and banks produce', () => {
  it.each([
    ['2026-07-14', '2026-07-14'],
    ['14/07/2026', '2026-07-14'],
    ['14-07-2026', '2026-07-14'],
    ['20260714', '2026-07-14'],
  ])('parses %s', (input, expected) => {
    expect(normaliseDate(input)).toBe(expected);
  });

  it('returns null for unparseable input rather than a wrong date', () => {
    expect(normaliseDate('not a date')).toBeNull();
    expect(normaliseDate('')).toBeNull();
  });
});

describe('alias table stays in sync with the export', () => {
  // If someone changes a header in csv.js without adding the alias here, the
  // round trip breaks silently. These assert every emitted header is covered.
  const covered = (header) =>
    Object.values(HEADER_ALIASES).some((list) => list.includes(header.toLowerCase().trim()));

  it.each(EN_HEADERS.filter((h) => h !== 'ID'))('English header %s has an alias', (h) => {
    expect(covered(h)).toBe(true);
  });

  it.each(SQ_HEADERS.filter((h) => h !== 'ID'))('Albanian header %s has an alias', (h) => {
    expect(covered(h)).toBe(true);
  });
});

describe('end-to-end: a real Albanian export re-imports', () => {
  // The actual reported bug: export in Albanian, import it back, every row
  // failed. This drives toCSV for real rather than hand-writing a header row.
  const SQ = {
    'transactions.titleLabel': 'Titulli', 'transactions.type': 'Lloji',
    'transactions.amount': 'Shuma', 'currency.code': 'Kodi i Valutës',
    'transactions.date': 'Data', 'transactions.category': 'Kategoria',
    'transactions.tagsLabel': 'Etiketat', 'transactions.isRecurring': 'Përsëritës',
    'transactions.income': 'E ardhur', 'transactions.expense': 'Shpenzim',
    'common.yes': 'Po', 'common.no': 'Jo',
  };
  const t = (k) => SQ[k] ?? k;

  const items = [
    { title: 'Kafe', type: 'expense', amount: 3.5, currency_code: 'EUR', date: '2026-07-14', category: { name: 'Ushqim' }, tags: ['kafe'] },
    { title: 'Paga', type: 'income', amount: 1200, currency_code: 'EUR', date: '2026-07-01', category: { name: 'Paga' }, tags: [] },
  ];

  const reimport = () => {
    const csv = toCSV(items, t, 'EUR');
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
    return data.map((r) => ({
      title: pickField(r, 'title'),
      amount: parseFloat(pickField(r, 'amount')),
      type: normaliseType(pickField(r, 'type')),
      date: normaliseDate(pickField(r, 'date')),
    }));
  };

  it('recovers every exported row', () => {
    expect(reimport()).toHaveLength(items.length);
  });

  it('recovers title, amount and date on every row', () => {
    for (const row of reimport()) {
      expect(row.title).toBeTruthy();
      expect(row.amount).toBeGreaterThan(0);
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('preserves income vs expense through the localised labels', () => {
    const [expense, income] = reimport();
    expect(expense).toMatchObject({ title: 'Kafe', amount: 3.5, type: 'expense', date: '2026-07-14' });
    expect(income).toMatchObject({ title: 'Paga', amount: 1200, type: 'income', date: '2026-07-01' });
  });
});
