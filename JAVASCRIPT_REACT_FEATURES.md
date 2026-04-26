# JavaScript & React Features Used in This Project

A comprehensive reference of every JavaScript (ES6+) and React feature used in the **Personal Finance Tracker** codebase, how each feature works, why it is useful, and where it appears in the project.

---

## Table of Contents

1. [ES Modules (import / export)](#1-es-modules-import--export)
2. [Destructuring](#2-destructuring)
3. [Arrow Functions](#3-arrow-functions)
4. [Template Literals](#4-template-literals)
5. [Spread Operator](#5-spread-operator)
6. [Rest Parameters](#6-rest-parameters)
7. [Default Parameters](#7-default-parameters)
8. [Optional Chaining (?.)](#8-optional-chaining-)
9. [Nullish Coalescing (??)](#9-nullish-coalescing-)
10. [Short-Circuit Evaluation (&& / ||)](#10-short-circuit-evaluation----)
11. [Ternary Operator](#11-ternary-operator)
12. [Async / Await](#12-async--await)
13. [Promises](#13-promises)
14. [try / catch / finally](#14-try--catch--finally)
15. [Array Methods](#15-array-methods)
16. [Object Methods](#16-object-methods)
17. [Set](#17-set)
18. [for...of Loops](#18-forof-loops)
19. [Regular Expressions](#19-regular-expressions)
20. [String Methods](#20-string-methods)
21. [Date Handling](#21-date-handling)
22. [Closures](#22-closures)
23. [Higher-Order Functions](#23-higher-order-functions)
24. [IIFE (Immediately Invoked Function Expression)](#24-iife-immediately-invoked-function-expression)
25. [Computed Property Names](#25-computed-property-names)
26. [Object Shorthand Properties](#26-object-shorthand-properties)
27. [typeof Operator](#27-typeof-operator)
28. [switch Statement](#28-switch-statement)
29. [Blob & URL APIs](#29-blob--url-apis)
30. [JSDoc Comments](#30-jsdoc-comments)
31. [React - useState](#31-react--usestate)
32. [React - useEffect](#32-react--useeffect)
33. [React - useCallback](#33-react--usecallback)
34. [React - useMemo](#34-react--usememo)
35. [React - useContext](#35-react--usecontext)
36. [React - useRef](#36-react--useref)
37. [React - Context API (createContext / Provider)](#37-react--context-api-createcontext--provider)
38. [React - Custom Hooks](#38-react--custom-hooks)
39. [React - Conditional Rendering](#39-react--conditional-rendering)
40. [React - List Rendering with key](#40-react--list-rendering-with-key)
41. [React - Controlled Components](#41-react--controlled-components)
42. [React - Fragments](#42-react--fragments)
43. [React - lazy & Suspense (Code Splitting)](#43-react--lazy--suspense-code-splitting)
44. [React - Event Handling](#44-react--event-handling)
45. [React - Custom Events (dispatchEvent)](#45-react--custom-events-dispatchevent)
46. [React - Prop Spreading](#46-react--prop-spreading)
47. [React - Children Composition](#47-react--children-composition)
48. [React Router - Routes, Route, Navigate](#48-react-router--routes-route-navigate)
49. [React Router - useNavigate, useLocation](#49-react-router--usenavigate-uselocation)
50. [React Router - Link](#50-react-router--link)
51. [i18next - useTranslation](#51-i18next--usetranslation)
52. [Environment Variables (import.meta.env)](#52-environment-variables-importmetaenv)
53. [localStorage & sessionStorage](#53-localstorage--sessionstorage)
54. [Dynamic Script Loading](#54-dynamic-script-loading)
55. [Supabase Real-Time Subscriptions](#55-supabase-real-time-subscriptions)
56. [Tailwind CSS - Dark Mode with Class Strategy](#56-tailwind-css--dark-mode-with-class-strategy)
57. [Vitest & React Testing Library](#57-vitest--react-testing-library)
58. [PapaParse - CSV Parsing](#58-papaparse--csv-parsing)
59. [Recharts - Data Visualization](#59-recharts--data-visualization)
60. [Vite - Build Configuration](#60-vite--build-configuration)

---

## 1. ES Modules (import / export)

### How It Works
ES Modules let you split code into separate files. `export` makes values available to other files; `import` brings them in. The browser/bundler resolves the dependency graph at build time.

### Why It Is Useful
- Keeps code organized, testable, and reusable
- Enables tree-shaking (unused exports are removed from production builds)
- Enforces clear dependency boundaries between files

### How It Is Used in This Project

**Named imports** - importing specific exports by name:
```js
// src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
```

**Default imports** - importing the default export of a module:
```js
// src/App.jsx
import CatchAllRedirect from './components/CatchAllRedirect.jsx';
```

**Named exports** - exporting specific functions or variables:
```js
// src/context/AuthContext.jsx
export function useAuth() {
  return useContext(AuthContext);
}
```

**Default exports** - exporting one primary value per file:
```js
// src/components/UI/Button.jsx
export default function Button({ children, className = '', variant = 'primary', ...props }) {
  // ...
}
```

**Barrel re-exports** - re-exporting everything from several modules through a single index file:
```js
// src/utils/api/index.js
export * from './categories';
export * from './transactions';
export * from './goals';
```

---

## 2. Destructuring

### How It Works
Destructuring lets you unpack values from objects or arrays into individual variables in a single statement.

### Why It Is Useful
- Reduces boilerplate (no need to write `props.name`, `props.id`, etc.)
- Makes function signatures self-documenting
- Works with nested structures and supports default values

### How It Is Used in This Project

**Object destructuring** - extract specific properties from an object:
```js
// src/components/Auth/LoginForm.jsx
const { login, loading, accessToken } = useAuth();
const { t, i18n } = useTranslation();
```

**Array destructuring** - extract items by position (common with `useState`):
```js
// src/hooks/useDarkMode.js
const [dark, setDark] = useState(() => {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
});
```

**Nested destructuring** - extract from nested data structures:
```js
// src/context/AuthContext.jsx
const { data: { session } } = await supabase.auth.getSession();
```

**Destructuring with rest** - collect remaining properties:
```js
// src/components/Transaction/TransactionForm.jsx
const { category, categoryId, currencyCode, exchangeRate, ...rest } = transaction;
```

**Destructuring with renaming** - rename while unpacking:
```js
// src/App.jsx
import { BrowserRouter as Router } from 'react-router-dom';
```

**Destructuring in function parameters** - unpack directly in the function signature:
```js
// src/components/UI/Input.jsx
export default function Input({ label, error, helperText, className = '', required, ...props }) {
  // ...
}
```

---

## 3. Arrow Functions

### How It Works
Arrow functions (`() => {}`) are a shorter syntax for writing functions. They inherit `this` from the enclosing scope (lexical `this`), have no own `arguments` object, and cannot be used as constructors.

### Why It Is Useful
- Concise syntax for callbacks, event handlers, and inline functions
- Lexical `this` eliminates common `this`-binding bugs
- Implicit return for one-expression functions

### How It Is Used in This Project

**Single-expression with implicit return** - no curly braces needed:
```js
// src/utils/classNames.js
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
```

**Block body** - curly braces with explicit `return`:
```js
// src/context/AuthContext.jsx
const login = useCallback(async (email, password, rememberMe = false) => {
  setLoading(true);
  setError(null);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
  } finally {
    setLoading(false);
  }
}, []);
```

**As callback parameters** - common in array methods:
```js
// src/components/Transactions/CategoryPieChart.jsx
const data = Object.entries(categoryTotals)
  .map(([name, value]) => ({
    name: translateCategoryName(name),
    value: parseFloat(value.toFixed(2))
  }))
  .sort((a, b) => b.value - a.value);
```

---

## 4. Template Literals

### How It Works
Backtick-quoted strings (`` ` ` ``) that support embedded expressions via `${expression}` and can span multiple lines.

### Why It Is Useful
- Cleaner string interpolation than concatenation
- Multi-line strings without escape characters
- Expressions can be any valid JS (function calls, ternaries, etc.)

### How It Is Used in This Project

**Variable interpolation**:
```js
// src/components/Transaction/TransactionForm.jsx
`${t('goals.contributions.withdraw')} - ${selectedGoal.name}`
```

**Dynamic CSS classes** - building Tailwind class strings:
```js
// src/components/LanguageSwitcher.jsx
className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
  i18n.language === 'sq'
    ? 'bg-brand-600 text-white shadow-md'
    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800'
}`}
```

**Computed property keys** - in dynamic object creation:
```js
// src/components/Transaction/TransactionForm.jsx
newErrors[`split_${idx}_category`] = 'transactions.categoryError';
```

**Supabase channel names**:
```js
// src/components/Budgets/BudgetsPage.jsx
const channel = supabase.channel(`budgets-live-${user.id}-${selectedYear}-${selectedMonth}`);
```

---

## 5. Spread Operator

### How It Works
The spread operator (`...`) expands iterable elements (arrays) or object properties into individual items. In objects, it copies all enumerable own properties into a new object.

### Why It Is Useful
- Immutable updates - creates new arrays/objects instead of mutating originals (critical for React state)
- Merging objects and arrays concisely
- Forwarding props to child components

### How It Is Used in This Project

**Immutable state updates** - prepending new items without mutating:
```js
// src/context/TransactionContext.jsx
setTransactions(prev => [newItem, ...prev]);
```

**Merging objects** - combining base data with overrides:
```js
// src/components/Transaction/TransactionForm.jsx
const insertData = { ...rest, date: _date, category_id: categoryId, user_id: user.id };
```

**Array concatenation** - building derived arrays:
```js
// src/components/Transactions/Transactions.jsx
const years = ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
```

**Prop forwarding** - passing remaining props to native elements:
```js
// src/components/UI/Button.jsx
<button className={`...${variants[variant]} ${sizes[size]} ${className}`} {...props}>
  {children}
</button>
```

---

## 6. Rest Parameters

### How It Works
The rest syntax (`...name`) collects remaining function arguments or remaining object/array items into a single variable.

### Why It Is Useful
- Create variadic functions (accept any number of arguments)
- Separate "known" properties from "remaining" properties
- Cleaner than the old `arguments` object

### How It Is Used in This Project

**Variadic function** - accept any number of class names:
```js
// src/utils/classNames.js
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
```

**Collecting remaining props** - separate known props from forwarded ones:
```js
// src/components/UI/Button.jsx
export default function Button({ children, className = '', variant = 'primary', size = 'md', ...props }) {
```

**Array rest** - separate the header row from data rows:
```js
// src/utils/importCSV.js
const [headerRow, ...dataRows] = rows;
```

---

## 7. Default Parameters

### How It Works
Function parameters can have default values that are used when the argument is `undefined` or omitted.

### Why It Is Useful
- Eliminates manual checks for missing arguments
- Self-documenting - the default reveals the expected type
- Works with destructured parameters

### How It Is Used in This Project

**Component prop defaults**:
```js
// src/components/UI/Button.jsx
export default function Button({ children, className = '', variant = 'primary', size = 'md', ...props })

// src/components/UI/Card.jsx
export default function Card({ children, className = '', variant = 'default', padding = 'md' })
```

**Function parameter defaults**:
```js
// src/hooks/useDarkMode.js
export default function useDarkMode(storageKey = 'expense_dark_mode') {

// src/utils/csv.js
export function downloadCSV(csv, filename = 'expenses.csv') {

// src/context/AuthContext.jsx
const login = useCallback(async (email, password, rememberMe = false) => {
```

**Validator defaults**:
```js
// src/utils/validators.js
required: (value, message = 'This field is required') => {
  return !value?.toString().trim() ? message : undefined;
},
```

---

## 8. Optional Chaining (?.)

### How It Works
The `?.` operator short-circuits and returns `undefined` if the value on the left is `null` or `undefined`, instead of throwing a TypeError.

### Why It Is Useful
- Safely access deeply nested properties without manual null checks
- Works with property access, method calls, and bracket notation
- Reduces defensive boilerplate

### How It Is Used in This Project

**Safe property access**:
```js
// src/context/AuthContext.jsx
setUser(session?.user ?? null);

// src/components/Transactions/Transactions.jsx
result = result.filter(i => i.date?.startsWith(yearFilter));
```

**Safe method call chain**:
```js
// src/context/AuthContext.jsx
localStorage.setItem('username', data.user?.email?.split('@')[0] || '');
```

**Safe array element access in validation**:
```js
// src/utils/importCSV.js
return row.title?.trim() && row.amount > 0;
```

---

## 9. Nullish Coalescing (??)

### How It Works
`a ?? b` returns `b` only when `a` is `null` or `undefined`. Unlike `||`, it does not trigger on other falsy values like `0`, `""`, or `false`.

### Why It Is Useful
- More precise fallback than `||` for values where `0` or empty string is valid
- Common with React state and API responses where `null` needs a default but `0` does not

### How It Is Used in This Project

```js
// src/context/AuthContext.jsx
setUser(session?.user ?? null);

// src/components/Transaction/TransactionForm.jsx
const [amount, setAmount] = useState(initial?.amount ?? '');

// src/utils/csv.js
const amount = e.amount ?? '';
const exchangeRate = e.exchange_rate ?? '1.0';
const baseAmount = e.base_amount ?? e.amount ?? '';

// src/utils/importCSV.js - resolving a category
return match?.id ?? null;
```

---

## 10. Short-Circuit Evaluation (&& / ||)

### How It Works
- `a && b` - returns `a` if falsy, otherwise `b`
- `a || b` - returns `a` if truthy, otherwise `b`

JavaScript evaluates lazily: the second operand is only evaluated if needed.

### Why It Is Useful
- `&&` is the standard way to conditionally render JSX in React
- `||` provides fallback values (for all falsy values, not just null/undefined)
- Avoids verbose if/else blocks

### How It Is Used in This Project

**Conditional rendering with `&&`**:
```js
// src/components/Dashboard/Dashboard.jsx
{showGreeting && (
  <div className="fixed top-20 ...">
    {t('dashboard.welcomeBack')}, {username}!
  </div>
)}
```

**Fallback values with `||`**:
```js
// src/context/AuthContext.jsx
localStorage.setItem('username', data.user?.email?.split('@')[0] || '');

// src/components/Transaction/TransactionForm.jsx
const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
```

**Error fallback**:
```js
// src/context/AuthContext.jsx
setError(err.message || 'Invalid login credentials');
```

---

## 11. Ternary Operator

### How It Works
`condition ? valueIfTrue : valueIfFalse` - a concise inline `if/else` expression.

### Why It Is Useful
- Returns a value (unlike `if/else`), so it works inside JSX and template literals
- Compact alternative for simple two-branch conditionals

### How It Is Used in This Project

**Conditional CSS classes**:
```js
// src/components/UI/Input.jsx
className={`... ${
  error
    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
    : 'border-gray-200 dark:border-zinc-700'
} ${className}`}
```

**Conditional rendering**:
```js
// src/App.jsx (PrivateRoute)
return accessToken ? children : <Navigate to="/login" replace />;
```

**Conditional values in data transformation**:
```js
// src/utils/csv.js
const typeTranslated = e.type === 'income'
  ? t('transactions.income')
  : e.type === 'expense'
    ? t('transactions.expense')
    : '';
```

---

## 12. Async / Await

### How It Works
`async` makes a function return a Promise. `await` pauses execution inside an `async` function until the awaited Promise resolves, making asynchronous code read like synchronous code.

### Why It Is Useful
- Much more readable than `.then()` chains for sequential async operations
- Natural error handling with `try/catch`
- Can be combined with `Promise.all()` for parallelism

### How It Is Used in This Project

**Data fetching**:
```js
// src/components/Goals/GoalsPage.jsx
const loadGoalsAndStats = async () => {
  try {
    setLoading(true);
    const [goalsData, statsData] = await Promise.all([
      fetchGoals(filterConfig),
      fetchGoalsStats()
    ]);
    setGoals(goalsData);
  } catch (error) {
    addToast(t('goals.toast.error'), 'error');
  } finally {
    setLoading(false);
  }
};
```

**Form submission**:
```js
// src/components/Auth/LoginForm.jsx
async function handleSubmit(e) {
  e.preventDefault();
  if (!validate()) return;
  try {
    await login(email.trim(), password, rememberMe);
    navigate('/');
  } catch (err) {
    setFormError(err.message);
  }
}
```

**Inside useCallback** (memoized async handler):
```js
// src/context/TransactionContext.jsx
const addTransaction = useCallback(async (item) => {
  try {
    const newItem = await apiAddTransaction(item);
    setTransactions(prev => [newItem, ...prev]);
    addToast(t('messages.transactionAdded'), 'success');
  } catch (e) {
    addToast(t('messages.error'), 'error');
  }
}, [addToast, t, refreshSubscription]);
```

---

## 13. Promises

### How It Works
A `Promise` represents an eventual value. It can be in three states: pending, fulfilled, or rejected. Promises can be chained with `.then()` / `.catch()` or consumed with `async/await`.

### Why It Is Useful
- Foundation of all asynchronous JavaScript
- `Promise.all()` enables parallel execution
- Composable - build complex async pipelines

### How It Is Used in This Project

**Promise.all() - parallel data fetching**:
```js
// src/components/Goals/GoalsPage.jsx
const [goalsData, statsData] = await Promise.all([
  fetchGoals(filterConfig),
  fetchGoalsStats()
]);
```

**Promise constructor - wrapping a callback-based API**:
```js
// src/utils/importCSV.js
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete(result) {
        try {
          const parsed = isAppFormat(result.data[0])
            ? parseAppFormat(result.data)
            : parseGenericFormat(result.data);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      },
      error(err) { reject(err); },
    });
  });
}
```

**.then() / .catch() chains**:
```js
// src/components/Header.jsx
getUnreadNotificationCount()
  .then(count => setUnreadCount(count || 0))
  .catch(() => {});
```

---

## 14. try / catch / finally

### How It Works
`try` wraps code that might throw. `catch` handles the error. `finally` always runs, regardless of success or failure.

### Why It Is Useful
- Structured error handling for sync and async code
- `finally` is perfect for cleanup (e.g., stopping a loading spinner)
- Prevents uncaught exceptions from crashing the app

### How It Is Used in This Project

**Standard pattern with loading state**:
```js
// src/components/Goals/GoalsPage.jsx
try {
  setLoading(true);
  const [goalsData] = await Promise.all([fetchGoals(filterConfig), fetchGoalsStats()]);
  setGoals(goalsData);
} catch (error) {
  console.error('Error loading goals:', error);
  addToast(t('goals.toast.error'), 'error');
} finally {
  setLoading(false);
}
```

**Auth error handling** - re-throwing after recording the error:
```js
// src/context/AuthContext.jsx
try {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setSession(data.session);
} catch (err) {
  setError(err.message || 'Invalid login credentials');
  throw err;
} finally {
  setLoading(false);
}
```

**Silent error handling** - catch without action (for non-critical storage):
```js
// src/hooks/useDarkMode.js
useEffect(() => {
  try {
    localStorage.setItem(storageKey, dark ? '1' : '0');
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch {}
}, [dark, storageKey]);
```

---

## 15. Array Methods

### How It Works
Built-in methods on `Array.prototype` that apply functions to each element and return new values without mutating the original array (in most cases).

### Why It Is Useful
- Declarative, functional style - describe _what_ you want, not _how_
- Chainable - combine multiple transformations
- Immutable returns - safe for React state

### How It Is Used in This Project

**`.map()`** - transform each element:
```js
// src/components/Transactions/CategoryPieChart.jsx
const data = Object.entries(categoryTotals).map(([name, value]) => ({
  name: translateCategoryName(name),
  value: parseFloat(value.toFixed(2))
}));
```

**`.filter()`** - select a subset:
```js
// src/context/TransactionContext.jsx
const totalIncome = transactions
  .filter(tx => tx.type === 'income')
  .reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0);
```

**`.reduce()`** - aggregate into a single value:
```js
// src/components/Transactions/CategoryPieChart.jsx
const total = data.reduce((sum, item) => sum + item.value, 0);
```

**`.find()`** - get the first match:
```js
// src/components/Transaction/TransactionForm.jsx
const matchedCategory = categories.find(c => c.name === tpl.categoryHint);
```

**`.some()`** - check if any element matches:
```js
// src/context/TransactionContext.jsx
Array.isArray(i.tags) && i.tags.some(tag => tag.toLowerCase().includes(q))
```

**`.every()`** - check if all elements match:
```js
// src/utils/importCSV.js
return APP_HEADERS.slice(1, 5).every(key => h.includes(key));
```

**`.forEach()`** - side-effect iteration:
```js
// src/context/AuthContext.jsx
storageKeys.forEach(k => localStorage.removeItem(k));
```

**`.sort()`** - order elements:
```js
// src/components/Transactions/Transactions.jsx
const years = ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
```

**`.slice()`** - extract a portion (pagination):
```js
// src/components/Transactions/Transactions.jsx
return filtered.slice(0, INITIAL_DISPLAY_COUNT);
```

**`.join()`** - combine into a string:
```js
// src/utils/csv.js
const tags = Array.isArray(e.tags) ? e.tags.join(', ').replace(/"/g, '""') : '';
```

**`Array.from()`** - convert iterables (like Set) to arrays:
```js
// src/components/Transactions/Transactions.jsx
const years = ['All', ...Array.from(set).sort(...)];
```

---

## 16. Object Methods

### How It Works
Static methods on the `Object` constructor that let you introspect and transform plain objects.

### Why It Is Useful
- `Object.entries()` turns objects into iterable `[key, value]` pairs - essential for `.map()` over objects
- `Object.keys()` / `Object.values()` extract just keys or values
- Works well with functional transformations

### How It Is Used in This Project

**`Object.entries()`** - iterate over key-value pairs:
```js
// src/utils/categoryTranslation.js
const data = Object.entries(categoryTotals).map(([name, value]) => ({
  name: translateCategoryName(name),
  value: parseFloat(value.toFixed(2))
}));

// src/utils/validators.js
for (const [field, rules] of Object.entries(schema)) {
  const error = validateField(values[field], rules);
  if (error) errors[field] = error;
}
```

**`Object.values()`** - extract all values:
```js
// src/test/setup.js
Object.values(timerRefs.current).forEach(clearTimeout);
```

**`Object.defineProperty()`** - define property descriptors (test setup):
```js
// src/test/setup.js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({ matches: false, ... })),
});
```

---

## 17. Set

### How It Works
A `Set` is a collection of unique values. Adding a duplicate has no effect. It provides `.has()`, `.size`, `.add()`, `.delete()`, and is iterable.

### Why It Is Useful
- Automatic deduplication
- O(1) lookups with `.has()` - much faster than `Array.includes()` for large lists
- Easily convertible to arrays with `Array.from()` or spread

### How It Is Used in This Project

**Deduplicate years for a filter dropdown**:
```js
// src/components/Transactions/Transactions.jsx
const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'));
const years = ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
```

**Detect mixed currencies**:
```js
// src/context/TransactionContext.jsx
const currencies = new Set(transactions.map(tx => tx.currency_code || tx.currencyCode || 'EUR'));
return currencies.size > 1;
```

**Duplicate detection in CSV import**:
```js
// src/utils/importCSV.js
const existingKeys = new Set(
  existing.map(t => `${t.date}|${Number(t.amount).toFixed(2)}|${(t.title || '').toLowerCase().trim()}`)
);
return new Set(
  candidates
    .filter(c => existingKeys.has(`${c.date}|...`))
    .map(c => `${c.date}|...`)
);
```

---

## 18. for...of Loops

### How It Works
`for...of` iterates over iterable objects (arrays, strings, Maps, Sets, generators). Unlike `.forEach()`, it supports `break`, `continue`, and `return`.

### Why It Is Useful
- Works with any iterable (not just arrays)
- Supports early exit with `break` - important for validation that should stop at the first error
- Cleaner than indexed `for` loops

### How It Is Used in This Project

**Keyboard shortcut matching** (break on first match):
```js
// src/hooks/useKeyboardShortcuts.js
for (const shortcut of shortcuts) {
  const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey);
  if (e.key === shortcut.key && ctrlMatch && altMatch && shiftMatch) {
    e.preventDefault();
    shortcut.action();
    break;
  }
}
```

**Form validation** (stop at first error per field):
```js
// src/utils/validators.js
export function validateField(value, rules) {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return undefined;
}
```

**Schema iteration**:
```js
// src/utils/validators.js
for (const [field, rules] of Object.entries(schema)) {
  const error = validateField(values[field], rules);
  if (error) errors[field] = error;
}
```

---

## 19. Regular Expressions

### How It Works
Regex patterns describe text patterns for matching, searching, and replacing. JavaScript supports them as literals (`/pattern/flags`) and via `RegExp` constructor.

### Why It Is Useful
- Validate formats (emails, dates, etc.)
- Parse and transform structured text
- Pattern matching on user input

### How It Is Used in This Project

**Email validation**:
```js
// src/components/Auth/LoginForm.jsx
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
```

**Date format detection and parsing**:
```js
// src/utils/importCSV.js
if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                     // YYYY-MM-DD
const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);   // DD/MM/YYYY
if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`; // YYYYMMDD
```

**CSV escaping** - escape double quotes:
```js
// src/utils/csv.js
const title = String(e.title || '').replace(/"/g, '""');
```

**Stripping non-numeric characters** from bank CSV amounts:
```js
// src/utils/importCSV.js
const raw = parseFloat((r[amountCol] || '0').replace(/[^0-9.\-]/g, ''));
```

---

## 20. String Methods

### How It Works
Built-in methods on `String.prototype` for searching, extracting, transforming, and testing strings.

### Why It Is Useful
- Concise text processing without regex for simple cases
- Chainable - combine multiple transformations
- Essential for search, validation, and display formatting

### How It Is Used in This Project

**`.includes()`** - search for a substring:
```js
// src/components/Transactions/Transactions.jsx
i.title?.toLowerCase().includes(q)
```

**`.startsWith()`** - check date prefix:
```js
result = result.filter(i => i.date?.startsWith(yearFilter));
```

**`.trim()`** - remove whitespace:
```js
// src/utils/validators.js
return !value?.toString().trim() ? message : undefined;
```

**`.toLowerCase()`** - case-insensitive comparison:
```js
const q = searchQuery.trim().toLowerCase();
```

**`.split()`** - break into parts:
```js
// src/utils/importCSV.js
tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []
```

**`.replace()`** - transform text:
```js
const title = String(e.title || '').replace(/"/g, '""');
```

**`.padStart()`** - format dates:
```js
// src/utils/importCSV.js
return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
```

**`.slice()`** - extract substrings:
```js
// src/utils/csv.js
dateStr = d.toISOString().slice(0, 10);
```

**`.localeCompare()`** - locale-aware sorting:
```js
const years = ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
```

---

## 21. Date Handling

### How It Works
The `Date` constructor creates date objects. Methods like `.toISOString()`, `.getFullYear()`, `.getMonth()`, `.toLocaleDateString()` extract or format date information.

### Why It Is Useful
- Parse, format, and compare dates
- Calculate time differences (durations, "days left")
- Generate current-date defaults for forms

### How It Is Used in This Project

**Current date as form default**:
```js
// src/components/Transaction/TransactionForm.jsx
const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
```

**Getting current year/month for budgets**:
```js
// src/components/Budgets/BudgetsPage.jsx
const today = new Date();
const [selectedYear, setSelectedYear] = useState(today.getFullYear());
const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
```

**Days-left calculation**:
```js
// src/components/Goals/GoalCard.jsx
const daysLeft = goal.target_date
  ? Math.ceil((new Date(goal.target_date + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24))
  : null;
```

**Date arithmetic** - calculating end dates:
```js
// src/utils/recurringValidation.js
minEndDate.setDate(minEndDate.getDate() + interval);
minEndDate.setMonth(minEndDate.getMonth() + interval);
minEndDate.setFullYear(minEndDate.getFullYear() + interval);
```

**Locale-aware formatting**:
```js
// src/components/Subscription/UpgradeBanner.jsx
new Date(subscription.period_end).toLocaleDateString();
```

---

## 22. Closures

### How It Works
A closure is a function that remembers variables from the scope where it was created, even after that scope has finished executing. Every function in JavaScript forms a closure over its lexical environment.

### Why It Is Useful
- Enables data privacy (encapsulated state)
- Powers React hooks (state persists between renders via closures)
- Essential for event handlers that reference component state

### How It Is Used in This Project

**useCallback closures over state setters and context**:
```js
// src/context/TransactionContext.jsx
const addTransaction = useCallback(async (item) => {
  const newItem = await apiAddTransaction(item);
  setTransactions(prev => [newItem, ...prev]);   // closes over setTransactions
  addToast(t('messages.transactionAdded'), 'success'); // closes over addToast, t
}, [addToast, t, refreshSubscription]);
```

**Click-outside handler** closing over a ref:
```js
// src/components/Header.jsx
function handleClickOutside(e) {
  if (profileRef.current && !profileRef.current.contains(e.target)) {
    setProfileOpen(false);   // closes over setProfileOpen and profileRef
  }
}
```

**Timer with cleanup** closing over the timer ID:
```js
// src/components/Dashboard/Dashboard.jsx
useEffect(() => {
  if (username) {
    setShowGreeting(true);
    const timer = setTimeout(() => setShowGreeting(false), 3500);
    return () => clearTimeout(timer);   // closes over `timer`
  }
}, [username]);
```

---

## 23. Higher-Order Functions

### How It Works
A function that takes another function as an argument, returns a function, or both. `.map()`, `.filter()`, `.reduce()` are all higher-order functions.

### Why It Is Useful
- Enables function composition and reuse
- Foundation of functional programming patterns
- Allows creating specialized functions from general ones

### How It Is Used in This Project

**Auth wrapper** - accepts a function, calls it with the authenticated user:
```js
// src/utils/api/_auth.js
export async function withAuth(fn) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please log in to perform this action');
  return fn(user);
}
```

**Custom hook returning a function** - `useAsyncAction` returns `executeAction`:
```js
// src/hooks/useAsyncAction.js
export function useAsyncAction() {
  const { addToast } = useToast();
  const { t } = useTranslation();

  const executeAction = async (action, successMessage, errorMessage = 'messages.error') => {
    try {
      const result = await action();     // <-- takes a function as argument
      if (successMessage) addToast(t(successMessage), 'success');
      return result;
    } catch (error) {
      addToast(t(errorMessage), 'error');
      throw error;
    }
  };

  return executeAction;   // <-- returns a function
}
```

**Chained array callbacks** - transforming data in a pipeline:
```js
// src/components/Transactions/CategoryPieChart.jsx
Object.entries(categoryTotals)
  .map(([name, value]) => ({ name: translateCategoryName(name), value: parseFloat(value.toFixed(2)) }))
  .sort((a, b) => b.value - a.value);
```

---

## 24. IIFE (Immediately Invoked Function Expression)

### How It Works
A function that is defined and called in one expression: `(() => { ... })()`. Creates a private scope.

### Why It Is Useful
- Encapsulate logic that should run once
- Create private variables (e.g., a mock store in tests)
- Avoid polluting the surrounding scope

### How It Is Used in This Project

**Mock localStorage factory** in test setup:
```js
// src/test/setup.js
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

---

## 25. Computed Property Names

### How It Works
In object literals, you can use expressions in brackets `[expr]` as property keys. The expression is evaluated at runtime.

### Why It Is Useful
- Create dynamic property names from variables
- Essential for building error objects keyed by field name
- Removes the need for temporary variables

### How It Is Used in This Project

**Dynamic form error keys**:
```js
// src/components/Transaction/TransactionForm.jsx
newErrors[`split_${idx}_category`] = 'transactions.categoryError';
```

**Building objects from runtime values**:
```js
// src/components/Transaction/TransactionForm.jsx
setErrors(prev => ({
  ...prev,
  title: value.trim() ? undefined : 'transactions.titleError'
}));
```

---

## 26. Object Shorthand Properties

### How It Works
When a variable name matches the desired property name, you can omit the colon: `{ name }` instead of `{ name: name }`.

### Why It Is Useful
- Reduces repetition
- Cleaner object construction, especially in Context Providers

### How It Is Used in This Project

**Context value objects**:
```js
// src/context/TransactionContext.jsx
<TransactionContext.Provider value={{
  transactions,
  loading,
  error,
  categories,
  totalIncome,
  totalExpense,
  net,
  hasMixedCurrencies,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  reloadTransactions,
  reloadCategories,
}}>
```

---

## 27. typeof Operator

### How It Works
`typeof` returns a string indicating the type of the operand: `"string"`, `"number"`, `"boolean"`, `"object"`, `"undefined"`, `"function"`, `"symbol"`, `"bigint"`.

### Why It Is Useful
- Type checking before operations
- Guarding against calling non-functions
- Validating data at system boundaries

### How It Is Used in This Project

```js
// src/context/ToastContext.jsx
if (typeof addToast === 'function')
```

---

## 28. switch Statement

### How It Works
`switch` evaluates an expression and matches it against `case` clauses using strict equality. Execution falls through until a `break` or `return`.

### Why It Is Useful
- Cleaner than a long `if/else if/else` chain for multiple discrete values
- Commonly used for state machines, type dispatching, and event handling

### How It Is Used in This Project

**Health score insight rendering**:
```js
// src/components/HealthScore/HealthScore.jsx
switch (insight.type) {
  case 'income_expense':
    if (insight.status === 'positive') {
      return t('healthScore.insightSavingsPositive', { amount: insight.savings.toFixed(2) });
    }
    break;
  case 'budget':
    if (insight.status === 'all_good') return t('healthScore.insightBudgetGood');
    break;
  default:
    return '';
}
```

---

## 29. Blob & URL APIs

### How It Works
`Blob` creates binary data objects. `URL.createObjectURL()` creates a temporary URL pointing to a Blob. Together they allow client-side file generation and download.

### Why It Is Useful
- Generate and download files (CSV, reports) without a server
- Trigger downloads via an invisible anchor element
- Memory-managed via `URL.revokeObjectURL()`

### How It Is Used in This Project

**CSV download**:
```js
// src/utils/csv.js
export function downloadCSV(csv, filename = 'expenses.csv') {
  const blob = new Blob(["\uFEFF", csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

---

## 30. JSDoc Comments

### How It Works
Structured comments (`/** ... */`) with tags like `@param`, `@returns`, `@typedef` that describe types and behavior. Modern editors use them for IntelliSense.

### Why It Is Useful
- Editor autocompletion and type checking without TypeScript
- Self-documenting API surface
- Tools can generate documentation from these comments

### How It Is Used in This Project

```js
// src/utils/importCSV.js
/**
 * @typedef {Object} ImportRow
 * @property {string}  title
 * @property {number}  amount        always positive
 * @property {'income'|'expense'} type
 * @property {string}  date          YYYY-MM-DD
 * @property {string}  categoryName  raw string - caller resolves to categoryId
 * @property {string[]} tags
 * @property {string}  currencyCode  default 'EUR'
 * @property {number}  exchangeRate  default 1.0
 */

// src/hooks/useAsyncAction.js
/**
 * Executes an async action with error handling and toast notifications
 * @param {Function} action - The async function to execute
 * @param {string} successMessage - Optional success message translation key
 * @returns {Promise<any>} Result of the action
 */
```

---

## 31. React - useState

### How It Works
`useState(initialValue)` returns `[currentValue, setterFn]`. Calling the setter triggers a re-render with the new value. React preserves state between renders.

### Why It Is Useful
- The primary way to add local state to functional components
- Supports lazy initialization (pass a function to avoid expensive computations on every render)
- Setter can accept a function for state based on the previous value

### How It Is Used in This Project

**Simple state**:
```js
// src/components/Transactions/Transactions.jsx
const [yearFilter, setYearFilter] = useState('All');
const [showModal, setShowModal] = useState(false);
```

**Lazy initialization** - only runs on first render:
```js
// src/hooks/useDarkMode.js
const [dark, setDark] = useState(() => {
  try {
    return localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
});
```

**Functional updater** - new state based on previous:
```js
// src/context/TransactionContext.jsx
setTransactions(prev => [newItem, ...prev]);

// src/components/Transaction/TransactionForm.jsx
setErrors(prev => ({
  ...prev,
  title: value.trim() ? undefined : 'transactions.titleError'
}));
```

---

## 32. React - useEffect

### How It Works
`useEffect(setup, dependencies?)` runs side effects after render. The dependency array controls when the effect re-runs. Returning a function from the setup provides cleanup.

### Why It Is Useful
- Replaces lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`)
- Manages side effects: data fetching, subscriptions, DOM manipulation, timers
- Cleanup function prevents memory leaks

### How It Is Used in This Project

**Data fetching on dependency change**:
```js
// src/components/Goals/GoalsPage.jsx
useEffect(() => {
  loadGoalsAndStats();
}, [filter]);
```

**DOM side effect**:
```js
// src/hooks/useDarkMode.js
useEffect(() => {
  localStorage.setItem(storageKey, dark ? '1' : '0');
  if (dark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}, [dark, storageKey]);
```

**Event listener with cleanup**:
```js
// src/context/AuthContext.jsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
  });
  window.addEventListener('storage', handleStorage);
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    subscription.unsubscribe();
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, []);
```

**Timer with cleanup**:
```js
// src/components/Dashboard/Dashboard.jsx
useEffect(() => {
  if (username) {
    setShowGreeting(true);
    const timer = setTimeout(() => setShowGreeting(false), 3500);
    return () => clearTimeout(timer);
  }
}, [username]);
```

---

## 33. React - useCallback

### How It Works
`useCallback(fn, deps)` returns a memoized version of the function that only changes if the dependencies change. Identity-stable across renders.

### Why It Is Useful
- Prevents unnecessary re-renders of child components that receive the function as a prop
- Required for functions passed as effect dependencies
- Essential when functions are used in `useMemo`, `useEffect`, or `React.memo` children

### How It Is Used in This Project

**Memoized API calls**:
```js
// src/context/TransactionContext.jsx
const addTransaction = useCallback(async (item) => {
  try {
    const newItem = await apiAddTransaction(item);
    setTransactions(prev => [newItem, ...prev]);
    addToast(t('messages.transactionAdded'), 'success');
    refreshSubscription();
  } catch (e) {
    addToast(t('messages.error'), 'error');
  }
}, [addToast, t, refreshSubscription]);
```

**Memoized reload functions**:
```js
// src/components/Dashboard/Dashboard.jsx
const refreshBudgetCount = useCallback(async () => {
  try {
    const now = new Date();
    const data = await fetchBudgets(now.getFullYear(), now.getMonth() + 1);
    setBudgetCount(data.length);
  } catch { /* ignore */ } finally {
    setBudgetsLoaded(true);
  }
}, []);
```

---

## 34. React - useMemo

### How It Works
`useMemo(() => computeExpensiveValue, deps)` memoizes the return value of a computation, only recalculating when dependencies change.

### Why It Is Useful
- Avoids expensive recalculations on every render
- Derives computed values from state efficiently
- Maintains referential equality for objects/arrays passed to children

### How It Is Used in This Project

**Derived aggregations**:
```js
// src/context/TransactionContext.jsx
const totalIncome = useMemo(
  () => transactions.filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.base_amount || tx.amount || 0), 0),
  [transactions]
);
```

**Derived filter options**:
```js
// src/components/Transactions/Transactions.jsx
const years = useMemo(() => {
  const set = new Set(items.map(i => i.date?.slice(0, 4) || 'Unknown'));
  return ['All', ...Array.from(set).sort((a, b) => b.localeCompare(a))];
}, [items]);
```

**Mixed currency detection**:
```js
// src/context/TransactionContext.jsx
const hasMixedCurrencies = useMemo(() => {
  const currencies = new Set(transactions.map(tx => tx.currency_code || tx.currencyCode || 'EUR'));
  return currencies.size > 1;
}, [transactions]);
```

---

## 35. React - useContext

### How It Works
`useContext(SomeContext)` reads the current value of a React context. The component re-renders whenever the context value changes.

### Why It Is Useful
- Avoids prop drilling - any nested component can access shared state
- Combined with `createContext` and Provider, it forms a lightweight state management system
- Replace Redux for simple-to-moderate state needs

### How It Is Used in This Project

**Consuming auth state**:
```js
// src/context/AuthContext.jsx
export function useAuth() {
  return useContext(AuthContext);
}

// In any component:
const { accessToken, user, logout } = useAuth();
```

**Consuming multiple contexts**:
```js
// src/components/Dashboard/Dashboard.jsx
const { transactions, loading } = useTransactions();
const { isPremium } = useSubscription();
const { t } = useTranslation();
```

---

## 36. React - useRef

### How It Works
`useRef(initialValue)` returns a mutable object `{ current: initialValue }` that persists across renders without causing re-renders.

### Why It Is Useful
- Access DOM elements directly (e.g., focusing inputs, measuring layout)
- Store mutable values that should not trigger re-renders (e.g., timers, WebSocket refs)
- Track previous values or in-flight request flags

### How It Is Used in This Project

**DOM element access** - click-outside detection:
```js
// src/components/Header.jsx
const profileRef = useRef(null);
const moreRef = useRef(null);

// In event handler:
if (profileRef.current && !profileRef.current.contains(e.target)) {
  setProfileOpen(false);
}
```

**Mutable flags** - preventing duplicate requests:
```js
// src/context/SubscriptionContext.jsx
const refreshInFlightRef = useRef(null);
const pollTimerRef = useRef(null);
```

---

## 37. React - Context API (createContext / Provider)

### How It Works
`createContext()` creates a context object. The `<Context.Provider value={...}>` component makes that value available to all descendants. Any child calls `useContext(Context)` to read it.

### Why It Is Useful
- Global/shared state without prop drilling
- Multiple independent contexts for different concerns (auth, theme, toasts, etc.)
- Lightweight alternative to Redux for most applications

### How It Is Used in This Project

The app uses **five nested context providers**:

```jsx
// src/App.jsx
<AuthProvider>
  <ToastProvider>
    <ThemeProvider>
      <SubscriptionProvider>
        <TransactionProvider>
          <Router>
            <InnerAppContent />
          </Router>
        </TransactionProvider>
      </SubscriptionProvider>
    </ThemeProvider>
  </ToastProvider>
</AuthProvider>
```

Each context follows the same pattern:

```js
// src/context/TransactionContext.jsx
const TransactionContext = createContext();

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  // ... business logic ...
  return (
    <TransactionContext.Provider value={{ transactions, loading, addTransaction, ... }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  return useContext(TransactionContext);
}
```

| Context | Purpose |
|---------|---------|
| `AuthContext` | User session, login, logout, register |
| `ToastContext` | Toast notification queue |
| `ThemeContext` | Dark/light mode toggle |
| `SubscriptionContext` | Premium status, trial info |
| `TransactionContext` | Transaction list, CRUD, categories |

---

## 38. React - Custom Hooks

### How It Works
Custom hooks are JavaScript functions whose names start with `use`. They can call other hooks and encapsulate reusable stateful logic.

### Why It Is Useful
- Extract and share logic across components (DRY)
- Composable - custom hooks can call other custom hooks
- Testable in isolation

### Custom Hooks in This Project

**`useDarkMode`** - persisted dark mode toggle:
```js
// src/hooks/useDarkMode.js
export default function useDarkMode(storageKey = 'expense_dark_mode') {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  useEffect(() => {
    localStorage.setItem(storageKey, dark ? '1' : '0');
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark, storageKey]);
  return [dark, setDark];
}
```

**`useAsyncAction`** - reusable async error handling with toast:
```js
// src/hooks/useAsyncAction.js
export function useAsyncAction() {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const executeAction = async (action, successMessage, errorMessage = 'messages.error') => {
    try {
      const result = await action();
      if (successMessage) addToast(t(successMessage), 'success');
      return result;
    } catch (error) {
      addToast(t(errorMessage), 'error');
      throw error;
    }
  };
  return executeAction;
}
```

**`useKeyboardShortcuts`** - declarative global keyboard shortcuts:
```js
// src/hooks/useKeyboardShortcuts.js
export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handleKeyDown(e) {
      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key && /* modifier matching */) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

**`usePaddle`** - loads the Paddle.js payment SDK:
```js
// src/hooks/usePaddle.js
export function usePaddle() {
  const [paddle, setPaddle] = useState(null);
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      window.Paddle.Initialize({ token, eventCallback: (event) => {
        window.dispatchEvent(new CustomEvent('paddle-event', { detail: event }));
      }});
      setPaddle(window.Paddle);
    };
    document.head.appendChild(script);
  }, []);
  return paddle;
}
```

---

## 39. React - Conditional Rendering

### How It Works
In JSX, you can render different UI based on conditions using `&&`, ternaries, or early returns.

### Why It Is Useful
- Show/hide elements based on state (loading, errors, auth status)
- Render different layouts for different user roles or data states
- Core to building dynamic user interfaces

### How It Is Used in This Project

**Early return guard** - protected routes:
```js
// src/App.jsx (PrivateRoute)
if (loading) return <LoadingSpinner />;
return accessToken ? children : <Navigate to="/login" replace />;
```

**`&&` operator** - show when truthy:
```js
// src/components/Dashboard/Dashboard.jsx
{showGreeting && (
  <div className="...">{t('dashboard.welcomeBack')}, {username}!</div>
)}
```

**Ternary** - choose between two elements:
```js
// src/components/UI/Input.jsx
{error
  ? <p className="text-red-500">{error}</p>
  : helperText && <p className="text-gray-500">{helperText}</p>
}
```

---

## 40. React - List Rendering with key

### How It Works
`.map()` in JSX creates a list of elements. Each element needs a unique `key` prop so React can track which items changed, were added, or removed.

### Why It Is Useful
- Efficient DOM updates - React only modifies changed items
- Prevents bugs from incorrect element reuse
- Required by React - missing keys produce console warnings

### How It Is Used in This Project

```jsx
// src/components/Goals/GoalsPage.jsx
{goals.map(goal => (
  <GoalCard
    key={goal.id}
    goal={goal}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onAddContribution={handleContribution}
  />
))}

// src/components/Transactions/Transactions.jsx
{QUICK_TEMPLATES.map((tpl) => (
  <button key={tpl.titleKey} onClick={() => fillFromTemplate(tpl)}>
    {tpl.icon} {t(tpl.titleKey)}
  </button>
))}
```

---

## 41. React - Controlled Components

### How It Works
A controlled component has its value driven by React state. The `value` prop is set from state, and `onChange` updates that state. React is the "single source of truth."

### Why It Is Useful
- React state always reflects the current form value
- Enables instant validation, formatting, and conditional logic
- Predictable behavior - no hidden DOM state

### How It Is Used in This Project

```jsx
// src/components/Auth/LoginForm.jsx
<input
  type="text"
  value={email}
  onChange={e => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  }}
  placeholder={t('auth.emailPlaceholder')}
/>
```

**Reactive validation** - errors clear as the user types:
```js
// src/components/Transaction/TransactionForm.jsx
function handleTitleChange(e) {
  const value = e.target.value;
  setTitle(value);
  setErrors(prev => ({
    ...prev,
    title: value.trim() ? undefined : 'transactions.titleError'
  }));
}
```

---

## 42. React - Fragments

### How It Works
`<>...</>` (or `<React.Fragment>`) lets you group children without adding an extra DOM node.

### Why It Is Useful
- Avoids unnecessary wrapper `<div>` elements
- Cleaner DOM tree and CSS structure
- Supports the `key` prop on the long form

### How It Is Used in This Project

```jsx
// src/App.jsx (AuthGlobalUI)
return (
  <>
    {authError && (
      <div className="fixed top-4 left-1/2 z-50 bg-red-50 ...">
        {getErrorMessage(authError)}
      </div>
    )}
    {authLoading && (
      <div className="fixed inset-0 z-50 ...">
        <LoadingSpinner />
      </div>
    )}
  </>
);
```

---

## 43. React - lazy & Suspense (Code Splitting)

### How It Works
`React.lazy(() => import('./Component'))` loads a component only when it's first rendered. `<Suspense fallback={...}>` shows a loading state while the chunk is being fetched.

### Why It Is Useful
- Reduces initial bundle size - code is split into on-demand chunks
- Faster initial page load (Time to Interactive)
- Framework handles loading states automatically

### How It Is Used in This Project

```js
// src/components/Dashboard/Dashboard.jsx
const Transactions = lazy(() => import('../Transactions/Transactions'));
const CategoryPieChart = lazy(() => import('../Transactions/CategoryPieChart'));
const CategoryBenchmark = lazy(() => import('../Benchmark/CategoryBenchmark'));
```

```jsx
<Suspense fallback={<LoadingSpinner size="md" text={t('dashboard.loadingData')} />}>
  {loading ? <LoadingSpinner /> : <Transactions />}
</Suspense>
```

---

## 44. React - Event Handling

### How It Works
React uses synthetic events that wrap native browser events. Events are attached via JSX attributes like `onClick`, `onChange`, `onSubmit`.

### Why It Is Useful
- Cross-browser normalization
- Event delegation - React attaches a single listener at the root
- Follows a consistent naming convention (camelCase)

### How It Is Used in This Project

**Form submission**:
```jsx
<form onSubmit={handleSubmit}>
```

**Click handler**:
```jsx
<button onClick={() => setShowModal(true)}>Add</button>
```

**Backdrop click** - close modal on click outside:
```jsx
// src/components/UI/Modal.jsx
onClick={(e) => {
  if (e.target === e.currentTarget) onClose();
}}
```

**Keyboard events** - close modal on Escape:
```js
// src/components/UI/Modal.jsx
useEffect(() => {
  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose();
  }
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

**`preventDefault()`** - preventing form reload and default key behavior:
```js
// src/components/Auth/LoginForm.jsx
async function handleSubmit(e) {
  e.preventDefault();
  // ...
}
```

---

## 45. React - Custom Events (dispatchEvent)

### How It Works
`window.dispatchEvent(new CustomEvent('name', { detail: data }))` fires a custom DOM event. Any listener registered with `window.addEventListener('name', handler)` receives it.

### Why It Is Useful
- Cross-component communication without shared state
- Decoupled - the sender does not need to know about the receiver
- Works across React boundaries (e.g., third-party SDK callbacks)

### How It Is Used in This Project

**Dashboard → Transactions communication**:
```js
// src/components/Dashboard/Dashboard.jsx (sender)
window.dispatchEvent(new CustomEvent('openAddTransaction'));

// src/components/Transactions/Transactions.jsx (receiver)
window.addEventListener('openAddTransaction', handleOpenAdd);
return () => window.removeEventListener('openAddTransaction', handleOpenAdd);
```

**Paddle SDK → SubscriptionContext**:
```js
// src/hooks/usePaddle.js (sender)
window.dispatchEvent(new CustomEvent('paddle-event', { detail: event }));

// src/context/SubscriptionContext.jsx (receiver)
window.addEventListener('paddle-event', handlePaddleEvent);
```

---

## 46. React - Prop Spreading

### How It Works
`{...props}` passes all remaining properties from a parent component to a child element or component.

### Why It Is Useful
- Wrapper components can forward props they don't consume
- Keeps APIs flexible - consumers can pass native HTML attributes
- Reduces boilerplate in component libraries

### How It Is Used in This Project

**UI primitive forwarding**:
```jsx
// src/components/UI/Button.jsx
<button
  className={`rounded-lg font-medium ... ${variants[variant]} ${sizes[size]} ${className}`}
  {...props}
>
  {children}
</button>

// src/components/UI/Input.jsx
<input className={`w-full px-3.5 py-2.5 ...`} {...props} />
```

**Test handler spreading**:
```jsx
// src/components/__tests__/GoalCard.test.jsx
render(<GoalCard goal={mockGoal} {...mockHandlers} />);
```

---

## 47. React - Children Composition

### How It Works
Components receive their nested JSX via the `children` prop. This is the foundation of component composition in React.

### Why It Is Useful
- Build reusable containers (cards, modals, layouts) without knowing their content
- Separation of concerns - container handles styling/behavior, children handle content
- Flexible, composable APIs

### How It Is Used in This Project

**Layout components**:
```jsx
// src/components/UI/Card.jsx
export default function Card({ children, className = '', variant = 'default', padding = 'md' }) {
  return (
    <div className={`${variants[variant]} ${paddings[padding]} rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// src/components/UI/Modal.jsx
<div className={isMobileDrawer ? 'p-4 sm:p-6 md:p-8' : 'p-6 sm:p-8'}>
  {children}
</div>
```

**Provider wrapping**:
```jsx
// src/context/AuthContext.jsx
export function AuthProvider({ children }) {
  // ... state & logic ...
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

## 48. React Router - Routes, Route, Navigate

### How It Works
`<Routes>` checks the current URL and renders the matching `<Route>`. `<Navigate>` performs a declarative redirect. Routes are defined with a `path` and an `element`.

### Why It Is Useful
- Client-side navigation without full page reloads
- Declarative routing - routes are components
- Protected route patterns with wrapper components

### How It Is Used in This Project

```jsx
// src/App.jsx
<Routes>
  <Route path="/login" element={
    accessToken ? <Navigate to="/dashboard" replace /> : <LoginForm />
  } />
  <Route path="/dashboard" element={
    <PrivateRoute><Dashboard /></PrivateRoute>
  } />
  <Route path="/categories" element={
    <PrivateRoute><CategoriesPage /></PrivateRoute>
  } />
  <Route path="*" element={<CatchAllRedirect />} />
</Routes>
```

**Protected route pattern**:
```jsx
function PrivateRoute({ children }) {
  const { accessToken, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return accessToken ? children : <Navigate to="/login" replace />;
}
```

---

## 49. React Router - useNavigate, useLocation

### How It Works
- `useNavigate()` returns a function for programmatic navigation
- `useLocation()` returns the current location object (`pathname`, `search`, `hash`, `state`)

### Why It Is Useful
- Navigate after async operations (login, form submission)
- Read query parameters or pathname for conditional logic
- Redirect based on current route

### How It Is Used in This Project

**Programmatic navigation after login**:
```js
// src/components/Auth/LoginForm.jsx
const navigate = useNavigate();
await login(email.trim(), password, rememberMe);
navigate('/');
```

**Language detection based on URL path**:
```js
// src/components/CatchAllRedirect.jsx
const location = useLocation();
const path = location.pathname;
if (path === '/en' || path.startsWith('/en/')) {
  i18n.changeLanguage('en');
}
```

---

## 50. React Router - Link

### How It Works
`<Link to="/path">` renders an anchor tag that performs client-side navigation without a full page reload.

### Why It Is Useful
- Preserves SPA behavior (no full page reload)
- Prefetches (in some router versions)
- Cleaner than calling `navigate()` for static links

### How It Is Used in This Project

```jsx
// src/components/Header.jsx
import { Link, useNavigate } from 'react-router-dom';

<Link to="/pricing">{t('header.pricing')}</Link>
<Link to="/dashboard">{t('header.dashboard')}</Link>
```

---

## 51. i18next - useTranslation

### How It Works
`useTranslation()` returns `{ t, i18n }`. `t('key')` looks up the translation string for the current language. `i18n.changeLanguage('en')` switches languages.

### Why It Is Useful
- Multi-language support (this project: English + Albanian)
- Interpolation - insert dynamic values into translated strings
- Language detection and persistence

### How It Is Used in This Project

**Setup** - language detector + React integration:
```js
// src/i18n.js
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      sq: { translation: sqTranslation }
    },
    fallbackLng: 'sq',
    interpolation: { escapeValue: false }
  });
```

**Translation with interpolation**:
```js
t('healthScore.insightSavingsPositive', {
  amount: insight.savings.toFixed(2),
  percent: insight.savingsPercent
})
```

**Language switching**:
```js
// src/components/LanguageSwitcher.jsx
const changeLanguage = (lng) => { i18n.changeLanguage(lng); };
```

---

## 52. Environment Variables (import.meta.env)

### How It Works
Vite exposes environment variables prefixed with `VITE_` via `import.meta.env`. These are statically replaced at build time.

### Why It Is Useful
- Keep secrets and config out of source code
- Different values per environment (dev, staging, production)
- Build-time replacement means no runtime overhead

### How It Is Used in This Project

```js
// src/utils/supabaseClient.js
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// src/hooks/usePaddle.js
const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

// src/components/Pricing/PricingPage.jsx
const MONTHLY_PRICE_ID = import.meta.env.VITE_PADDLE_MONTHLY_PRICE_ID;
const YEARLY_PRICE_ID = import.meta.env.VITE_PADDLE_YEARLY_PRICE_ID;
```

---

## 53. localStorage & sessionStorage

### How It Works
`localStorage` persists key-value string data across browser sessions. `sessionStorage` persists only within the current tab/session.

### Why It Is Useful
- Remember user preferences (dark mode, language)
- Persist auth state indicators
- Store temporary flags between page reloads

### How It Is Used in This Project

**Dark mode persistence** (localStorage):
```js
// src/hooks/useDarkMode.js
localStorage.setItem(storageKey, dark ? '1' : '0');
localStorage.getItem(storageKey) === '1';
```

**Auth state indicators** (localStorage):
```js
// src/context/AuthContext.jsx
localStorage.setItem('rememberMe', 'true');
localStorage.setItem('username', data.user.user_metadata.username);
```

**Last-used transaction type** (localStorage):
```js
// src/components/Transaction/TransactionForm.jsx
const [type, setType] = useState(initial?.type || localStorage.getItem('lastUsedType') || 'expense');
```

**Reload detection** (sessionStorage):
```js
// src/context/AuthContext.jsx
const reloadFlag = sessionStorage.getItem('_reloadFlag');
if (reloadFlag) sessionStorage.removeItem('_reloadFlag');
sessionStorage.setItem('_reloadFlag', '1');
```

---

## 54. Dynamic Script Loading

### How It Works
Create a `<script>` element, set its `src`, and append it to `document.head`. The `onload` callback fires when the script is loaded and executed.

### Why It Is Useful
- Load third-party SDKs on demand instead of in the initial bundle
- Conditional loading - only load if the feature is needed
- Keeps the initial page load fast

### How It Is Used in This Project

**Loading Paddle.js payment SDK**:
```js
// src/hooks/usePaddle.js
const script = document.createElement('script');
script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
script.async = true;
script.onload = () => {
  if (window.Paddle) {
    window.Paddle.Initialize({ token, eventCallback: (event) => {
      window.dispatchEvent(new CustomEvent('paddle-event', { detail: event }));
    }});
    setPaddle(window.Paddle);
  }
};
document.head.appendChild(script);
```

---

## 55. Supabase Real-Time Subscriptions

### How It Works
Supabase provides a `.channel()` API that subscribes to PostgreSQL changes via WebSockets. When rows are inserted, updated, or deleted, the callback fires in real time.

### Why It Is Useful
- Live updates without polling
- Keeps UI in sync with the database across devices/tabs
- Scoped by table and user for efficiency

### How It Is Used in This Project

```js
// src/components/Budgets/BudgetsPage.jsx
const channel = supabase
  .channel(`budgets-live-${user.id}-${selectedYear}-${selectedMonth}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'transactions',
    filter: `user_id=eq.${user.id}`
  }, refreshExpenses)
  .subscribe();

// Cleanup
return () => { supabase.removeChannel(channel); };
```

---

## 56. Tailwind CSS - Dark Mode with Class Strategy

### How It Works
Tailwind's `darkMode: 'class'` strategy applies dark styles when the `<html>` element has the `dark` class. Prefix any utility with `dark:` to apply it only in dark mode.

### Why It Is Useful
- User-controlled theme (not forced by OS preference)
- Allows persistence in localStorage
- No JavaScript runtime cost for style computation

### How It Is Used in This Project

**Toggle mechanism**:
```js
// src/hooks/useDarkMode.js
if (dark) document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');
```

**Usage in components** - every component uses `dark:` prefixed classes:
```jsx
// src/components/UI/Button.jsx
'bg-white dark:bg-surface-dark-elevated border border-gray-200 dark:border-zinc-700'

// src/components/UI/Card.jsx
'bg-white dark:bg-surface-dark-tertiary border border-gray-200/80 dark:border-zinc-800'

// src/components/UI/Input.jsx
'bg-white dark:bg-surface-dark-elevated dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
```

**Responsive + dark mode combined**:
```jsx
// src/components/Header.jsx
className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
```

---

## 57. Vitest & React Testing Library

### How It Works
**Vitest** is a Vite-native test runner with API compatible to Jest. **React Testing Library** renders components into a virtual DOM and provides queries like `screen.getByText()`, `screen.queryByText()`. Tests simulate user interactions with `fireEvent`.

### Why It Is Useful
- Tests run at Vite speed (no separate Webpack build)
- Testing Library encourages testing from the user's perspective
- Mocking with `vi.mock()` and `vi.fn()` isolates units

### How It Is Used in This Project

**Test configuration**:
```js
// vitest.config.js
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/__tests__/**/*.{js,jsx}', 'src/**/*.{test,spec}.{js,jsx}'],
  },
});
```

**Test setup** - mock browser APIs:
```js
// src/test/setup.js
import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, addEventListener: vi.fn(), ...
  })),
});
```

**Component test** - rendering, querying, event simulation:
```js
// src/components/__tests__/GoalCard.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalCard from '../Goals/GoalCard.jsx';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => keyMap[key] || key, i18n: { language: 'en' } }),
}));

describe('GoalCard', () => {
  it('renders goal name and description', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    expect(screen.getByText('Emergency Fund')).toBeDefined();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<GoalCard goal={mockGoal} {...mockHandlers} />);
    fireEvent.click(screen.getByTitle('Edit Goal'));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockGoal);
  });
});
```

---

## 58. PapaParse - CSV Parsing

### How It Works
PapaParse is a fast CSV parser for JavaScript. It reads a `File` object and calls `complete()` with the parsed 2D array. Supports streaming, headers, and various delimiters.

### Why It Is Useful
- Handles edge cases in CSV (quoted fields, commas inside values, different line endings)
- Works with browser `File` objects from `<input type="file">`
- Callback-based API wrappable in a Promise

### How It Is Used in This Project

```js
// src/utils/importCSV.js
import Papa from 'papaparse';

export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete(result) {
        const rows = result.data;
        const parsed = isAppFormat(rows[0])
          ? parseAppFormat(rows)
          : parseGenericFormat(rows);
        resolve(parsed);
      },
      error(err) { reject(err); },
    });
  });
}
```

---

## 59. Recharts - Data Visualization

### How It Works
Recharts is a React charting library built on D3. It provides declarative chart components (`<PieChart>`, `<BarChart>`, `<LineChart>`) that accept data arrays and render SVG charts.

### Why It Is Useful
- React-native - charts are components with props
- Responsive and animated by default
- Wide variety of chart types

### How It Is Used in This Project

Category pie charts, combined month charts, spending trend lines, and benchmark comparisons are all rendered with Recharts components via lazy loading:

```js
const CategoryPieChart = lazy(() => import('../Transactions/CategoryPieChart'));
```

Data is prepared with `.map()` / `.reduce()` and passed into chart components as props.

---

## 60. Vite - Build Configuration

### How It Works
Vite uses native ES modules during development (no bundling) for instant HMR. For production, it uses Rollup to create optimized bundles. Configuration lives in `vite.config.js`.

### Why It Is Useful
- Near-instant dev server startup
- Hot Module Replacement (HMR) in milliseconds
- Optimized production builds with tree-shaking and code splitting

### How It Is Used in This Project

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        en: 'en.html',
        sq: 'sq.html'
      },
    },
  },
});
```

Multiple HTML entry points (`main`, `en`, `sq`) enable standalone landing pages per language.

---

## Summary Table

| # | Feature | Category | Primary Purpose |
|---|---------|----------|-----------------|
| 1 | ES Modules | JS Core | Code organization and tree-shaking |
| 2 | Destructuring | JS Core | Concise variable extraction |
| 3 | Arrow Functions | JS Core | Concise callbacks with lexical `this` |
| 4 | Template Literals | JS Core | String interpolation and dynamic classes |
| 5 | Spread Operator | JS Core | Immutable state updates and array merging |
| 6 | Rest Parameters | JS Core | Variadic functions and prop forwarding |
| 7 | Default Parameters | JS Core | Self-documenting function signatures |
| 8 | Optional Chaining | JS Core | Safe deep property access |
| 9 | Nullish Coalescing | JS Core | Precise null/undefined fallbacks |
| 10 | Short-Circuit Eval | JS Core | Conditional rendering and fallbacks |
| 11 | Ternary Operator | JS Core | Inline conditionals in JSX |
| 12 | Async/Await | JS Async | Readable async data fetching |
| 13 | Promises | JS Async | Foundation of async operations |
| 14 | try/catch/finally | JS Async | Structured error handling |
| 15 | Array Methods | JS Core | Declarative data transformation |
| 16 | Object Methods | JS Core | Object introspection and iteration |
| 17 | Set | JS Core | Deduplication and fast lookups |
| 18 | for...of | JS Core | Iterable loops with break support |
| 19 | Regular Expressions | JS Core | Pattern matching and validation |
| 20 | String Methods | JS Core | Text processing and formatting |
| 21 | Date Handling | JS Core | Date parsing, formatting, arithmetic |
| 22 | Closures | JS Core | State encapsulation in callbacks |
| 23 | Higher-Order Functions | JS Core | Function composition and reuse |
| 24 | IIFE | JS Core | Private scope for test mocks |
| 25 | Computed Properties | JS Core | Dynamic object keys |
| 26 | Object Shorthand | JS Core | Concise object creation |
| 27 | typeof | JS Core | Runtime type checking |
| 28 | switch | JS Core | Multi-branch value dispatching |
| 29 | Blob & URL APIs | Web API | Client-side file generation |
| 30 | JSDoc Comments | JS Tooling | Type hints without TypeScript |
| 31 | useState | React | Local component state |
| 32 | useEffect | React | Side effects and lifecycle |
| 33 | useCallback | React | Memoized stable callbacks |
| 34 | useMemo | React | Memoized derived values |
| 35 | useContext | React | Consume shared context state |
| 36 | useRef | React | DOM access and mutable refs |
| 37 | Context API | React | Global state without prop drilling |
| 38 | Custom Hooks | React | Reusable stateful logic |
| 39 | Conditional Rendering | React | Dynamic UI based on state |
| 40 | List Rendering | React | Efficient list display with keys |
| 41 | Controlled Components | React | Form state management |
| 42 | Fragments | React | Grouping without wrapper elements |
| 43 | lazy & Suspense | React | Code splitting and loading states |
| 44 | Event Handling | React | User interaction responses |
| 45 | Custom Events | Web API | Decoupled component communication |
| 46 | Prop Spreading | React | Flexible component APIs |
| 47 | Children Composition | React | Reusable container components |
| 48 | Routes/Route/Navigate | React Router | Declarative client-side routing |
| 49 | useNavigate/useLocation | React Router | Programmatic navigation |
| 50 | Link | React Router | Navigation without page reload |
| 51 | useTranslation | i18next | Multi-language support |
| 52 | import.meta.env | Vite | Environment configuration |
| 53 | localStorage/sessionStorage | Web API | Client-side persistence |
| 54 | Dynamic Script Loading | Web API | On-demand third-party SDKs |
| 55 | Real-Time Subscriptions | Supabase | Live database change notifications |
| 56 | Dark Mode (class) | Tailwind | User-controlled theme switching |
| 57 | Vitest + RTL | Testing | Unit and component testing |
| 58 | PapaParse | Library | CSV file parsing |
| 59 | Recharts | Library | Chart data visualization |
| 60 | Vite Config | Build Tool | Development server and production builds |
