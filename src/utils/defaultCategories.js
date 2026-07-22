// Canonical default category set — the same 24 categories the signup trigger
// seeds (create_default_categories_for_new_user, migration
// 20260226000001_add_category_emojis_and_expand.sql). Single source of truth for
// the post-key-reset re-seed so a user who lost their recovery code lands with
// the exact same starting categories as a fresh signup.
//
// `name` is the English canonical name — categories are ALWAYS stored in English
// and localized in the UI by translateCategoryName(). This is what lets name be
// deterministically encrypted under a stable UNIQUE(user_id, name).
//
// `emoji` is an icon KEY into CATEGORY_ICONS (categoryTranslation.js), not a
// literal emoji; here it equals the name because every default name is also an
// icon key. When these are created via addCategory() the values are encrypted
// under the current DEK automatically (see encryptRow / rowCodec).
export const DEFAULT_CATEGORIES = [
  { name: 'Entertainment',     emoji: 'Entertainment' },
  { name: 'Food & Dining',     emoji: 'Food & Dining' },
  { name: 'Healthcare',        emoji: 'Healthcare' },
  { name: 'Investments',       emoji: 'Investments' },
  { name: 'Salary',            emoji: 'Salary' },
  { name: 'Shopping',          emoji: 'Shopping' },
  { name: 'Transportation',    emoji: 'Transportation' },
  { name: 'Utilities',         emoji: 'Utilities' },
  { name: 'Housing & Rent',    emoji: 'Housing & Rent' },
  { name: 'Education',         emoji: 'Education' },
  { name: 'Travel',            emoji: 'Travel' },
  { name: 'Personal Care',     emoji: 'Personal Care' },
  { name: 'Subscriptions',     emoji: 'Subscriptions' },
  { name: 'Gifts & Donations', emoji: 'Gifts & Donations' },
  { name: 'Insurance',         emoji: 'Insurance' },
  { name: 'Pets',              emoji: 'Pets' },
  { name: 'Sports & Fitness',  emoji: 'Sports & Fitness' },
  { name: 'Coffee & Snacks',   emoji: 'Coffee & Snacks' },
  { name: 'Freelance',         emoji: 'Freelance' },
  { name: 'Savings',           emoji: 'Savings' },
  { name: 'Taxes',             emoji: 'Taxes' },
  { name: 'Communication',     emoji: 'Communication' },
  { name: 'Home & Garden',     emoji: 'Home & Garden' },
  { name: 'Kids & Family',     emoji: 'Kids & Family' },
];
