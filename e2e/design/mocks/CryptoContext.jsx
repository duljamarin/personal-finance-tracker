const VALUE = {
  status: 'unlocked', isMigrating: false, isEncryptionEnabled: true,
  refreshKeysRow: async () => {}, setupNow: async () => {}, pendingRecoveryCode: null, dismissRecoveryCode: () => {},
};
export function CryptoProvider({ children }) { return children; }
export function useCrypto() { return VALUE; }
