// WebKit overflow harness. Mounts the components fixed in Phase 2 with
// deliberately hostile seed data (40+ char unbroken strings, millions amounts)
// so the iOS Safari assertions can run without a live authenticated account.
//
// This file is test scaffolding: it imports the REAL components unmodified and
// passes them props. No component behaviour or props are changed by it.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';

import BudgetCard from '../../src/components/Budgets/BudgetCard';
import GoalCard from '../../src/components/Goals/GoalCard';
import CategoryCard from '../../src/components/Categories/CategoryCard';
import ConfirmDeleteModal from '../../src/components/UI/ConfirmDeleteModal';
import ReportSummaryCards from '../../src/components/Reports/ReportSummaryCards';
import SummaryCards from '../../src/components/Dashboard/SummaryCards';

// ---- Hostile seed data (per the brief) ----------------------------------
export const SEED = {
  category: 'Abonimet' + 'e'.repeat(38),           // 46 chars, no spaces
  title: 'PagesaMujoreEnergjiElektrike' + 'X'.repeat(20), // 47 chars, no spaces
  email: 'perdoruesi.me.emer.shume.te.gjate.qe.nuk.thyhet@shembull-domain-i-gjate.com',
  millions: 1234567.89,
};

const params = new URLSearchParams(location.search);
const lang = params.get('lang') || 'sq';
const which = params.get('c') || 'all';

// i18n is stubbed rather than loaded: the harness asserts LAYOUT, and a stub
// keeps the sq/en difference explicit and synchronous (no async bundle race).
const SQ = {
  'goals.card.saved': 'të kursyera',
  'goals.editGoal': 'Ndrysho Objektiv',
  'goals.deleteGoal': 'Fshi Objektiv',
  'budgets.editBudget': 'Ndrysho Buxhetin',
  'budgets.deleteConfirm': 'Fshi Buxhetin',
  'budgets.card.spent': 'shpenzuar',
  'budgets.card.of': 'nga',
  'budgets.card.remaining': 'të mbetura',
  'budgets.card.overflow': 'mbi buxhet',
  'reports.totalIncome': 'Të ardhurat totale',
  'reports.totalExpenses': 'Shpenzimet totale',
  'reports.netSavings': 'Kursimet neto',
  'reports.savingsRate': 'Norma e kursimit',
  'reports.transactionCount': 'Numri i transaksioneve',
  'reports.avgDailySpend': 'Shpenzimi mesatar ditor',
  'currency.baseCurrency': 'Të gjitha shumat në {{currency}}',
  'dashboard.totalIncome': 'Të ardhurat totale',
  'dashboard.totalExpense': 'Shpenzimet totale',
  'dashboard.net': 'Bilanci neto',
};
const EN = {
  'goals.card.saved': 'saved',
  'goals.editGoal': 'Edit Goal',
  'goals.deleteGoal': 'Delete Goal',
  'budgets.editBudget': 'Edit Budget',
  'budgets.deleteConfirm': 'Delete Budget',
  'budgets.card.spent': 'spent',
  'budgets.card.of': 'of',
  'budgets.card.remaining': 'remaining',
  'budgets.card.overflow': 'over budget',
  'reports.totalIncome': 'Total income',
  'reports.totalExpenses': 'Total expenses',
  'reports.netSavings': 'Net savings',
  'reports.savingsRate': 'Savings rate',
  'reports.transactionCount': 'Transactions',
  'reports.avgDailySpend': 'Avg daily spend',
  'currency.baseCurrency': 'All amounts in {{currency}}',
  'dashboard.totalIncome': 'Total income',
  'dashboard.totalExpense': 'Total expenses',
  'dashboard.net': 'Net balance',
};
const DICT = lang === 'en' ? EN : SQ;

function Section({ id, children }) {
  if (which !== 'all' && which !== id) return null;
  return (
    <section data-harness={id} style={{ marginBottom: 24 }}>
      {children}
    </section>
  );
}

function App() {
  return (
    <MemoryRouter>
      <div className="p-4 bg-surface-page dark:bg-surface-dark-page">
        <Section id="budget-card">
          <BudgetCard
            budget={{
              id: '1',
              amount: SEED.millions,
              spent: SEED.millions * 0.8,
              category: { name: SEED.category },
            }}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </Section>

        <Section id="goal-card">
          <GoalCard
            goal={{
              id: '1',
              name: SEED.category,
              description: SEED.title,
              color: '#0B5D3B',
              target_amount: SEED.millions,
              current_amount: SEED.millions * 0.5,
            }}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </Section>

        <Section id="category-card">
          <div className="grid grid-cols-2 gap-3">
            <CategoryCard
              cat={{ id: '1', name: SEED.category }}
              onEdit={() => {}}
              onDelete={() => {}}
              editLabel="e"
              deleteLabel="d"
            />
            <CategoryCard
              cat={{ id: '2', name: SEED.title }}
              onEdit={() => {}}
              onDelete={() => {}}
              editLabel="e"
              deleteLabel="d"
            />
          </div>
        </Section>

        <Section id="report-summary">
          <ReportSummaryCards
            transactions={[
              { type: 'income', base_amount: SEED.millions, date: '2026-08-01' },
              { type: 'expense', base_amount: SEED.millions * 0.9, date: '2026-08-02' },
            ]}
            prevTransactions={[
              { type: 'income', base_amount: SEED.millions * 0.8, date: '2026-07-01' },
              { type: 'expense', base_amount: SEED.millions * 0.7, date: '2026-07-02' },
            ]}
            startDate="2026-08-01"
            endDate="2026-08-31"
          />
        </Section>

        <Section id="dashboard-summary">
          <SummaryCards
            totalIncome={SEED.millions}
            totalExpense={SEED.millions * 0.9}
            net={SEED.millions * 0.1}
            loading={false}
          />
        </Section>

        <Section id="delete-modal">
          <ConfirmDeleteModal
            title="Fshi"
            message="A jeni i sigurt?"
            itemName={SEED.title}
            onConfirm={() => {}}
            onCancel={() => {}}
            confirmLabel="Fshi"
            cancelLabel="Anulo"
          />
        </Section>

        {/* Invariant 4: the long seed strings must remain fully readable
            somewhere, not silently clipped. */}
        <Section id="full-content">
          <div data-full-content className="[overflow-wrap:anywhere] text-sm">
            <p data-seed="category">{SEED.category}</p>
            <p data-seed="title">{SEED.title}</p>
            <p data-seed="email">{SEED.email}</p>
          </div>
        </Section>
      </div>
    </MemoryRouter>
  );
}

// Minimal i18n + context stubs so the real components render standalone.
window.__HARNESS_DICT__ = DICT;
document.documentElement.lang = lang;

createRoot(document.getElementById('root')).render(<App />);
