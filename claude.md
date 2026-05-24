# Personal Finance Tracker — AI Assistant Guide

## Project Overview

A personal finance tracking app built with React + Supabase. Features: transactions, categories, recurring transactions, financial goals, net worth, monthly budgets, spending benchmarks, financial health scores, financial reports, notifications, and Paddle subscription billing.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.2, React Router 7.10, Recharts 3.5 |
| Build | Vite 7.2 |
| Styling | Tailwind CSS 3.4 (dark mode via `class` strategy) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Email | Resend v3 (via Deno Edge Functions) |
| Payments | Paddle Billing (webhooks + overlay checkout) |
| i18n | i18next — Albanian (`sq`) default, English (`en`) |
| CSV | PapaParse |
| Deployment | Netlify (auto-deploy on push to `main`) |

## Directory Structure

```
src/
├── components/
│   ├── Auth/           # LoginForm, RegisterForm, ForgotPassword, ResetPassword, EmailConfirmed
│   ├── Transactions/   # Transactions, CombinedMonthChart, CategoryPieChart
│   ├── Transaction/    # TransactionForm (add/edit, recurring support)
│   ├── Categories/     # CategoriesPage, CategoryCard
│   ├── Recurring/      # RecurringPage, RecurringForm
│   ├── Goals/          # GoalsPage, GoalForm, GoalCard, ContributionForm
│   ├── Benchmark/      # CategoryBenchmark
│   ├── HealthScore/    # HealthScore
│   ├── NetWorth/       # NetWorthPage, AssetForm, NetWorthChart
│   ├── Reports/        # ReportsPage, ReportSummaryCards, ReportCategoryBreakdown,
│   │                   # ReportIncomeBreakdown, ReportDailyTrend, ReportPeriodComparison,
│   │                   # ReportTopTransactions
│   ├── Budgets/        # BudgetsPage, BudgetForm, BudgetCard
│   ├── Dashboard/      # Dashboard, SummaryCards, CashFlowForecast, ChartWithTimeRange,
│   │                   # BudgetSummaryBar, AddTransactionCTA, FirstRunGuide
│   ├── Onboarding/     # OnboardingWizard, ProgressBar, steps/
│   ├── Subscription/   # PremiumFeatureLock, UpgradeBanner
│   ├── Pricing/        # PricingPage
│   ├── UI/             # Button, Card, Input, Modal, PasswordInput, CustomSelect,
│   │                   # CategoryIconSvg, ConfirmDeleteModal, EmptyState, Icon,
│   │                   # LoadingSpinner, Skeleton
│   └── Header, Footer, Sidebar, LandingPage, ThemeToggle, LanguageSwitcher,
│       ErrorBoundary, CatchAllRedirect
├── context/
│   ├── AuthContext.jsx         # useAuth() — user, session, login, logout, register, refreshUser
│   ├── ToastContext.jsx        # useToast() — addToast(message, type)
│   ├── ThemeContext.jsx        # useTheme() — isDark, toggleDark
│   ├── SubscriptionContext.jsx # useSubscription() — isPremium, isTrialing, limits, canCreate*
│   └── TransactionContext.jsx  # useTransactions() — transactions, categories, mutationCount, CRUD
├── hooks/
│   ├── useAsyncAction.js       # async op with loading/error state
│   ├── useAsyncData.js         # data fetching with deps
│   ├── useDarkMode.js          # dark mode persistence (localStorage)
│   ├── useFormModal.js         # form modal state
│   ├── useKeyboardShortcuts.js # keyboard shortcut registration
│   └── usePaddle.js            # Paddle.js overlay checkout
├── utils/
│   ├── api/                    # Modular API layer
│   │   ├── index.js            # re-exports everything
│   │   ├── _auth.js            # withAuth / withAuthOrEmpty wrappers
│   │   ├── transactions.js, categories.js, goals.js, budgets.js
│   │   ├── recurring.js, health.js, notifications.js, subscriptions.js, networth.js
│   ├── supabaseClient.js       # Supabase client init
│   ├── csv.js                  # CSV export (toCSV, downloadCSV)
│   ├── importCSV.js            # CSV import
│   ├── categoryTranslation.js  # translateCategoryName, getCategoryIcon, CATEGORY_ICONS
│   └── recurringValidation.js  # recurring form validation
├── locales/en/ and sq/         # i18n JSON (must stay in parity)
├── i18n.js                     # i18next config
├── App.jsx                     # Routes + PrivateRoute
└── main.jsx

supabase/
├── functions/                  # Deno Edge Functions
│   ├── paddle-webhook/         # Paddle billing events
│   ├── get-customer-portal/    # Customer portal redirect
│   ├── delete-user/            # Account deletion
│   ├── send-confirmation-email/
│   ├── send-reengagement-bulk/ # Bulk campaign (paginates listUsers)
│   ├── send-reengagement-test/ # Single test send
│   ├── send-bulk-notification/
│   └── send-bulk-notification-test/
└── config.toml

supabase_migrations/            # 35 SQL migration files
```

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/api/index.js` | Re-exports all API functions |
| `src/utils/api/_auth.js` | `withAuth` / `withAuthOrEmpty` — all API calls go through these |
| `src/context/TransactionContext.jsx` | Shared transaction + category state across the app |
| `src/context/SubscriptionContext.jsx` | Premium/trial gating logic |
| `src/components/Transaction/TransactionForm.jsx` | Reusable add/edit form |
| `src/utils/categoryTranslation.js` | `getCategoryIcon()`, `translateCategoryName()`, `CATEGORY_ICONS` |
| `src/components/UI/CustomSelect.jsx` | Dropdown with icon support (use instead of native `<select>`) |

## Database Schema (Key Tables)

**transactions** — `id, user_id, title, amount, type (income|expense), category_id, date, tags[], currency_code, exchange_rate, base_amount, source_recurring_id`
- `base_amount = amount × exchange_rate` (normalized to EUR)
- `source_recurring_id` join alias drops scalar — select both explicitly

**categories** — `id, user_id, name (unique), emoji (icon key)`

**recurring_transactions** — `frequency (daily|weekly|monthly|yearly), interval_count, start_date, end_date, next_run_at, is_active`

**goals** — `target_amount, current_amount (trigger-managed), is_completed, completed_at`
- `is_completed` set by `update_goal_current_amount()` trigger on `goal_contributions`

**monthly_budgets** — `category_id, amount, month (YYYY-MM), spent (trigger-managed)`

**net_worth_snapshots** — `snapshot_date, total_assets, total_liabilities` (upserted on every asset change)

**subscriptions** — `subscription_status, is_trialing, trial_end, had_trial, last_event_id`

### Row Level Security
All tables: RLS enabled, policy `auth.uid() = user_id`

## Critical Patterns

### API Auth Wrapper
```javascript
// withAuth — for mutations; withAuthOrEmpty — for reads (returns [] if not authed)
const { data, error } = await supabase.auth.getUser();
const user = data?.user;  // safe destructure — never data: { user }
if (error && !user) throw error;
```

### Supabase Join Alias Gotcha
```javascript
// This drops source_recurring_id scalar — select it explicitly too:
.select('*, source_recurring_id, recurring:source_recurring_id(start_date)')
```

### Input Error State
```jsx
// CORRECT — Input manages its own border via error prop
<Input error={errors.field ? t(errors.field) : undefined} />
// WRONG — className border classes conflict with Input's internal state
<Input className="border-red-500" />
```

### Subscription Gating
```jsx
const { isPremium, isTrialing } = useSubscription();
if (!isPremium && !isTrialing) return <PremiumFeatureLock />;
```

### i18n — Always Both Files
```javascript
// src/locales/en/translation.json → "key": "English"
// src/locales/sq/translation.json → "key": "Albanian"
```

### setTimeout Cleanup
```javascript
const timerRef = useRef(null);
useEffect(() => () => clearTimeout(timerRef.current), []);
timerRef.current = setTimeout(() => navigate('/'), 2500);
```

### Recharts Sizing
```jsx
// CORRECT — explicit px height avoids width(-1)/height(-1) warning
<ResponsiveContainer width="100%" height={300}>
// For fixed-size: use explicit numbers
<ResponsiveContainer width={180} height={180}>
```

## Development Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

## Environment Variables

```env
# .env (never commit — only .env.example)
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_PADDLE_MONTHLY_PRICE_ID=pri_xxx
VITE_PADDLE_YEARLY_PRICE_ID=pri_xxx
VITE_PADDLE_CLIENT_TOKEN=live_xxx
VITE_PADDLE_ENVIRONMENT=sandbox|production
```

Edge Function secrets: set via `supabase secrets set` (never in code):
`SUPABASE_SERVICE_ROLE_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY`

## Design System

Full reference: `.claude/design-system.md`

### Typography
- **Single font**: Inter Tight (`font-sans`) for all text — body, headings, labels. No display font.
- No `font-display` class, no `tracking-display`. Removed — do not reintroduce.
- `.eyebrow` utility: `text-[12px] font-medium text-ink-muted` — no uppercase, no wide tracking.

### Brand Colors
```
brand-500  #168b78   (accent, active states)
brand-600  #0f6b5e   (primary button fill)
brand-700  #0b5449   (button hover)
```
Primary buttons use `bg-brand-600 hover:bg-brand-700` and `rounded-md` (never `rounded-full`).

### Expense / Negative Color
Use `#e8394d` everywhere for expense amounts, negative values, over-budget indicators.
Never `#e05c6b` or `#f08090` — those were removed globally.

