import { describe, it, expect, vi, beforeEach } from 'vitest';

// initForUser races RegisterForm's setupEncryption: the user_keys fetch can be
// sent before the keys are inserted and resolve after the unlock. It must not
// downgrade that fresh unlock to 'off' (which drops the DEK until a refresh).
let resolveFetch;
vi.mock('../api/userKeys', () => ({
  fetchUserKeys: vi.fn(() => new Promise((r) => { resolveFetch = r; })),
  insertUserKeys: vi.fn(),
  updateUserKeys: vi.fn(),
  deleteUserKeys: vi.fn(),
}));
vi.mock('../crypto/keyStore', () => ({
  getKey: vi.fn(async () => null),
  getMacKey: vi.fn(async () => null),
  putKey: vi.fn(async () => {}),
  deleteKey: vi.fn(async () => {}),
}));
vi.mock('../api/categories', () => ({ wipeFinancialDataOnKeyReset: vi.fn(), addCategory: vi.fn() }));

const keyring = await import('../crypto/keyring');
const { initForUser, handleSignOut } = await import('../crypto/keyLifecycle');

describe('initForUser', () => {
  beforeEach(() => handleSignOut());

  it('keeps an unlock that lands while the keys fetch is in flight', async () => {
    const pending = initForUser('u1');
    keyring.setUnlocked({ fake: 'dek' }, { fake: 'mac' }); // setupEncryption finished
    resolveFetch(null); // fetch was sent before the insert
    await pending;
    expect(keyring.getStatus()).toBe('unlocked');
  });

  it('still resolves to off for a user without keys', async () => {
    const pending = initForUser('u2');
    resolveFetch(null);
    await pending;
    expect(keyring.getStatus()).toBe('off');
  });

  it('locks a user with keys but no cached key', async () => {
    const pending = initForUser('u3');
    resolveFetch({ encryption_status: 'enabled' });
    await pending;
    expect(keyring.getStatus()).toBe('locked');
  });
});
