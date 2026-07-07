// Imperative key-lifecycle operations, called from AuthContext (which has the
// plaintext password in scope at login/register/password-change time) and
// from the recovery/unlock UI. Kept as a plain module (not a React context)
// so AuthContext can call it directly without a circular context dependency;
// CryptoContext mirrors keyring state into React and owns the modals/banners.
import * as keyring from './keyring';
import * as keyStore from './keyStore';
import {
  deriveKEK,
  wrapDEK,
  unwrapDEK,
  importDEK,
  deriveMacKey,
  generateRawDEK,
  generateSalt,
} from './cipher';
import { generateRecoveryCode, normalizeRecoveryCode } from './recovery';
import {
  fetchUserKeys,
  insertUserKeys,
  updateUserKeys,
  deleteUserKeys,
} from '../api/userKeys';

let currentUserId = null;

async function unlockAndCache(userId, rawDek) {
  const cryptoKey = await importDEK(rawDek);
  const macKey = await deriveMacKey(rawDek);
  keyring.setUnlocked(cryptoKey, macKey);
  await keyStore.putKey(userId, cryptoKey, macKey);
}

// Called after Supabase session resolves (login, register, or restored
// session). Determines whether this user has encryption enabled and, if so,
// tries to unlock from cached IndexedDB key before falling back to 'locked'.
export async function initForUser(userId) {
  currentUserId = userId;
  if (!userId) {
    keyring.setOff();
    return;
  }

  const row = await fetchUserKeys(userId).catch(() => null);
  if (!row) {
    keyring.setOff();
    return;
  }

  const cached = await keyStore.getKey(userId);
  if (cached) {
    const cachedMac = await keyStore.getMacKey(userId);
    if (cachedMac) {
      keyring.setUnlocked(cached, cachedMac);
      return;
    }
    // Session was cached before deterministic fields existed, so no macKey is
    // stored and it cannot be re-derived from the non-extractable AES key.
    // Fall through to 'locked' so UnlockModal prompts for the password once;
    // unlockWithPassword -> unlockAndCache then derives AND caches the macKey,
    // after which deterministic-field encryption (categories.name) works and
    // the lazy migration can encrypt it. One-time prompt per device.
  }

  keyring.setLocked();
}

// Called from AuthContext.login() right after a successful signInWithPassword,
// while the plaintext password is still in scope.
export async function unlockWithPassword(userId, password) {
  const row = await fetchUserKeys(userId).catch(() => null);
  if (!row) {
    keyring.setOff();
    return { status: 'off' };
  }

  try {
    const kek = await deriveKEK(password, row.kdf_salt_password, row.kdf_iterations);
    const rawDek = await unwrapDEK(row.dek_password_wrapped, kek);
    await unlockAndCache(userId, rawDek);
    return { status: 'unlocked' };
  } catch {
    keyring.setLocked();
    return { status: 'locked' };
  }
}

// Manual unlock (e.g. UnlockModal after a restored session where the
// IndexedDB key is missing/cleared).
export async function unlockWithPasswordManual(password) {
  if (!currentUserId) throw new Error('No user session');
  const result = await unlockWithPassword(currentUserId, password);
  if (result.status !== 'unlocked') {
    throw new Error('Incorrect password');
  }
  return result;
}

export async function unlockWithRecoveryCode(recoveryCode) {
  if (!currentUserId) throw new Error('No user session');
  const row = await fetchUserKeys(currentUserId);
  if (!row) throw new Error('Encryption is not enabled for this account');

  const code = normalizeRecoveryCode(recoveryCode);
  const kek = await deriveKEK(code, row.kdf_salt_recovery, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_recovery_wrapped, kek); // throws on wrong code
  await unlockAndCache(currentUserId, rawDek);
  return rawDek;
}

