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
  it('shows the currency symbol and code', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.getAllByText('ALL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('L').length).toBeGreaterThan(0);
  });
});
