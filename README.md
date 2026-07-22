# Personal Finance Tracker

A full-featured personal finance web app built with React, Tailwind CSS, Vite, and Supabase.

## Features

### Core
- Add, edit, delete transactions (income & expense) with category, tags, and multi-currency support
- Transaction splits - split a single transaction across multiple categories (Premium)
- Recurring transactions - define schedules (daily/weekly/monthly/yearly) that auto-generate entries on app load
- CSV export and CSV import (with auto-creation of unrecognised categories, duplicate detection)
- Category management (add, edit, delete; categories with emoji support)

### Analytics & Insights
- Dashboard with combined monthly income/expense bar chart and category pie chart
- Cash flow forecast on the dashboard
- Financial Reports - summary cards, category breakdown, income breakdown, daily trend, period-over-period comparison, and top transactions
- Financial Health Score - composite monthly score across 4 pillars: budget adherence, income/expense ratio, spending stability, and savings consistency
- Category Benchmarks - compare your spending against your own 6-month averages
- Net Worth tracker - assets & liabilities with historical chart (Premium)

### Budgets & Goals
- Monthly budgets per category with real-time progress tracking
- Financial Goals (savings, debt payoff, investment, purchase) with milestones and contribution tracking

### Free Public Tools (no account required)
- Albanian **salary calculator** (`/tools/salary-calculator`) - net from gross, gross from net, and total employer cost, including income tax and social/health insurance
- Albanian **self-employed calculator** (`/tools/self-employed-calculator`) - take-home with the 0% freelancer profit tax, fixed monthly contributions, and the VAT threshold
- Both are indexable SEO/marketing surfaces, bilingual (en + `/sq`), and shareable without login

### Security & Privacy
- Client-side end-to-end encryption of sensitive transaction data - keys never leave the browser unencrypted
- Password-derived key wrapping with recovery code fallback if the password is lost
- Background migration of existing data when encryption is enabled, with progress banner
- Session-cached unlock (IndexedDB) so users aren't re-prompted every page load; explicit unlock modal on new devices/sessions

### Subscription & Freemium
- Free tier: 100 transactions/month, 30 budgets, 30 recurring rules, 40 goals
- Premium: unlimited everything, net worth, health score details, benchmarks, transaction splits
- Payments via Paddle (monthly & yearly plans) with 5-day free trial
- In-app notifications: budget overruns, recurring due, goal milestones, trial expiring - with per-type, per-threshold notification settings
- Interactive demo workspace on the public landing page

### Auth & UX
- Email/password and Google OAuth sign-in
- In-app browser detection with guidance to open in a real browser (Google blocks OAuth inside Instagram/Facebook/LinkedIn/TikTok webviews)
- Forgot / reset password flow
- "Remember Me" - session is cleared on tab close when not checked; Google OAuth always remembers
- Account management page (profile, password, encryption settings, account deletion)
- Dark mode (persisted via localStorage)
- Internationalisation - English and Albanian (sq) via i18next
- Onboarding checklist wizard for new users
- Keyboard shortcuts (Alt+N to add transaction, Ctrl+K to focus search)
- Legal pages (Terms of Service, Privacy Policy)

### Transactional Email (Resend + Supabase Edge Functions)
- Signup confirmation emails
- Failed payment recovery emails
- Re-engagement campaigns (bulk + single test send)
- Bulk in-app notification broadcasts (+ test send)
- Yearly plan promo emails

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, Recharts |
| Build | Vite 7 |
| Styling | Tailwind CSS 3.4 (dark mode via class strategy) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Email | Resend (via Deno Edge Functions) |
| Payments | Paddle |
| i18n | i18next (English & Albanian) |
| CSV | PapaParse |
| Hosting | Netlify |

## Environment Variables

```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_PADDLE_CLIENT_TOKEN=[paddle-client-token]
VITE_PADDLE_MONTHLY_PRICE_ID=[price-id]
VITE_PADDLE_YEARLY_PRICE_ID=[price-id]
VITE_PADDLE_ENVIRONMENT=sandbox|production
```

Edge Function secrets (set via `supabase secrets set`, never in code):
`SUPABASE_SERVICE_ROLE_KEY`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `RESEND_API_KEY`

## Development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Database

SQL migrations are in `supabase_migrations/`. Run them in order in the Supabase SQL editor. All tables use Row Level Security (RLS) with `auth.uid() = user_id`.

## Edge Functions

Deno Edge Functions live in `supabase/functions/`:
- `paddle-webhook` - Paddle billing event handling
- `get-customer-portal` - Paddle customer portal redirect
- `delete-user` - account deletion
- `send-confirmation-email` - signup confirmation
- `send-failed-payment` - failed payment recovery email
- `send-reengagement-bulk` / `send-reengagement-test` - re-engagement campaigns
- `send-bulk-notification` / `send-bulk-notification-test` - bulk in-app notification broadcasts
- `send-yearly-promo` - yearly plan promo email
