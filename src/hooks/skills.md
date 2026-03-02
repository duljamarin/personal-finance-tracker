# Hooks – Developer Skills Guide

This directory contains custom React hooks that encapsulate reusable stateful logic shared across multiple components.

## Required Skills

| Skill | Why It's Needed |
|-------|----------------|
| **React hooks** (`useState`, `useEffect`, `useCallback`, `useRef`) | All custom hooks are built on top of React's built-in hooks. |
| **Hook composition** | Hooks can call other hooks. Understand the Rules of Hooks (only call at the top level, only call from React functions). |
| **`localStorage` / `sessionStorage`** | `useDarkMode` persists theme preference to `localStorage`. |
| **Keyboard event handling** | `useKeyboardShortcuts` uses `addEventListener` on `window` and cleans up with the `useEffect` return. |
| **Paddle.js SDK** | `usePaddle` initialises and interacts with the Paddle billing overlay. |

## Hook Reference

### `useDarkMode.js`
Persists and toggles the dark/light theme.

```js
const [isDark, setIsDark] = useDarkMode();
```

- Reads initial value from `localStorage`.
- Adds/removes the `dark` class on `<html>` to activate Tailwind's dark mode.
- Falls back to the OS `prefers-color-scheme` media query on first visit.

**Skills:** `useEffect`, `localStorage`, CSS class manipulation.

---

### `useAsyncAction.js`
Wraps an async function with loading and error state tracking, eliminating repetitive boilerplate in components.

```js
const { execute, loading, error } = useAsyncAction(asyncFn);
```

- Returns `loading: boolean` and `error: string | null`.
- Prevents state updates after component unmount.

**Skills:** `useState`, `useCallback`, async/await error handling.

---

### `useKeyboardShortcuts.js`
Registers global keyboard shortcuts (e.g. `Alt+N` to open the new transaction form).

```js
useKeyboardShortcuts({ 'alt+n': openNewTransaction });
```

- Attaches/detaches event listeners via `useEffect`.
- Parses modifier keys (`alt`, `ctrl`, `shift`, `meta`).

**Skills:** `useEffect` cleanup, `KeyboardEvent`, event delegation.

---

### `usePaddle.js`
Initialises the Paddle.js billing SDK and provides helpers to open checkout overlays.

```js
const { openCheckout } = usePaddle();
```

- Dynamically loads the Paddle script tag if not already present.
- Reads price IDs from `src/config/app.js`.

**Skills:** Dynamic script injection, Paddle.js API, `useEffect`.

## Conventions

- **One responsibility per hook** – if a hook grows beyond one clear concern, split it.
- **Always clean up side effects** – return a cleanup function from `useEffect` for event listeners, timers, and subscriptions.
- **Avoid returning JSX** – hooks return data and functions, not markup (that's a component's job).
- **Test hooks with `@testing-library/react`'s `renderHook`** – see `src/utils/__tests__/` for examples of the testing pattern used in the project.
