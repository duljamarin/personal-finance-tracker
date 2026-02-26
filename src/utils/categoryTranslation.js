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
  'Utilities',
  'Housing & Rent',
  'Education',
  'Travel',
  'Personal Care',
  'Subscriptions',
  'Gifts & Donations',
  'Insurance',
  'Pets',
  'Sports & Fitness',
  'Coffee & Snacks',
  'Freelance',
  'Savings',
  'Taxes',
  'Communication',
  'Home & Garden',
  'Kids & Family',
];

/** Default emoji for each built-in category (fallback if DB value is missing) */
export const CATEGORY_EMOJIS = {
  'Entertainment':     '🎭',
  'Food & Dining':     '🍽️',
  'Healthcare':        '🏥',
  'Investments':       '📈',
  'Salary':            '💼',
  'Shopping':          '🛍️',
  'Transportation':    '🚗',
  'Utilities':         '💡',
  'Housing & Rent':    '🏠',
  'Education':         '📚',
  'Travel':            '✈️',
  'Personal Care':     '💆',
  'Subscriptions':     '📱',
  'Gifts & Donations': '🎁',
  'Insurance':         '🛡️',
  'Pets':              '🐾',
  'Sports & Fitness':  '🏋️',
  'Coffee & Snacks':   '☕',
  'Freelance':         '💻',
  'Savings':           '💰',
  'Taxes':             '🧾',
  'Communication':     '📞',
  'Home & Garden':     '🏡',
  'Kids & Family':     '👨‍👩‍👧',
};

/** Palette of emojis the user can pick when creating/editing a category */
export const EMOJI_PALETTE = [
  '📂','💼','🏠','🍽️','🚗','🏥','🎭','📈','🛍️','💡',
  '📚','✈️','💆','📱','🎁','🛡️','🐾','🏋️','☕','💻',
  '💰','🧾','📞','🏡','👨‍👩‍👧','🎵','🎮','🍕','🍺','🧘',
  '🎨','📷','⚽','🏊','🎯','🔧','💊','🌿','🛒','🎓',
  '🐶','🐱','🌍','🏦','💳','🎪','🎬','🧹','⭐',
];

/**
 * Returns the emoji for a category: DB value → built-in default → generic fallback.
 */
export function getCategoryEmoji(cat) {
  if (!cat) return '📂';
  if (cat.emoji && cat.emoji !== '📂') return cat.emoji;
  return CATEGORY_EMOJIS[cat.name] || '📂';
}

/**
 * Translates a category name if it's a default category.
 * Returns original name for user-created categories.
 */
export function translateCategoryName(categoryName) {
  if (!categoryName) return '';
  if (DEFAULT_CATEGORIES.includes(categoryName)) {
    return i18n.t(`defaultCategories.${categoryName}`);
  }
  return categoryName;
}

/**
 * Check if a category is a default one.
 */
export function isDefaultCategory(categoryName) {
  return DEFAULT_CATEGORIES.includes(categoryName);
}

export { DEFAULT_CATEGORIES };
