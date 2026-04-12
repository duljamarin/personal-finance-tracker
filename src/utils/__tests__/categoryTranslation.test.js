import { describe, it, expect, vi } from 'vitest';

// Mock i18n before importing
vi.mock('../../i18n', () => ({
  default: {
    t: vi.fn((key) => {
      const translations = {
        'defaultCategories.Food & Dining': 'Food & Dining (translated)',
        'defaultCategories.Entertainment': 'Entertainment (translated)',
        'defaultCategories.Salary': 'Salary (translated)',
      };
      return translations[key] || key;
    }),
    language: 'en',
  },
}));

const { translateCategoryName, isDefaultCategory, DEFAULT_CATEGORIES } = await import('../categoryTranslation.js');

describe('translateCategoryName', () => {
  it('returns empty string for null or undefined input', () => {
    expect(translateCategoryName(null)).toBe('');
    expect(translateCategoryName(undefined)).toBe('');
    expect(translateCategoryName('')).toBe('');
  });

  it('translates a known default category', () => {
    const result = translateCategoryName('Food & Dining');
    // Should call i18n.t with the correct key
    expect(result).not.toBe('');
  });

  it('returns the original name for user-created categories', () => {
    const result = translateCategoryName('My Custom Category');
    expect(result).toBe('My Custom Category');
  });

  it('returns the original name for all non-default categories', () => {
    const customCategories = ['Pet Care', 'Gym', 'Music Lessons'];
    customCategories.forEach(name => {
      expect(translateCategoryName(name)).toBe(name);
    });
  });
});

describe('isDefaultCategory', () => {
  it('returns true for all default categories', () => {
    DEFAULT_CATEGORIES.forEach(name => {
      expect(isDefaultCategory(name)).toBe(true);
    });
  });

  it('returns false for user-created categories', () => {
    expect(isDefaultCategory('My Custom Category')).toBe(false);
    expect(isDefaultCategory('Pet Care')).toBe(false);
    expect(isDefaultCategory('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isDefaultCategory('food & dining')).toBe(false);
    expect(isDefaultCategory('ENTERTAINMENT')).toBe(false);
  });
});

describe('DEFAULT_CATEGORIES', () => {
  it('exports an array of exactly 24 categories', () => {
    expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
    expect(DEFAULT_CATEGORIES).toHaveLength(24);
  });

  it('contains all expected default category names', () => {
    const expected = [
      'Entertainment', 'Food & Dining', 'Healthcare', 'Investments',
      'Salary', 'Shopping', 'Transportation', 'Utilities',
      'Housing & Rent', 'Education', 'Travel', 'Personal Care',
      'Subscriptions', 'Gifts & Donations', 'Insurance', 'Pets',
      'Sports & Fitness', 'Coffee & Snacks', 'Freelance', 'Savings',
      'Taxes', 'Communication', 'Home & Garden', 'Kids & Family',
    ];
    expected.forEach(name => {
      expect(DEFAULT_CATEGORIES).toContain(name);
    });
  });
});
