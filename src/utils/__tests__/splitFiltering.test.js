import { describe, it, expect } from 'vitest';

// A split transaction stores category_id = NULL on its parent row; the real
// categories live in transaction_splits. These tests pin the matching rules the
// transactions list relies on, so a future refactor cannot quietly go back to
// filtering on the parent's category alone (which hid split rows entirely).

// Mirrors the predicate in Transactions.jsx.
function matchesCategory(tx, categoryFilter, splitsByTx) {
  return (
    tx.category?.id === categoryFilter ||
    (tx.has_splits && (splitsByTx[tx.id] || []).some((s) => s.category_id === categoryFilter))
  );
}

// Mirrors the label logic in Transactions.jsx.
function categoryLabel(tx, splitsByTx, translate = (s) => s) {
  const catName = tx.category?.name || '';
  if (catName) return translate(catName);
  const names = (tx.has_splits ? splitsByTx[tx.id] || [] : [])
    .map((s) => s.categoryName)
    .filter(Boolean);
  if (names.length === 0) return '';
  const shown = names.slice(0, 2).map(translate).join(', ');
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

const FOOD = 'cat-food';
const TRANSPORT = 'cat-transport';
const FUN = 'cat-fun';

const plainTx = { id: 'tx-1', has_splits: false, category: { id: FOOD, name: 'Food' } };
const splitTx = { id: 'tx-2', has_splits: true, category: null };
const uncategorised = { id: 'tx-3', has_splits: false, category: null };

const splitsByTx = {
  'tx-2': [
    { category_id: FOOD, categoryName: 'Food', amount: 60 },
    { category_id: TRANSPORT, categoryName: 'Transport', amount: 30 },
    { category_id: FUN, categoryName: 'Entertainment', amount: 10 },
  ],
};

describe('category filter with split transactions', () => {
  it('matches a plain transaction on its own category', () => {
    expect(matchesCategory(plainTx, FOOD, splitsByTx)).toBe(true);
    expect(matchesCategory(plainTx, TRANSPORT, splitsByTx)).toBe(false);
  });

  it('matches a split transaction when ANY part is in the category', () => {
    expect(matchesCategory(splitTx, FOOD, splitsByTx)).toBe(true);
    expect(matchesCategory(splitTx, TRANSPORT, splitsByTx)).toBe(true);
    expect(matchesCategory(splitTx, FUN, splitsByTx)).toBe(true);
  });

  it('does not match a split transaction on a category it never touches', () => {
    expect(matchesCategory(splitTx, 'cat-rent', splitsByTx)).toBe(false);
  });

  it('does not match an uncategorised, unsplit transaction', () => {
    expect(matchesCategory(uncategorised, FOOD, splitsByTx)).toBe(false);
  });

  it('does not crash when splits have not loaded yet', () => {
    // The list renders before the batched split query resolves.
    expect(matchesCategory(splitTx, FOOD, {})).toBe(false);
    expect(() => matchesCategory(splitTx, FOOD, {})).not.toThrow();
  });
});

describe('category label with split transactions', () => {
  it('uses the plain category name when there is one', () => {
    expect(categoryLabel(plainTx, splitsByTx)).toBe('Food');
  });

  it('lists split categories instead of showing blank', () => {
    // This is the reported bug: split rows used to render an empty category.
    expect(categoryLabel(splitTx, splitsByTx)).toBe('Food, Transport +1');
  });

  it('does not add an overflow suffix at exactly two categories', () => {
    const two = { 'tx-2': splitsByTx['tx-2'].slice(0, 2) };
    expect(categoryLabel(splitTx, two)).toBe('Food, Transport');
  });

  it('returns empty string when splits are still loading', () => {
    expect(categoryLabel(splitTx, {})).toBe('');
  });

  it('applies translation to split category names', () => {
    const upper = (s) => s.toUpperCase();
    expect(categoryLabel(splitTx, splitsByTx, upper)).toBe('FOOD, TRANSPORT +1');
  });
});
