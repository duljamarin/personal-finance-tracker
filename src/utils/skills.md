# Utils – Developer Skills Guide

This directory contains pure utility functions, Supabase API helpers, and validation logic that support all feature areas of the application.

## Required Skills

| Skill | Why It's Needed |
|-------|----------------|
| **Supabase JS client** | `api.js` and `supabaseClient.js` use the `@supabase/supabase-js` SDK for all database and auth operations. |
| **PostgreSQL / SQL** | Understanding table structure and RLS policies helps when debugging unexpected empty results or permission errors. |
| **Async/await & error handling** | Every API function is async and must handle Supabase errors correctly (throw vs. return fallback). |
| **PapaParse** | `csv.js` and `importCSV.js` use PapaParse for CSV serialization and parsing. |
| **Regex / string manipulation** | `validators.js` and `recurringValidation.js` use regex patterns for input validation. |
| **Module design** | Utils are pure functions with no React dependencies — keep them framework-agnostic. |

## File Reference

### `supabaseClient.js`
Initialises and exports the single Supabase client instance used by the entire app.

```js
import supabase from './supabaseClient';
```

- Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables.
- **Never create a second client** – always import this singleton.

---

### `api.js`
All Supabase database operations. This is the **single source of truth** for data access.

**Naming convention:** `verb + Entity` – e.g. `fetchTransactions`, `addTransaction`, `updateGoal`, `deleteCategory`.

**Key patterns:**
- Returns `data || []` as a safe fallback for list queries.
- Throws on auth errors so callers can redirect to `/login`.
- Uses `supabase.rpc()` for complex server-side calculations (health score, benchmarks).
- Field names match the database snake_case schema; components convert to camelCase as needed.

> **Before adding a new API function**, check `api.js` first — the function may already exist.

---

### `authHelpers.js`
Utility functions for auth-related logic (e.g. extracting user metadata, session token helpers) that don't belong in `AuthContext`.

---

### `csv.js`
Exports transactions to CSV for download.

**Skills:** PapaParse `unparse()`, `Blob`, `URL.createObjectURL`.

---

### `importCSV.js`
Parses an uploaded CSV file and maps rows to the transaction schema.

**Skills:** PapaParse `parse()`, file `FileReader` API, field mapping/validation.

---

### `validators.js`
Client-side validation functions used by forms across the app.

- Returns `true` / `false` or an error key string.
- Error keys are i18n translation keys (e.g. `'transactions.amountError'`).

---

### `recurringValidation.js`
Validation logic specific to recurring transaction schedules (frequency, interval, end conditions).

---

### `categoryTranslation.js`
Maps internal category names to i18n translation keys for display.

---

### `classNames.js`
A small utility (similar to `clsx`) for conditionally joining Tailwind class strings.

```js
import cn from './classNames';
className={cn('base-class', isActive && 'active-class')}
```

---

### `constants.js`
Shared constant values (supported currencies, frequency options, goal types, etc.) consumed across components and API functions.

## Conventions

- **Check `api.js` before creating new API functions** – avoid duplication.
- **No React imports in utils** – these files must remain framework-agnostic and unit-testable without a DOM.
- **Validation functions return i18n keys**, not human-readable strings.
- **Add tests** in `__tests__/` for any non-trivial utility function.
