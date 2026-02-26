-- ============================================
-- Add emoji column to categories & expand default categories
-- Created: 2026-02-26
--
-- Changes:
-- 1. Add emoji column to categories table
-- 2. Update existing default categories with emojis
-- 3. Backfill 16 new default categories for all existing users
-- 4. Update signup trigger to seed all 24 categories for new users
-- ============================================

-- ────────────────────────────────────────────
-- 1. Add emoji column
-- ────────────────────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📂';

-- ────────────────────────────────────────────
-- 2. Update existing default categories with emojis for all users
-- ────────────────────────────────────────────
UPDATE categories SET emoji = '🎭' WHERE name = 'Entertainment';
UPDATE categories SET emoji = '🍽️' WHERE name = 'Food & Dining';
UPDATE categories SET emoji = '🏥' WHERE name = 'Healthcare';
UPDATE categories SET emoji = '📈' WHERE name = 'Investments';
UPDATE categories SET emoji = '💼' WHERE name = 'Salary';
UPDATE categories SET emoji = '🛍️' WHERE name = 'Shopping';
UPDATE categories SET emoji = '🚗' WHERE name = 'Transportation';
UPDATE categories SET emoji = '💡' WHERE name = 'Utilities';

-- ────────────────────────────────────────────
-- 3. Create/replace helper function that seeds ALL default categories for a user
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_default_categories_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO categories (user_id, name, emoji)
  VALUES
    (p_user_id, 'Entertainment',      '🎭'),
    (p_user_id, 'Food & Dining',      '🍽️'),
    (p_user_id, 'Healthcare',         '🏥'),
    (p_user_id, 'Investments',        '📈'),
    (p_user_id, 'Salary',             '💼'),
    (p_user_id, 'Shopping',           '🛍️'),
    (p_user_id, 'Transportation',     '🚗'),
    (p_user_id, 'Utilities',          '💡'),
    (p_user_id, 'Housing & Rent',     '🏠'),
    (p_user_id, 'Education',          '📚'),
    (p_user_id, 'Travel',             '✈️'),
    (p_user_id, 'Personal Care',      '💆'),
    (p_user_id, 'Subscriptions',      '📱'),
    (p_user_id, 'Gifts & Donations',  '🎁'),
    (p_user_id, 'Insurance',          '🛡️'),
    (p_user_id, 'Pets',               '🐾'),
    (p_user_id, 'Sports & Fitness',   '🏋️'),
    (p_user_id, 'Coffee & Snacks',    '☕'),
    (p_user_id, 'Freelance',          '💻'),
    (p_user_id, 'Savings',            '💰'),
    (p_user_id, 'Taxes',              '🧾'),
    (p_user_id, 'Communication',      '📞'),
    (p_user_id, 'Home & Garden',      '🏡'),
    (p_user_id, 'Kids & Family',      '👨‍👩‍👧')
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_default_categories_for_user(UUID) TO service_role, postgres;

-- ────────────────────────────────────────────
-- 4. Backfill NEW default categories for existing users
--    (only the 16 new ones; existing 8 already have their rows)
-- ────────────────────────────────────────────
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM auth.users LOOP
    INSERT INTO categories (user_id, name, emoji)
    VALUES
      (v_user.id, 'Housing & Rent',     '🏠'),
      (v_user.id, 'Education',          '📚'),
      (v_user.id, 'Travel',             '✈️'),
      (v_user.id, 'Personal Care',      '💆'),
      (v_user.id, 'Subscriptions',      '📱'),
      (v_user.id, 'Gifts & Donations',  '🎁'),
      (v_user.id, 'Insurance',          '🛡️'),
      (v_user.id, 'Pets',               '🐾'),
      (v_user.id, 'Sports & Fitness',   '🏋️'),
      (v_user.id, 'Coffee & Snacks',    '☕'),
      (v_user.id, 'Freelance',          '💻'),
      (v_user.id, 'Savings',            '💰'),
      (v_user.id, 'Taxes',              '🧾'),
      (v_user.id, 'Communication',      '📞'),
      (v_user.id, 'Home & Garden',      '🏡'),
      (v_user.id, 'Kids & Family',      '👨‍👩‍👧')
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────
-- 5. Update signup trigger to seed all 24 categories for new users
-- ────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;
DROP FUNCTION IF EXISTS create_default_categories_for_new_user();

CREATE OR REPLACE FUNCTION create_default_categories_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM seed_default_categories_for_user(NEW.id);
    RAISE LOG 'Created default categories for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create categories for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories_for_new_user();

-- ────────────────────────────────────────────
-- 6. Ensure unique constraint exists on (user_id, name)
--    so ON CONFLICT works correctly
-- ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_user_id_name_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);
  END IF;
END;
$$;
