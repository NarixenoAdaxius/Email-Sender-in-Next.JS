import crypto from 'crypto';

export const RECOVERY_CODE_COUNT = 10;

/** Lowercase and strip separators/whitespace. */
export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function hashRecoveryCode(normalized: string): string {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** Generates plaintext codes (xxxxx-xxxxx, 50 bits each) and their hashes. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(5).toString('hex');
    plain.push(`${hex.slice(0, 5)}-${hex.slice(5)}`);
  }
  return { plain, hashes: plain.map((c) => hashRecoveryCode(normalizeRecoveryCode(c))) };
}
