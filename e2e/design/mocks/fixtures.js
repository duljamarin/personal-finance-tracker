// Deterministic demo data for the design harness. Dates are generated relative
// to today so "Today" / "Yesterday" groups and the current month always exist.
// Harness only: none of these values ship in the app.

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date();
const daysAgo = (n) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };

export const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Housing & Rent',
  'Utilities', 'Healthcare', 'Subscriptions', 'Salary', 'Freelance', 'Travel', 'Personal Care',
].map((name, i) => ({ id: `c${i + 1}`, name, emoji: name }));
const cat = (name) => CATEGORIES.find((c) => c.name === name);

let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const TITLES = {
  'Food & Dining': ['Supermarket', 'Lunch with the team', 'Bakery', 'Dinner out', 'Coffee'],
  Transportation: ['Fuel', 'Bus pass', 'Taxi'],
  Shopping: ['Bookstore', 'Shoes', 'Home supplies'],
  Entertainment: ['Cinema', 'Concert tickets', 'Streaming rental'],
  Utilities: ['Electricity', 'Water'],
  Healthcare: ['Pharmacy'],
  Subscriptions: ['Phone plan', 'Music subscription'],
  Travel: ['Weekend train tickets'],
  'Personal Care': ['Barber'],
};

function build() {
  const out = [];
  let id = 1;
  const push = (date, type, catName, title, amount, extra = {}) => out.push({
    id: `t${id++}`, date: iso(date), type, title, amount, base_amount: amount,
    category: cat(catName), category_id: cat(catName).id, tags: [], currency_code: 'EUR', exchange_rate: 1, ...extra,
  });
  for (let m = 7; m >= 0; m -= 1) {
    const monthStart = new Date(NOW.getFullYear(), NOW.getMonth() - m, 1);
    const last = m === 0 ? NOW.getDate() : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    push(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1), 'income', 'Salary', 'Monthly salary', 3800, { source_recurring_id: 'r3' });
    push(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1), 'expense', 'Housing & Rent', 'Rent', 650, { source_recurring_id: 'r2' });
    if (m % 2 === 0) push(new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(14, last)), 'income', 'Freelance', 'Design project', 420 + Math.round(rand() * 300));
    const count = m === 0 ? Math.max(4, Math.round(last * 0.9)) : 22;
    for (let k = 0; k < count; k += 1) {
      const names = Object.keys(TITLES);
      const c = names[Math.floor(rand() * names.length)];
      const titles = TITLES[c];
      const day = Math.max(1, Math.min(last, 1 + Math.floor(rand() * last)));
      const amount = Math.round((8 + rand() * (c === 'Food & Dining' ? 70 : 55)) * 100) / 100;
      push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day), 'expense', c, titles[Math.floor(rand() * titles.length)], amount);
    }
  }
  // A dense last week so the Activity feed has Today / Yesterday groups.
  push(daysAgo(0), 'expense', 'Food & Dining', 'Supermarket', 64.2);
  push(daysAgo(1), 'expense', 'Transportation', 'Fuel', 48);
  push(daysAgo(1), 'expense', 'Food & Dining', 'Lunch with the team', 22.4);
  push(daysAgo(3), 'expense', 'Entertainment', 'Cinema', 18.5);
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export const TRANSACTIONS = build();

export function budgetsFor(year, month) {
  return [
    ['Food & Dining', 600], ['Transportation', 160], ['Shopping', 300], ['Entertainment', 120], ['Subscriptions', 40],
  ].map(([name, amount], i) => ({
    id: `b${year}${month}${i}`, year, month, amount, category_id: cat(name).id, category: { id: cat(name).id, name },
  }));
}

export const GOALS = [
  { id: 'g1', name: 'Emergency fund', target_amount: 6000, current_amount: 4320, target_date: iso(new Date(NOW.getFullYear() + 1, 2, 1)), priority: 1, is_completed: false, is_active: true, goal_type: 'savings' },
  { id: 'g2', name: 'Summer trip', target_amount: 2000, current_amount: 800, target_date: iso(new Date(NOW.getFullYear() + 1, 5, 15)), priority: 2, is_completed: false, is_active: true, goal_type: 'savings' },
  { id: 'g3', name: 'New laptop', target_amount: 1500, current_amount: 1500, target_date: iso(daysAgo(20)), priority: 3, is_completed: true, completed_at: iso(daysAgo(20)), is_active: true, goal_type: 'purchase' },
];

const nextMonthFirst = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);
export const RECURRING = [
  { id: 'r1', title: 'Phone plan', amount: 15, type: 'expense', frequency: 'monthly', interval_count: 1, is_active: true, start_date: '2026-01-22', next_run_at: iso(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 4)), category: cat('Subscriptions'), category_id: cat('Subscriptions').id },
  { id: 'r2', title: 'Rent', amount: 650, type: 'expense', frequency: 'monthly', interval_count: 1, is_active: true, start_date: '2026-01-01', next_run_at: iso(nextMonthFirst), category: cat('Housing & Rent'), category_id: cat('Housing & Rent').id },
  { id: 'r3', title: 'Monthly salary', amount: 3800, type: 'income', frequency: 'monthly', interval_count: 1, is_active: true, start_date: '2026-01-01', next_run_at: iso(nextMonthFirst), category: cat('Salary'), category_id: cat('Salary').id },
  { id: 'r4', title: 'Gym', amount: 35, type: 'expense', frequency: 'monthly', interval_count: 1, is_active: false, start_date: '2026-02-05', next_run_at: iso(daysAgo(-9)), category: cat('Personal Care'), category_id: cat('Personal Care').id },
];
