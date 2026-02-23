import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock i18n before importing csv
vi.mock('../../i18n', () => ({
  default: { language: 'en' },
}));

// Mock categoryTranslation
vi.mock('../categoryTranslation', () => ({
  translateCategoryName: vi.fn((name) => name),
}));

const { toCSV, downloadCSV } = await import('../csv.js');

const mockT = (key) => {
  const map = {
    'transactions.titleLabel': 'Title',
    'transactions.type': 'Type',
    'transactions.amount': 'Amount',
    'currency.code': 'Currency',
    'currency.exchangeRate': 'Exchange Rate',
    'currency.baseAmount': 'Base Amount (EUR)',
    'transactions.date': 'Date',
    'transactions.category': 'Category',
    'transactions.tagsLabel': 'Tags',
    'transactions.income': 'Income',
    'transactions.expense': 'Expense',
  };
  return map[key] || key;
};

describe('toCSV', () => {
  const mockItems = [
    {
      title: 'Grocery shopping',
      type: 'expense',
      amount: 45.50,
      currency_code: 'EUR',
      exchange_rate: 1.0,
      base_amount: 45.50,
      date: '2025-01-15',
      category: { name: 'Food & Dining' },
      tags: ['food', 'groceries'],
    },
    {
      title: 'Salary',
      type: 'income',
      amount: 2500,
      currency_code: 'USD',
      exchange_rate: 0.92,
      base_amount: 2300,
      date: '2025-01-01',
      category: { name: 'Salary' },
      tags: [],
    },
  ];

  it('generates CSV string with headers and rows', () => {
    const csv = toCSV(mockItems, mockT);
    expect(typeof csv).toBe('string');
    expect(csv).toContain('Title');
    expect(csv).toContain('Amount');
  });

  it('includes both income and expense types correctly', () => {
    const csv = toCSV(mockItems, mockT);
    expect(csv).toContain('Income');
    expect(csv).toContain('Expense');
  });

  it('uses sequential IDs not database UUIDs', () => {
    const csv = toCSV(mockItems, mockT);
    const lines = csv.split('\r\n');
    expect(lines[1]).toMatch(/^1,/);
    expect(lines[2]).toMatch(/^2,/);
  });

  it('joins tags with comma separator', () => {
    const csv = toCSV(mockItems, mockT);
    expect(csv).toContain('food, groceries');
  });

  it('handles empty tags array without error', () => {
    const csv = toCSV(mockItems, mockT);
    const lines = csv.split('\r\n');
    expect(lines[2]).toContain('""');
  });

  it('formats date as YYYY-MM-DD', () => {
    const csv = toCSV(mockItems, mockT);
    expect(csv).toContain('2025-01-15');
  });

  it('defaults currency_code to EUR when not provided', () => {
    const items = [{ title: 'Test', type: 'expense', amount: 10, date: '2025-01-01', tags: [] }];
    const csv = toCSV(items, mockT);
    expect(csv).toContain('EUR');
  });

  it('escapes double quotes in title', () => {
    const items = [{ title: 'Buy "organic" food', type: 'expense', amount: 10, date: '2025-01-01', tags: [] }];
    const csv = toCSV(items, mockT);
    expect(csv).toContain('Buy ""organic"" food');
  });

  it('handles empty items array and returns just headers', () => {
    const csv = toCSV([], mockT);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Title');
  });

  it('uses base_amount as fallback when not provided', () => {
    const items = [{ title: 'Test', type: 'expense', amount: 99, date: '2025-01-01', tags: [] }];
    const csv = toCSV(items, mockT);
    expect(csv).toContain('99');
  });
});

describe('downloadCSV', () => {
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;
  let createElementSpy;

  beforeEach(() => {
    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
      remove: vi.fn(),
    });
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a link element and triggers click', () => {
    downloadCSV('id,title\r\n1,Test', 'test.csv');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('uses provided filename', () => {
    const link = { href: '', download: '', click: clickSpy, remove: vi.fn() };
    createElementSpy.mockReturnValue(link);
    downloadCSV('id,title\r\n1,Test', 'my-export.csv');
    expect(link.download).toBe('my-export.csv');
  });

  it('uses default filename when not provided', () => {
    const link = { href: '', download: '', click: clickSpy, remove: vi.fn() };
    createElementSpy.mockReturnValue(link);
    downloadCSV('id,title\r\n1,Test');
    expect(link.download).toBe('expenses.csv');
  });

  it('revokes object URL after download', () => {
    downloadCSV('id,title\r\n1,Test', 'test.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
