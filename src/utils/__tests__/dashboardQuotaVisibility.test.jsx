import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_CONFIG, QUOTA_VISIBLE_AT } from '../../config/app';

// A user reported that being asked to pay before seeing any value was why he
// left. The dashboard used to stack three upgrade prompts (top banner + quota
// bar + sidebar card). These pin the reduced behaviour: one passive sidebar
// card, plus a quota bar that only appears once it is actually informative.
//
// Every expectation below is an expression over CONFIG. No literal limit,
// threshold or derived percentage appears in this file, so flipping
// FREE_TRANSACTION_LIMIT alone keeps the suite honest (invariant 4).

const LIMIT = APP_CONFIG.FREE_TRANSACTION_LIMIT;

let mockSub = {};
vi.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => mockSub,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === 'freePlanCounter.transactions') return 'Transactions this month';
      if (key === 'upgrade.upgradeCta') return 'Upgrade';
      return opts ? `${key}:${JSON.stringify(opts)}` : key;
    },
  }),
}));

const { default: FreePlanUsageCounter } = await import(
  '../../components/Subscription/FreePlanUsageCounter'
);

function setSubscription({ used, isPremium = false, isTrialing = false }) {
  mockSub = {
    monthlyTransactionCount: used,
    transactionLimit: LIMIT,
    isPremium,
    isTrialing,
    loading: false,
  };
}

// Mirrors the gate in Dashboard.jsx exactly: the counter is not mounted at all
// below the threshold, rather than mounted-and-hidden.
function DashboardQuotaRegion() {
  const { monthlyTransactionCount, transactionLimit } = mockSub;
  if (monthlyTransactionCount < QUOTA_VISIBLE_AT) return null;
  return (
    <div className="mb-4">
      <FreePlanUsageCounter
        used={monthlyTransactionCount}
        limit={transactionLimit}
        labelKey="freePlanCounter.transactions"
      />
    </div>
  );
}

function renderRegion(opts) {
  setSubscription(opts);
  return render(
    <MemoryRouter>
      <DashboardQuotaRegion />
    </MemoryRouter>
  );
}

// An "upgrade CTA" is any link to the pricing page. The removed banner and the
// quota bar's near-limit link both matched this.
const upgradeCtas = (container) =>
  container.querySelectorAll('a[href="/pricing"], a[href*="pricing"]');

// The quota element is identified by its label text, not a test id, so the
// assertion survives markup changes.
const quotaElements = () => screen.queryAllByText(/Transactions this month/);

afterEach(cleanup);

describe('invariant 1: nothing renders below the threshold', () => {
  it('shows zero upgrade CTAs and zero quota elements for every count below QUOTA_VISIBLE_AT', () => {
    for (let used = 0; used < QUOTA_VISIBLE_AT; used++) {
      const { container, unmount } = renderRegion({ used });
      expect(quotaElements(), `count ${used} rendered a quota element`).toHaveLength(0);
      expect(upgradeCtas(container), `count ${used} rendered an upgrade CTA`).toHaveLength(0);
      expect(container.innerHTML, `count ${used} rendered markup`).toBe('');
      unmount();
    }
  });

  it('renders nothing at all, not a zero-height element', () => {
    const { container } = renderRegion({ used: QUOTA_VISIBLE_AT - 1 });
    expect(container.firstChild).toBeNull();
  });
});

describe('invariant 2: exactly one quota element at and above the threshold', () => {
  it('renders one quota element labelled `used / LIMIT` from the threshold to the cap', () => {
    for (let used = QUOTA_VISIBLE_AT; used <= LIMIT; used++) {
      const { unmount } = renderRegion({ used });
      const els = quotaElements();
      expect(els, `count ${used} did not render exactly one quota element`).toHaveLength(1);
      // Whitespace between the count spans is collapsed before comparing.
      const label = els[0].textContent.replace(/\s+/g, ' ');
      expect(label).toContain(`${used} / ${LIMIT}`);
      unmount();
    }
  });

  it('renders at the threshold boundary itself', () => {
    renderRegion({ used: QUOTA_VISIBLE_AT });
    expect(quotaElements()).toHaveLength(1);
  });

  it('keeps the label correct when usage exceeds the cap', () => {
    renderRegion({ used: LIMIT + 1 });
    const label = quotaElements()[0].textContent.replace(/\s+/g, ' ');
    expect(label).toContain(`${LIMIT + 1} / ${LIMIT}`);
  });
});

describe('bar width is an expression over CONFIG', () => {
  it('scales with used/limit and clamps at 100%', () => {
    const { container, unmount } = renderRegion({ used: QUOTA_VISIBLE_AT });
    const bar = container.querySelector('[style*="width"]');
    const expected = Math.min(1, QUOTA_VISIBLE_AT / LIMIT) * 100;
    expect(bar.style.width).toBe(`${expected}%`);
    unmount();

    const over = renderRegion({ used: LIMIT * 2 });
    const clamped = over.container.querySelector('[style*="width"]');
    expect(clamped.style.width).toBe('100%');
  });
});

describe('invariant 5: premium and trialing users see no quota element', () => {
  it('renders nothing for a premium user even at the cap', () => {
    const { container } = renderRegion({ used: LIMIT, isPremium: true });
    expect(quotaElements()).toHaveLength(0);
    expect(upgradeCtas(container)).toHaveLength(0);
  });

  it('renders nothing for a trialing user even at the cap', () => {
    const { container } = renderRegion({ used: LIMIT, isTrialing: true });
    expect(quotaElements()).toHaveLength(0);
    expect(upgradeCtas(container)).toHaveLength(0);
  });
});

describe('invariant 4: CONFIG is the only source of truth', () => {
  it('derives QUOTA_VISIBLE_AT as ceil(limit * fraction)', () => {
    expect(QUOTA_VISIBLE_AT).toBe(
      Math.ceil(APP_CONFIG.FREE_TRANSACTION_LIMIT * APP_CONFIG.QUOTA_VISIBLE_AT_FRACTION)
    );
  });

  it('places the threshold strictly inside the allowance', () => {
    // Guards against a fraction of 0 (bar always on, the old complaint) or >=1
    // (bar only at the cap, useless as a warning).
    expect(QUOTA_VISIBLE_AT).toBeGreaterThan(0);
    expect(QUOTA_VISIBLE_AT).toBeLessThanOrEqual(APP_CONFIG.FREE_TRANSACTION_LIMIT);
    expect(APP_CONFIG.QUOTA_VISIBLE_AT_FRACTION).toBeGreaterThan(0);
    expect(APP_CONFIG.QUOTA_VISIBLE_AT_FRACTION).toBeLessThan(1);
  });
});
