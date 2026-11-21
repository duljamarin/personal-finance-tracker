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
│   ├── Dashboard/      # Dashboard, SummaryCards, MonthForecastTile, ChartWithTimeRange,
│   │                   # BudgetSummaryBar, FirstRunGuide
│   ├── Onboarding/     # OnboardingWizard, ProgressBar, steps/
│   ├── Subscription/   # PremiumFeatureLock, UpgradeBanner
│   ├── Pricing/        # PricingPage
│   ├── UI/             # Button, Card, Input, Modal, PasswordInput, CustomSelect,
│   │                   # CategoryIconSvg, ConfirmDeleteModal, EmptyState, Icon,
│   │                   # LoadingSpinner, Skeleton, PageHeader, StatStrip,
│   │                   # MonthSwitcher, SegmentedControl, CategoryAvatar,
│   │                   # Chip, ProgressBar, ProgressRing, StackedBar
│   ├── Landing/        # HeroPreview (static dashboard mock for the landing hero)
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
**Never use em dashes (—) in translation JSON values** (en or sq). Use commas,
"like", "and", ":", or split into two sentences instead. A pre-write hook
blocks em dashes in `src/locales/**` (see `.claude/settings.json`).

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

## Design System ("Bento", 2026-11)

Full reference: `.claude/design-system.md` (tokens, formulas, invariants). Reference
mockups: `docs/redesign/bento-*.reference.html` (visual spec only, fake numbers).
Rule: no raw hex, px radius, duration or easing in components; only the tokens below.

### Tokens (CSS vars in `src/index.css`, mapped in `tailwind.config.cjs`)
- Surfaces: `bg-page` (mint page), `bg-tile` (white tile), `bg-inner` / `bg-inner-2`
  (panels/tracks inside tiles), `border-line`; text `text-fg`, brand text
  `text-brand-text`; one green hero tile per screen `bg-hero` (+ `bg-hero-inset` chips).
  All derived from BRAND `#0B5D3B`, INK `#0F1F17`, DARK_BASE `#0A0D0B` via `color-mix`.
- Radii: `rounded-tile` 22, `rounded-hero` 32, `rounded-shell` 26, `rounded-inner` 18,
  `rounded-icon` 16, `rounded-input` 14, `rounded-pill`. No `rounded-sm/md/lg/xl/2xl`.
- Motion: `duration-fast/enter/tile/data`, `ease-out-b/spring/std`, animations
  `pop/rise/grow-x/grow-y/draw/row-new`, delays via `--d`; helpers in
  `src/utils/motion.js`; hooks `useCountUp`, `useRevealOnce`, `usePrefersReducedMotion`.
  Entrance once per mount; reduced motion = no animation, final values immediately.

### Typography
- **One face: Manrope** (self-hosted variable, `font-sans` = `font-display`). Mono only for codes.
- Scale: caption 15 (`text-caption`), body 17 (`text-body`), h3 19, h1 clamp(28,3vw,36),
  kpi clamp(40,4vw,52) weight 800 (one per screen). Landing: body 18, h3 22,
  h2 clamp(30,3.2vw,40), h1 clamp(40,4.6vw,60).
- **Nothing below 14px**: no `text-xs`, no `text-[10-13px]`, no `.eyebrow`.
- Weights 600 meta / 700 labels, buttons / 800 numbers. `tabular-nums` on every number.

### Color semantics
- Buttons, chips, filters, toasts, badges are pills. Primary = BRAND fill, hover brand-700.
- **Expense amounts are ink (`text-fg`), not red.** Red `#DC2626` only for over-budget,
  errors, destructive actions. Income = `text-brand-text` with "+"; expense with "−" (U+2212).
