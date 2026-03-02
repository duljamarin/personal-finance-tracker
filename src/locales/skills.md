# Locales – Developer Skills Guide

This directory contains all internationalisation (i18n) translation files. The app supports **English (`en/`)** and **Albanian (`sq/`)**.

## Required Skills

| Skill | Why It's Needed |
|-------|----------------|
| **i18next / react-i18next** | The app uses `i18next` with `react-i18next`. Understand `useTranslation()`, `t('key')`, namespaces, and interpolation. |
| **JSON** | Translation files are plain JSON. Keys must be valid JSON and consistent across all language files. |
| **Albanian language (sq)** | Changes to `sq/` translations require Albanian language knowledge. If unavailable, flag the key with a `TODO` comment and coordinate with a native speaker. |

## Directory Structure

```
locales/
├── en/          # English translations
│   └── *.json
└── sq/          # Albanian (Shqip) translations
    └── *.json
```

Translation files are namespaced by feature area (e.g. `transactions.json`, `goals.json`, `common.json`).

## How to Add a Translation Key

1. **Add the key to both `en/` and `sq/`** for the relevant namespace file. Missing keys in either language will cause the UI to fall back to the key string itself (a red flag in testing).
2. Use **dot-notation namespacing** that matches the feature: `transactions.titleError`, `goals.saveSuccess`.
3. For interpolated values, use the `{{variable}}` syntax:
   ```json
   { "greeting": "Hello, {{name}}!" }
   ```
   ```jsx
   t('common.greeting', { name: user.displayName })
   ```

## i18next Configuration

See `src/i18n.js` for:
- Default language: **Albanian (`sq`)** (the app's primary market).
- Fallback language: **English (`en`)**.
- Detection strategy: URL path / `localStorage`.

## Conventions

- **Never hardcode user-facing strings** in components. Every string visible to the user must have a translation key.
- **Keep keys consistent across all language files.** Adding a key to `en/` without adding it to `sq/` (and vice versa) will cause missing translations that are hard to catch in development.
- **Namespace by feature**, not by component. Use `transactions.json` for all transaction-related strings, not separate files per component.
- **Use descriptive, hierarchical key names**: `transactions.form.amountLabel` is better than `amtLbl`.
- **Run a locale completeness check** (see `src/components/__tests__/`) before opening a pull request to ensure no keys are missing.

## Default Language Note

The default language is **Albanian (`sq`)**, not English. This means:
- The `sq/` files are the primary source of truth for copy decisions.
- When in doubt about wording, the Albanian version takes precedence.
