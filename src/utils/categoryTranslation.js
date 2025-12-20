import i18n from '../i18n';

// List of default category names (as stored in database)
const DEFAULT_CATEGORIES = [
  'Entertainment',
  'Food & Dining',
  'Healthcare',
  'Investments',
  'Salary',
  'Shopping',
  'Transportation',
  'Utilities'
];

/**
 * Translates a category name if it's a default category
 * Returns original name if it's a user-created category
 * @param {string} categoryName - The category name from the database
 * @returns {string} - Translated category name or original name
 */
export function translateCategoryName(categoryName) {
  if (!categoryName) return '';
  
  // Check if this is a default category
  if (DEFAULT_CATEGORIES.includes(categoryName)) {
    return i18n.t(`defaultCategories.${categoryName}`);
  }
  
  // Return original name for user-created categories
  return categoryName;
}

/**
 * Check if a category is a default one
 * @param {string} categoryName - The category name to check
 * @returns {boolean} - True if it's a default category
 */
export function isDefaultCategory(categoryName) {
  return DEFAULT_CATEGORIES.includes(categoryName);
}

export { DEFAULT_CATEGORIES };
