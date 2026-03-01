# Personal Finance Tracker

A full-featured personal finance web app built with React, Tailwind CSS, Vite, and Supabase.

## Features

### Core
- Add, edit, delete transactions (income & expense) with category, tags, and multi-currency support
- Transaction splits — split a single transaction across multiple categories
- Recurring transactions — define schedules (daily/weekly/monthly/yearly) that auto-generate entries on app load
- CSV export and CSV import (with auto-creation of unrecognised categories, duplicate detection)
- Category management (add, edit, delete; categories with emoji support)

### Analytics & Insights
- Dashboard with combined monthly income/expense bar chart and category pie chart
- Financial Health Score — composite monthly score across 4 pillars: budget adherence, income/expense ratio, spending stability, and savings consistency
- Category Benchmarks — compare your spending against your own 6-month averages
- Net Worth tracker — assets & liabilities with historical chart (Premium)

### Budgets & Goals
- Monthly budgets per category with real-time progress tracking
- Financial Goals (savings, debt payoff, investment, purchase) with milestones and contribution tracking

### Subscription & Freemium
- Free tier: 30 transactions/month, 3 budgets, 3 recurring rules, 1 goal
- Premium: unlimited everything, net worth, health score details, benchmarks, transaction splits
- Payments via Paddle (monthly & yearly plans) with 5-day free trial
- In-app notifications: budget overruns, recurring due, goal milestones, trial expiring

### Auth & UX
- Email/password and Google OAuth sign-in
- Forgot / reset password flow
- "Remember Me" — session is cleared on tab close when not checked; Google OAuth always remembers
- Dark mode (persisted via localStorage)
- Internationalisation — English and Albanian (sq) via i18next
- Onboarding checklist for new users
- Keyboard shortcuts (Alt+N to add transaction, Ctrl+K to focus search)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, Recharts |
| Build | Vite 7 |
| Styling | Tailwind CSS 3.4 (dark mode via class strategy) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
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
```

## Development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Database

SQL migrations are in `supabase_migrations/`. Run them in order in the Supabase SQL editor. All tables use Row Level Security (RLS) with `auth.uid() = user_id`.
