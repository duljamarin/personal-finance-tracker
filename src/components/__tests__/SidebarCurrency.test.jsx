import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.c', user_metadata: { preferred_currency: 'ALL' } }, logout: vi.fn() }),
}));
vi.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: false, isTrialing: false, subscription: null }),
}));
vi.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggleDark: vi.fn() }) }));
vi.mock('../../utils/api', () => ({ getUnreadNotificationCount: async () => 0 }));
vi.mock('../../utils/api/userSettings', () => ({ fetchUserSettings: async () => ({ preferredCurrency: 'ALL' }) }));

const Sidebar = (await import('../Sidebar.jsx')).default;

// The currency chip exists so users can see which currency their numbers are in
// without opening Account. If it silently stops rendering, nothing else fails —
// hence an explicit assertion on both the symbol and the code.
describe('Sidebar currency chip', () => {
  it('shows the currency code', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getAllByText('ALL').length).toBeGreaterThan(0);
  });

  // The flag is a decorative <img> (the code next to it carries the meaning),
  // so assert on the asset it points at rather than an accessible name.
  it('shows the currency flag', () => {
    const { container } = render(<MemoryRouter><Sidebar /></MemoryRouter>);
    const flags = container.querySelectorAll('img[src="/currency-flags/ALL.svg"]');
    expect(flags.length).toBeGreaterThan(0);
  });
});
