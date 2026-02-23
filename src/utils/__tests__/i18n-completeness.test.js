import { describe, it, expect } from 'vitest';
import enTranslations from '../../locales/en/translation.json';
import sqTranslations from '../../locales/sq/translation.json';

/**
 * Recursively extracts all dot-notation keys from a nested object.
 */
function extractKeys(obj, prefix = '') {
  return Object.keys(obj).flatMap((key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return extractKeys(value, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n Translation Completeness', () => {
  const enKeys = new Set(extractKeys(enTranslations));
  const sqKeys = new Set(extractKeys(sqTranslations));

  it('English and Albanian translation files have the same number of keys', () => {
    if (enKeys.size !== sqKeys.size) {
      const onlyInEn = [...enKeys].filter(k => !sqKeys.has(k));
      const onlyInSq = [...sqKeys].filter(k => !enKeys.has(k));
      const message = [
        `EN has ${enKeys.size} keys, SQ has ${sqKeys.size} keys.`,
        onlyInEn.length ? `Keys in EN but not SQ: ${onlyInEn.join(', ')}` : '',
        onlyInSq.length ? `Keys in SQ but not EN: ${onlyInSq.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      throw new Error(message);
    }
    expect(enKeys.size).toBe(sqKeys.size);
  });

  it('all English keys exist in Albanian translation', () => {
    const missingInSq = [...enKeys].filter(k => !sqKeys.has(k));
    if (missingInSq.length > 0) {
      throw new Error(`These EN keys are missing in SQ:\n${missingInSq.join('\n')}`);
    }
    expect(missingInSq).toHaveLength(0);
  });

  it('all Albanian keys exist in English translation', () => {
    const missingInEn = [...sqKeys].filter(k => !enKeys.has(k));
    if (missingInEn.length > 0) {
      throw new Error(`These SQ keys are missing in EN:\n${missingInEn.join('\n')}`);
    }
    expect(missingInEn).toHaveLength(0);
  });

  it('both locales have the top-level namespaces', () => {
    const topLevelNamespaces = ['auth', 'transactions', 'categories', 'recurring', 'goals', 'budgets', 'currency', 'messages', 'nav', 'forms'];
    topLevelNamespaces.forEach(ns => {
      expect(enTranslations).toHaveProperty(ns);
      expect(sqTranslations).toHaveProperty(ns);
    });
  });

  it('subscription section has all required keys in both locales', () => {
    const requiredSubKeys = ['active', 'trialing', 'cancelled', 'past_due', 'paused', 'none', 'proBadge', 'trialEndsIn'];
    requiredSubKeys.forEach(key => {
      expect(enTranslations.subscription).toHaveProperty(key);
      expect(sqTranslations.subscription).toHaveProperty(key);
    });
  });

  it('upgrade section has all required keys in both locales', () => {
    const requiredUpgradeKeys = ['upgradeCta', 'transactionLimitReached', 'premiumRequired', 'bannerFreeLimit'];
    requiredUpgradeKeys.forEach(key => {
      expect(enTranslations.upgrade).toHaveProperty(key);
      expect(sqTranslations.upgrade).toHaveProperty(key);
    });
  });
});