// Brand-new setup (register, or existing-user opt-in). Returns the recovery
// code so the caller can show RecoveryCodeModal exactly once.
// `password` is either the real account password (email/password users) or
// a standalone "app password" (OAuth users, who have no password in
// Supabase Auth at all) — cryptographically identical, just a different
// secret string. `isAppPassword` only affects how the UI labels prompts later.
export async function setupEncryption(userId, password, { status = 'enabled', isAppPassword = false } = {}) {
  const rawDek = generateRawDEK();
  const recoveryCode = generateRecoveryCode();

  const saltPassword = generateSalt();
  const saltRecovery = generateSalt();

  const kekPassword = await deriveKEK(password, saltPassword);
  // Must normalize the same way unlockWithRecoveryCode/rewrapAfterReset do
  // (strips the display dashes) — otherwise the KEK derived here never
  // matches the one derived at unlock time, and the recovery code always
  // fails even when copied correctly.
  const kekRecovery = await deriveKEK(normalizeRecoveryCode(recoveryCode), saltRecovery);

  const dekPasswordWrapped = await wrapDEK(rawDek, kekPassword);
  const dekRecoveryWrapped = await wrapDEK(rawDek, kekRecovery);

  await insertUserKeys(userId, {
    dek_password_wrapped: dekPasswordWrapped,
    kdf_salt_password: saltPassword,
    dek_recovery_wrapped: dekRecoveryWrapped,
    kdf_salt_recovery: saltRecovery,
    encryption_status: status,
    is_app_password: isAppPassword,
  });

  await unlockAndCache(userId, rawDek);
  currentUserId = userId;
  return { recoveryCode };
}

// Password change: re-wrap the existing DEK under a new password-KEK.
// Must run BEFORE supabase.auth.updateUser() call fails silently leave a
// stale wrap — caller retries updateUserKeys on failure before navigating away.
export async function rewrapForPasswordChange(userId, oldPassword, newPassword) {
  const row = await fetchUserKeys(userId);
  if (!row) return; // encryption not enabled — nothing to do

  const oldKek = await deriveKEK(oldPassword, row.kdf_salt_password, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_password_wrapped, oldKek); // verifies old password

  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);
  const newWrapped = await wrapDEK(rawDek, newKek);

  await updateUserKeys(userId, {
    dek_password_wrapped: newWrapped,
    kdf_salt_password: newSalt,
  });

  await unlockAndCache(userId, rawDek);
}

// App-password change (OAuth users only): re-wrap the DEK under a new app
// password. Same shape as rewrapForPasswordChange, but verifies against the
// stored app password-KEK instead of a Supabase Auth password (there isn't
// one for these users).
export async function rewrapForAppPasswordChange(userId, oldAppPassword, newAppPassword) {
  const row = await fetchUserKeys(userId);
  if (!row) return;

  const oldKek = await deriveKEK(oldAppPassword, row.kdf_salt_password, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_password_wrapped, oldKek); // verifies old app password

  const newSalt = generateSalt();
  const newKek = await deriveKEK(newAppPassword, newSalt);
  const newWrapped = await wrapDEK(rawDek, newKek);

  await updateUserKeys(userId, {
    dek_password_wrapped: newWrapped,
    kdf_salt_password: newSalt,
  });

  await unlockAndCache(userId, rawDek);
}

// Password reset via recovery code: unwrap with the recovery-KEK, then
// re-wrap under the new password.
export async function rewrapAfterReset(userId, newPassword, recoveryCode) {
  const row = await fetchUserKeys(userId);
  if (!row) return;

  const code = normalizeRecoveryCode(recoveryCode);
  const recoveryKek = await deriveKEK(code, row.kdf_salt_recovery, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_recovery_wrapped, recoveryKek);

  const newSalt = generateSalt();
  const newKek = await deriveKEK(newPassword, newSalt);
  const newWrapped = await wrapDEK(rawDek, newKek);

  await updateUserKeys(userId, {
    dek_password_wrapped: newWrapped,
    kdf_salt_password: newSalt,
  });

  await unlockAndCache(userId, rawDek);
}

// Regenerate just the recovery code — keeps the same DEK and password/app-
// password wrap untouched, only replaces dek_recovery_wrapped. Used from My
// Profile > Encryption ("Regenerate recovery code") when a user wants a
// fresh code (e.g. they suspect the old one leaked, or — as happened before
// the setupEncryption dash-normalization fix — their original code was
// generated with a mismatched KEK and never worked). Verifies the current
// password/app password first, via the same unwrap-as-verification pattern
// as rewrapForPasswordChange.
export async function rotateRecoveryCode(userId, currentSecret) {
  const row = await fetchUserKeys(userId);
  if (!row) throw new Error('Encryption is not enabled for this account');

  const kek = await deriveKEK(currentSecret, row.kdf_salt_password, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_password_wrapped, kek); // throws if currentSecret is wrong

  return finishRotateRecoveryCode(userId, rawDek);
}