### Dark Mode Text — Critical Rules
All dark mode text is white. `src/index.css` forces this with `!important` outside `@layer` blocks.
- Use `dark:text-white` for primary text
- Use `dark:text-white` for secondary/muted text (opacity modifiers `text-white/70` for hierarchy if needed)
- Placeholder text: `dark:placeholder:text-white/40` (less contrast than typed text — not gray)
- **Never** `dark:text-gray-*`, `dark:text-zinc-*`, or `dark:text-ink-dark-*` (JIT cache unreliable)
- Chart/SVG tick fills: JS-computed hex `dark ? '#FFFFFF' : '#6b7280'` — Tailwind classes don't apply to SVG

### Over-budget Hierarchy
Avoid unicolor red: keep percentage red (`#e8394d`), supporting text muted (`dark:text-white/60`), progress bar carries the color signal.

## Notes for AI Assistants

1. **API layer is modular** — check `src/utils/api/` (not a single api.js) before adding functions
2. **Use existing UI primitives** — `Button, Card, Input, Modal, CustomSelect, CategoryIconSvg, PasswordInput`
3. **i18n both files** — every new string goes in `en/` AND `sq/` simultaneously
4. **Database changes** — new migration in `supabase_migrations/YYYYMMDDHHMMSS_desc.sql` with RLS
5. **Subscription gating** — check `isPremium || isTrialing`, not just `isPremium`
6. **Context management** — when context exceeds ~50%, delegate to subagents or start fresh conversation
7. **Deployment** — frontend auto-deploys on push to `main`; migrations and Edge Functions need manual CLI deploy
8. **mutationCount** — increments on every mutation (add/update/delete); it's a change signal, not a record count
9. **Dark mode** — do not add `dark:text-gray-*` or `dark:text-ink-dark-*`; always `dark:text-white`. See Design System section above.
10. **Performance / Core Web Vitals** — target: Mobile ≥90, Desktop ≥99. Current baselines: Mobile 82→90+, Desktop 99 (SEO 100, Best Practices 100). Rules:
    - **Never add eager imports of heavy libs** (Recharts, PapaParse, Supabase) in components that render on the landing page. Always use `lazy()` + `Suspense`.
    - **DemoWorkspace** (`src/components/Landing/DemoWorkspace.jsx`) must stay lazy-loaded inside LandingPage — it pulls Recharts (107 KiB).
    - **LandingPage** itself must stay `lazy()` in `App.jsx` — it was previously an eager import causing Recharts to enter the critical bundle.
    - **CLS rule**: any component mounted inside a `Suspense` that has visible height must have a `fallback` with a matching `minHeight` (or `min-h-*`) so the footer doesn't shift when content loads.
    - **LCP image**: the showcase image (`src/assets/showcase-finance.jpg`) uses `loading="eager" fetchPriority="high"` — do not change to `loading="lazy"`.
    - **`netlify.toml`** — exists at project root. All `/assets/*` served with `Cache-Control: max-age=31536000, immutable`. Do not remove this file.
    - **Critical CSS**: `vite.config.js` uses `critters` to inline above-the-fold CSS and load full stylesheet async — eliminates render-blocking CSS. Do not remove `criticalCssPlugin` from `vite.config.js`.
    - **Resource hints**: `resourceHintsPlugin` in `vite.config.js` injects `modulepreload` for `recharts` and locale chunks per HTML entry. Do not remove.
    - **No unused preconnect**: only add `<link rel="preconnect">` for origins fetched on initial page load. Supabase is only contacted after login — use `dns-prefetch` only.
    - **i18n non-blocking**: `main.jsx` renders immediately without waiting for translation bundle. `useSuspense: false` in i18n config. Do not revert to `initPromise.then(render)`.
    - **Subscription skeleton**: `UpgradeBanner` and `FreePlanUsageCounter` render fixed-height skeletons while `subLoading` is true — prevents CLS from late-mounting banners.
    - **Chart range INP**: `ChartWithTimeRange` uses `useTransition` for range switching — keeps INP under 200ms. Do not revert to direct `setRange`.

## Specialized Sub-Agents

Four agents in `.claude/agents/` — run in parallel for large tasks.

| Agent | Trigger |
|-------|---------|
| `backend-developer` | api/, migrations, Edge Functions, RLS, Paddle webhooks |
| `frontend-developer` | React components, Tailwind, i18n, hooks, charts |
| `qa-developer` | Bug review, security audit, i18n parity, subscription gating |
| `devops` | Build, Netlify, Supabase CLI, env vars, Edge Function deploy |

### Models
All agents default to `claude-sonnet-4-6`. Edit the `model:` line in each `.claude/agents/*.md` to change.
Available: `claude-opus-4-7` (most capable), `claude-sonnet-4-6` (balanced), `claude-haiku-4-5-20251001` (fastest)
