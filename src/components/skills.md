# Components – Developer Skills Guide

This directory contains all React UI components for the personal finance tracker. Each subdirectory maps to a feature area of the application.

## Required Skills

### Core
| Skill | Why It's Needed |
|-------|----------------|
| **React 19** | All components are functional components using hooks (`useState`, `useEffect`, `useCallback`, `useMemo`). |
| **React Router 7** | Navigation between pages uses `<Link>`, `useNavigate()`, and `useParams()`. |
| **JSX** | All component markup is written in JSX. |
| **Tailwind CSS 3.4** | Utility-first styling. Every component uses Tailwind classes. |
| **Dark Mode (Tailwind)** | Dark mode is implemented via the `dark:` prefix. Always add dark variants when styling. |

### State & Data
| Skill | Why It's Needed |
|-------|----------------|
| **React Context** | Components consume `AuthContext`, `ToastContext`, `TransactionContext`, and `SubscriptionContext` via their custom hooks. |
| **Async data fetching** | Most feature pages fetch data on mount using `useEffect` + async API calls from `src/utils/api.js`. |
| **Form handling** | Forms use controlled inputs with `useState`. Validation errors map to i18n keys. |

### Internationalisation
| Skill | Why It's Needed |
|-------|----------------|
| **react-i18next** | Every user-facing string must use `useTranslation()` and `t('key')`. Do **not** hardcode strings. |

### Charting
| Skill | Why It's Needed |
|-------|----------------|
| **Recharts 3.5** | `Transactions/` uses `CombinedMonthChart` and `CategoryPieChart`. Understand `ResponsiveContainer`, `BarChart`, `PieChart`. |

## Directory Overview

| Directory | Contents |
|-----------|----------|
| `Auth/` | LoginForm, RegisterForm, ForgotPassword, ResetPassword |
| `Benchmark/` | CategoryBenchmark – compares user spending vs. population averages |
| `Budgets/` | Monthly budget creation and tracking |
| `Categories/` | CRUD for transaction categories (with emoji support) |
| `Dashboard/` | Overview widgets and summary cards |
| `Goals/` | Financial goals, contributions, milestone tracking |
| `HealthScore/` | Financial health score display |
| `Legal/` | Privacy policy, terms of service pages |
| `NetWorth/` | Net worth tracking and history charts |
| `Notifications/` | In-app notification centre |
| `Onboarding/` | First-run wizard for new users |
| `Pricing/` | Subscription plan comparison page |
| `Recurring/` | Recurring transaction management |
| `Subscription/` | Subscription status and billing management (Paddle) |
| `Transaction/` | `TransactionForm` – reusable add/edit form with multi-currency and recurring support |
| `Transactions/` | Transaction list, filters, charts |
| `UI/` | Reusable primitives: `Button`, `Card`, `Input`, `Modal` |

## Conventions

- **Always use components from `UI/`** (`Button`, `Card`, `Input`, `Modal`) rather than raw HTML elements.
- **Never hardcode user-facing text** – use `t('namespace.key')`.
- **Support dark mode** on every new component with `dark:` Tailwind variants.
- **Error handling** – show user feedback via `addToast()` from `ToastContext`.
- **Accessibility** – add `aria-label` / `role` attributes where interactive elements lack visible labels.