// Same regeneration, but for when the user doesn't remember their
// password/security code and still has their OLD recovery code instead.
// Verifies via dek_recovery_wrapped rather than dek_password_wrapped.
export async function rotateRecoveryCodeViaRecoveryCode(userId, oldRecoveryCode) {
  const row = await fetchUserKeys(userId);
  if (!row) throw new Error('Encryption is not enabled for this account');

  const code = normalizeRecoveryCode(oldRecoveryCode);
  const kek = await deriveKEK(code, row.kdf_salt_recovery, row.kdf_iterations);
  const rawDek = await unwrapDEK(row.dek_recovery_wrapped, kek); // throws if oldRecoveryCode is wrong

  return finishRotateRecoveryCode(userId, rawDek);
}

async function finishRotateRecoveryCode(userId, rawDek) {
  const recoveryCode = generateRecoveryCode();
  const saltRecovery = generateSalt();
  const kekRecovery = await deriveKEK(normalizeRecoveryCode(recoveryCode), saltRecovery);

  await updateUserKeys(userId, {
    dek_recovery_wrapped: await wrapDEK(rawDek, kekRecovery),
    kdf_salt_recovery: saltRecovery,
  });

  return { recoveryCode };
}

// Lost recovery code path: archive old wraps, generate a fresh key pair.
// Old ciphertext remains on disk but undecryptable until/unless the old
// recovery code is recovered from previous_keys.
export async function resetWithNewKey(userId, newPassword) {
  const row = await fetchUserKeys(userId);
  if (!row) return;

  const archived = {
    key_version: row.key_version,
    dek_password_wrapped: row.dek_password_wrapped,
    kdf_salt_password: row.kdf_salt_password,
    dek_recovery_wrapped: row.dek_recovery_wrapped,
    kdf_salt_recovery: row.kdf_salt_recovery,
    kdf_iterations: row.kdf_iterations,
    retired_at: new Date().toISOString(),
  };

  const rawDek = generateRawDEK();
  const recoveryCode = generateRecoveryCode();
  const saltPassword = generateSalt();
  const saltRecovery = generateSalt();

  const kekPassword = await deriveKEK(newPassword, saltPassword);
  const kekRecovery = await deriveKEK(normalizeRecoveryCode(recoveryCode), saltRecovery);

  await updateUserKeys(userId, {
    key_version: (row.key_version || 1) + 1,
    dek_password_wrapped: await wrapDEK(rawDek, kekPassword),
    kdf_salt_password: saltPassword,
    dek_recovery_wrapped: await wrapDEK(rawDek, kekRecovery),
    kdf_salt_recovery: saltRecovery,
    encryption_status: 'enabled',
    migration_cursor: {},
    previous_keys: [...(row.previous_keys || []), archived],
  });

  await unlockAndCache(userId, rawDek);
  return { recoveryCode };
}

// Starts the reversal: CryptoContext's migration effect picks up
// 'disabling' status and runs migrationRunner in decrypt direction. Call
// finishDisablingEncryption() once that completes.
export async function startDisablingEncryption(userId) {
  await updateUserKeys(userId, { encryption_status: 'disabling' });
}

export async function finishDisablingEncryption(userId) {
  await deleteUserKeys(userId);
  keyring.setOff();
  await keyStore.clearKeys();
}

// Only clears in-memory state — deliberately leaves the IndexedDB-cached
// CryptoKey alone. It's a non-extractable key, not a secret an attacker can
// read out of storage, so there's no security benefit to wiping it on every
// sign-out; doing so forced OAuth users (who have no password-based
// auto-unlock at login) to re-enter their app password/recovery code after
// every logout. The cache is only cleared explicitly via "Disable
// encryption" (finishDisablingEncryption) or the lost-recovery-code reset.
export function handleSignOut() {
  currentUserId = null;
  keyring.clear();
}
