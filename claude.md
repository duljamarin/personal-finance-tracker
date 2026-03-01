# Personal Finance Tracker - AI Assistant Guide

## Project Overview

A personal finance tracking application built with React and Supabase. Users can manage transactions, categories, recurring transactions, financial goals, and view spending benchmarks and health scores.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.2, React Router 7.10, Recharts 3.5 |
| Build | Vite 7.2 |
| Styling | Tailwind CSS 3.4 (dark mode via class strategy) |
| Backend | Supabase (PostgreSQL + Auth) |
| i18n | i18next (English & Albanian) |
| CSV | PapaParse |

## Directory Structure

```
src/
├── components/
│   ├── Auth/           # LoginForm, RegisterForm, ForgotPassword, ResetPassword
│   ├── Transactions/   # Transaction list, charts (CombinedMonthChart, CategoryPieChart)
│   ├── Transaction/    # TransactionForm (reusable for add/edit)
│   ├── Categories/     # CategoriesPage
│   ├── Recurring/      # RecurringPage, RecurringForm
│   ├── Goals/          # GoalsPage, GoalForm, GoalCard, ContributionForm
│   ├── Benchmark/      # CategoryBenchmark
│   ├── HealthScore/    # HealthScore
│   ├── UI/             # Button, Card, Input, Modal (reusable primitives)
│   ├── Header.jsx, Footer.jsx, ThemeToggle.jsx, LanguageSwitcher.jsx
│   └── LandingPage.jsx
├── context/
│   ├── AuthContext.jsx   # User auth state, login/logout/register
│   └── ToastContext.jsx  # Toast notifications
├── hooks/
│   └── useDarkMode.js    # Dark mode persistence
├── utils/
│   ├── api.js            # All Supabase API calls
│   ├── supabaseClient.js # Supabase initialization
│   ├── csv.js            # CSV export utilities
│   ├── categoryTranslation.js
│   └── recurringValidation.js
├── locales/              # i18n translation JSON files (en/, sq/)
├── i18n.js               # i18next config
├── App.jsx               # Main app with routing
└── main.jsx              # Entry point

supabase_migrations/      # SQL migration files for database schema
```

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/api.js` | All API calls to Supabase (CRUD for transactions, categories, goals, etc.) |
| `src/context/AuthContext.jsx` | Auth state management, provides `useAuth()` hook |
| `src/App.jsx` | Route definitions, main state (transactions, categories), theme toggle |
| `src/components/Transaction/TransactionForm.jsx` | Reusable form for add/edit transactions with recurring support |
| `src/utils/supabaseClient.js` | Supabase client initialization |

## Database Schema

### Core Tables

**transactions**
- `id`, `user_id`, `title`, `amount`, `type` ('income'|'expense'), `category_id`, `date`, `tags[]`
- Multi-currency: `currency_code`, `exchange_rate`, `base_amount` (amount × exchange_rate)
- Recurring link: `source_recurring_id`, `is_scheduled`

**categories**
- `id`, `user_id`, `name` (unique per user)

**recurring_transactions**
- `id`, `user_id`, `title`, `amount`, `type`, `category_id`, `tags[]`
- Schedule: `frequency` (daily|weekly|monthly|yearly), `interval_count`, `start_date`, `end_date`, `occurrences_limit`
- State: `next_run_at`, `last_run_at`, `occurrences_created`, `is_active`

**goals**
- `id`, `user_id`, `name`, `target_amount`, `current_amount` (auto-updated by trigger)
- `goal_type` (savings|debt_payoff|investment|purchase), `priority`, `is_active`, `is_completed`

**goal_contributions** / **goal_milestones**
- Linked to goals, contributions update `current_amount` via DB trigger

**financial_health_scores**
- Monthly snapshots with component scores and insights

### Row Level Security
All tables have RLS enabled: `auth.uid() = user_id`

## API Patterns

All API functions in `src/utils/api.js`:

```javascript
// Naming convention: verb + Entity
fetchTransactions(), addTransaction(), updateTransaction(), deleteTransaction()
fetchCategories(), addCategory(), updateCategory(), deleteCategory()
fetchGoals(), createGoal(), updateGoal(), deleteGoal()
fetchRecurringTransactions(), addRecurringTransaction(), processRecurringTransactions()
fetchHealthScore(), fetchCategoryBenchmarks()
```

**Important patterns:**
- Returns `data || []` as safe fallback
- Throws on auth errors
- Uses Supabase RPC for complex calculations (health score, benchmarks)
- Field naming: API uses snake_case, components often convert to camelCase

## State Management

**No Redux** - Uses React Context + local component state

**AuthContext** provides:
- `user`, `session`, `loading`, `error`
- `login()`, `register()`, `logout()`, `clearError()`

**ToastContext** provides:
- `addToast(message, type)` - types: success, error, info, warning

## Common Patterns

### Multi-Currency
Transactions store `amount`, `currency_code`, `exchange_rate`, `base_amount`. Aggregations use `base_amount` (normalized to EUR).

### Recurring Transactions
Generated on-demand via `processRecurringTransactions()` called on Transactions.jsx mount. Not server-side cron.

### i18n
Default language: Albanian. Uses `useTranslation()` hook. Translation keys like `transactions.titleError`.

### Dark Mode
Tailwind dark mode via class. Persisted in localStorage via `useDarkMode` hook.

### Form Validation
Client-side in components. Error keys map to i18n translation keys.

### Route Protection
`PrivateRoute` component checks `accessToken` from AuthContext, redirects to /login if missing.

## Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

## Notes for AI Assistants

1. **Always check api.js** before creating new API functions - patterns are established
2. **Use existing UI components** from `src/components/UI/` (Button, Card, Input, Modal)
3. **Follow i18n patterns** - add translation keys to both `en/` and `sq/` locale files
4. **Database changes** require SQL migrations in `supabase_migrations/` with RLS policies
5. **State changes** - components manage their own state, lift to App.jsx only if shared
6. **Styling** - use Tailwind classes, support dark mode with `dark:` prefix

## Specialized Sub-Agents

Four sub-agents are defined in `.claude/agents/`. They can run in parallel for large tasks.

| Agent | File | Trigger |
|-------|------|---------|
| `backend-developer` | `.claude/agents/backend-developer.md` | api.js, migrations, Edge Functions, RLS, Paddle webhooks |
| `frontend-developer` | `.claude/agents/frontend-developer.md` | React components, Tailwind, i18n, hooks, charts |
| `qa-developer` | `.claude/agents/qa-developer.md` | Tests, bug review, security audit, locale completeness |
| `devops` | `.claude/agents/devops.md` | Build, deployment, CI/CD, env vars, Supabase CLI |

### Changing the Model

Each agent file has a `model:` line at the top. Edit it to switch models:

```markdown
---
model: claude-opus-4-5-20251101   # Most capable — use for complex reasoning
# model: claude-sonnet-4-6        # Balanced speed/quality (default)
# model: claude-haiku-4-5         # Fastest — use for simple, repetitive tasks
---
```

To change all agents to the same model at once, update the `model:` field in each of the four `.md` files in `.claude/agents/`.
