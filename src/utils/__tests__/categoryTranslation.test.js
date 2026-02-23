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
    const customCategories = ['Pet Care', 'Travel', 'Gym', 'Music Lessons'];
    customCategories.forEach(name => {
      expect(translateCategoryName(name)).toBe(name);
    });
  });
});

describe('isDefaultCategory', () => {
  it('returns true for all 8 default categories', () => {
    const defaults = ['Entertainment', 'Food & Dining', 'Healthcare', 'Investments', 'Salary', 'Shopping', 'Transportation', 'Utilities'];
    defaults.forEach(name => {
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
  it('exports an array of exactly 8 categories', () => {
    expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true);
    expect(DEFAULT_CATEGORIES).toHaveLength(8);
  });

  it('contains all expected default category names', () => {
    expect(DEFAULT_CATEGORIES).toContain('Entertainment');
    expect(DEFAULT_CATEGORIES).toContain('Food & Dining');
    expect(DEFAULT_CATEGORIES).toContain('Healthcare');
    expect(DEFAULT_CATEGORIES).toContain('Investments');
    expect(DEFAULT_CATEGORIES).toContain('Salary');
    expect(DEFAULT_CATEGORIES).toContain('Shopping');
    expect(DEFAULT_CATEGORIES).toContain('Transportation');
    expect(DEFAULT_CATEGORIES).toContain('Utilities');
  });
});