- Inputs: `rounded-input`, 2px `--line` border, **BRAND border on focus**.
- Category colors (`colorFromName`) are for icons/bars only, never body text.
- Progress fill: existing budget thresholds (`progressColor`): <70% BRAND, 70..99% WARNING `#B45309`, >=100% EXPENSE (kept by decision 2026-11-18; the spec's 85% was not adopted).

### Dark Mode Text — Critical Rules
All dark mode text is white. `src/index.css` forces this with `!important` outside `@layer` blocks.
- Use `dark:text-white` for primary and secondary text
- Placeholder text: `dark:placeholder:text-white/40`
- **Never** `dark:text-gray-*`, `dark:text-zinc-*`, or `dark:text-ink-dark-*` (JIT cache unreliable)
- Chart/SVG fills: JS-computed hex (`dark ? '#FFFFFF' : INK`) — Tailwind classes don't apply to SVG

### Forbidden ("AI look")
Eyebrows above headings, uppercase tracked labels, gradient text, glows, colored
shadows (except the tile hover lift), pulsing dots, emoji in chrome, accent words in
headings, "01/02/03" numbering, three identical centered cards, fake stats.

## Notes for AI Assistants

1. **API layer is modular** — check `src/utils/api/` (not a single api.js) before adding functions
2. **Use existing UI primitives** — `Button, Card, Input, Modal, CustomSelect, CategoryIconSvg, PasswordInput`. Page layout: every authenticated page starts with `PageHeader`; summary figures go in `StatStrip` (one hairline-divided panel, not equal stat cards); view filters use `SegmentedControl`; month-scoped pages use `MonthSwitcher`; category markers use `CategoryAvatar` (48px `rounded-icon` square, tinted). Every card-like surface is a `Card` tile; progress uses `ProgressBar` / `ProgressRing` / `StackedBar`; chips use `Chip`. Lists (transactions, budgets, recurring, categories) are rows inside one tile, edit/delete revealed on hover and always visible on touch. Pages must not add their own `max-w-* mx-auto px-* py-*` wrapper (AuthenticatedLayout already pads).
3. **i18n both files** — every new string goes in `en/` AND `sq/` simultaneously
4. **Database changes** — new migration in `supabase_migrations/YYYYMMDDHHMMSS_desc.sql` with RLS. For every new table, also add explicit `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;` (and `TO service_role;`, plus `TO anon;` only if anonymous/unauthenticated access is actually needed). Supabase no longer grants Data API access to new `public` tables by default — enforced on new projects since 2026-05-30 and on all existing projects from 2026-10-30. RLS policies remain the real access boundary; the grant only makes the table reachable via supabase-js/PostgREST/GraphQL at all. Without it, calls fail with error `42501`.
5. **Subscription gating** — check `isPremium || isTrialing`, not just `isPremium`
6. **Context management** — when context exceeds ~50%, delegate to subagents or start fresh conversation
7. **Deployment** — frontend auto-deploys on push to `main`; migrations and Edge Functions need manual CLI deploy
8. **mutationCount** — increments on every mutation (add/update/delete); it's a change signal, not a record count
9. **Dark mode** — do not add `dark:text-gray-*` or `dark:text-ink-dark-*`; always `dark:text-white`. Surfaces use the Bento vars, which already switch in `.dark`. See Design System section above.
10. **Performance / Core Web Vitals** — target: Mobile ≥90, Desktop ≥99. Current baselines: Mobile 82→90+, Desktop 99 (SEO 100, Best Practices 100). Rules:
    - **Never add eager imports of heavy libs** (Recharts, PapaParse, Supabase) in components that render on the landing page. Always use `lazy()` + `Suspense`.
    - **Landing hero preview** (`src/components/Landing/HeroPreview.jsx`) is static HTML/CSS + lucide on purpose. Never import Recharts or fetch data in it; the H1 is the LCP element.
    - **LandingPage** itself must stay `lazy()` in `App.jsx` — it was previously an eager import causing Recharts to enter the critical bundle.
    - **CLS rule**: any component mounted inside a `Suspense` that has visible height must have a `fallback` with a matching `minHeight` (or `min-h-*`) so the footer doesn't shift when content loads.
    - **LCP**: the hero has no image; the H1 is the LCP element. If an above-the-fold image is ever reintroduced, give it `loading="eager" fetchPriority="high"`, never `lazy`.
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
