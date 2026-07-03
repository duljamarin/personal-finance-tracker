// Recovery code: 128 bits encoded as Crockford-style base32 (no I/L/O/U),
// grouped XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX for readability.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out.match(/.{1,4}/g).join('-');
}

// Tolerant of case, spaces, dashes, and the usual 0/O 1/I/L confusions.
export function normalizeRecoveryCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}
