import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as keyring from '../utils/crypto/keyring';
import { initForUser, handleSignOut, finishDisablingEncryption, setupEncryption } from '../utils/crypto/keyLifecycle';
import { fetchUserKeys } from '../utils/api/userKeys';
import { runMigration } from '../utils/crypto/migrationRunner';

const E2EE_ENABLED = import.meta.env.VITE_E2EE_ENABLED === 'true';

const CryptoContext = createContext();

export function CryptoProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState(keyring.getStatus());
  const [keysRow, setKeysRow] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null); // { percent, table } | null
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState(null);
  const migrationRunningRef = useRef(false);
  const lastUserIdRef = useRef(null);

  useEffect(() => keyring.subscribe(setStatus), []);

  const refreshKeysRow = useCallback(async (userId) => {
    if (!userId) return setKeysRow(null);
    const row = await fetchUserKeys(userId).catch(() => null);
    setKeysRow(row);
    return row;
  }, []);

  // Drive keyring state off the resolved auth session.
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      lastUserIdRef.current = null;
      handleSignOut();
      setKeysRow(null);
      return;
    }
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;

    initForUser(user.id).then(() => refreshKeysRow(user.id));
  }, [user?.id, authLoading, refreshKeysRow]);

  // Kick off the lazy migration once unlocked and status is 'migrating'.
  useEffect(() => {
    if (status !== 'unlocked' || !user?.id || migrationRunningRef.current) return;
    if (!keysRow || keysRow.encryption_status === 'enabled') return;

    migrationRunningRef.current = true;
    const wasDisabling = keysRow.encryption_status === 'disabling';
    runMigration(user.id, keysRow.encryption_status, (progress) => setMigrationProgress(progress))
      .then(async () => {
        if (wasDisabling) {
          await finishDisablingEncryption(user.id);
        }
        await refreshKeysRow(user.id);
      })
      .catch((e) => console.error('E2EE migration error:', e))
      .finally(() => {
        migrationRunningRef.current = false;
        setMigrationProgress(null);
      });
  }, [status, keysRow, user?.id, refreshKeysRow]);

  // Sets up encryption for the current user (brand-new registration, or an
  // existing user's opt-in). Returns the recovery code; caller MUST show it
  // via RecoveryCodeModal (setPendingRecoveryCode) before the user can lose
  // access to this screen — it is never shown again.
  const setupNow = useCallback(async (password, opts) => {
    if (!user?.id) throw new Error('No user session');
    const { recoveryCode } = await setupEncryption(user.id, password, opts);
    setPendingRecoveryCode(recoveryCode);
    await refreshKeysRow(user.id);
    return recoveryCode;
  }, [user?.id, refreshKeysRow]);

  const dismissRecoveryCode = useCallback(() => setPendingRecoveryCode(null), []);

  const value = {
    status, // 'loading' | 'off' | 'unlocked' | 'locked'
    keysRow,
    isEncryptionEnabled: !!keysRow,
    isMigrating: keysRow?.encryption_status === 'migrating' || keysRow?.encryption_status === 'disabling',
    migrationProgress,
    featureEnabled: E2EE_ENABLED,
    refreshKeysRow: () => refreshKeysRow(user?.id),
    setupNow,
    pendingRecoveryCode,
    dismissRecoveryCode,
  };

  return (
    <CryptoContext.Provider value={value}>
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  return useContext(CryptoContext);
}
