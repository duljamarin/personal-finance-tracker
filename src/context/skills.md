# Context – Developer Skills Guide

This directory holds React Context providers that manage global application state and cross-cutting concerns. All contexts are consumed via their exported custom hooks.

## Required Skills

| Skill | Why It's Needed |
|-------|----------------|
| **React Context API** | All providers are built with `createContext`, `useContext`, and a wrapping `<Provider>` component. |
| **Custom hooks** | Each context exposes a `use*()` hook (e.g. `useAuth()`, `useToast()`). Know the pattern to create and consume them safely. |
| **Async state management** | `AuthContext` and `TransactionContext` perform async operations (Supabase calls); loading and error states must be handled. |
| **Supabase Auth** | `AuthContext` wraps Supabase's `auth.signIn`, `auth.signUp`, `auth.signOut`, and listens to `onAuthStateChange`. |

## Context Files

### `AuthContext.jsx`
Manages user authentication state throughout the app.

**Provides:**
| Value | Type | Description |
|-------|------|-------------|
| `user` | `object \| null` | Currently authenticated Supabase user |
| `session` | `object \| null` | Active Supabase session (contains `access_token`) |
| `loading` | `boolean` | True while auth state is being resolved |
| `error` | `string \| null` | Most recent auth error message |
| `login(email, password)` | `function` | Sign in with email/password |
| `register(email, password)` | `function` | Create a new account |
| `logout()` | `function` | Sign out and clear session |
| `clearError()` | `function` | Reset the error state |

**Key pattern:**
```jsx
const { user, login, logout } = useAuth();
```

---

### `SubscriptionContext.jsx`
Tracks the user's subscription tier and feature limits (free vs. paid via Paddle).

**Skills needed:** Paddle billing concepts, understanding of feature gates.

---

### `ThemeContext.jsx`
Manages the application colour theme (light / dark). Reads from and writes to `localStorage`. Works alongside the `useDarkMode` hook.

---

### `ToastContext.jsx`
Provides a global toast notification system.

**Provides:**
| Value | Type | Description |
|-------|------|-------------|
| `addToast(message, type)` | `function` | Show a toast. `type`: `success`, `error`, `info`, `warning` |

**Key pattern:**
```jsx
const { addToast } = useToast();
addToast(t('transactions.saveSuccess'), 'success');
```

---

### `TransactionContext.jsx`
Shares transaction and category state across components that need it without prop-drilling.

## Conventions

- **Import via custom hooks only** – never use `useContext(SomeContext)` directly in components; use the exported `use*()` hook instead.
- **No business logic in consumers** – keep API calls and data transformations inside the context provider, not in components.
- **Always handle loading states** – check `loading` before rendering data-dependent UI.
- **Lift state here only when shared** – component-local state stays in the component; only promote to context when multiple unrelated components need the same data.
