// Bento design harness entry. URL: /<page>?theme=dark&lang=sq&plan=free
// Renders the real AuthenticatedLayout + page with mocked data (see vite.config.js).
const params = new URLSearchParams(location.search);
const page = location.pathname.replace(/^\/(sq\/)?/, '') || 'dashboard';
const dark = params.get('theme') === 'dark';
const lang = params.get('lang') === 'sq' ? 'sq' : 'en';
localStorage.setItem('expense_dark_mode', dark ? '1' : '0');
localStorage.setItem('i18nextLng', lang);
localStorage.setItem('username', 'Alex');
sessionStorage.setItem('greetingShown', '1');
document.documentElement.classList.toggle('dark', dark);
document.documentElement.lang = lang;
window.__PAGE_ERRORS__ = [];
window.addEventListener('error', (e) => window.__PAGE_ERRORS__.push(String(e.message)));

const [{ createElement: h, Suspense }, { createRoot }, { MemoryRouter }] = await Promise.all([
  import('react'), import('react-dom/client'), import('react-router-dom'),
]);
await import('../../src/index.css');
const { default: i18n } = await import('../../src/i18n');
await i18n.changeLanguage(lang);
const [{ AuthenticatedLayout }, { ThemeProvider }, { ToastProvider }, { TransactionProvider }] = await Promise.all([
  import('../../src/App.jsx'),
  import('../../src/context/ThemeContext'),
  import('../../src/context/ToastContext'),
  import('../../src/context/TransactionContext'),
]);

const PAGES = {
  dashboard: () => import('../../src/components/Dashboard/Dashboard.jsx'),
  transactions: () => import('../../src/components/Transactions/Transactions.jsx'),
  budgets: () => import('../../src/components/Budgets/BudgetsPage.jsx'),
  goals: () => import('../../src/components/Goals/GoalsPage.jsx'),
  recurring: () => import('../../src/components/Recurring/RecurringPage.jsx'),
  categories: () => import('../../src/components/Categories/CategoriesPage.jsx'),
  networth: () => import('../../src/components/NetWorth/NetWorthPage.jsx'),
  reports: () => import('../../src/components/Reports/ReportsPage.jsx'),
  notifications: () => import('../../src/components/Notifications/NotificationsPage.jsx'),
  account: () => import('../../src/components/Auth/AccountPage.jsx'),
  onboarding: () => import('../../src/components/Onboarding/OnboardingWizard.jsx'),
  pricing: () => import('../../src/components/Pricing/PricingPage.jsx'),
};
// Full-screen flows render without the app shell, as in App.jsx.
const BARE = new Set(['onboarding']);
const { default: Page } = await (PAGES[page] || PAGES.dashboard)();

createRoot(document.getElementById('root')).render(
  h(MemoryRouter, { initialEntries: [`/${page}`] },
    h(ThemeProvider, null,
      h(ToastProvider, null,
        h(TransactionProvider, null,
          BARE.has(page)
            ? h(Suspense, { fallback: null }, h(Page))
            : h(AuthenticatedLayout, null,
              h(Suspense, { fallback: null }, h(Page)))))))
);
