import crypto from 'crypto';

export interface UnsubscribeTokenPayload {
  email: string;
  userId: string;
  iat: number;
}

function getUnsubscribeSecret(explicitSecret?: string): string {
  const secret =
    explicitSecret ||
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      'Missing UNSUBSCRIBE_SECRET (or JWT_SECRET / NEXTAUTH_SECRET) for unsubscribe token signing'
    );
  }
  return secret;
}

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

/**
 * Create an HMAC-SHA256 signed token encoding recipient email and userId.
 */
export function signUnsubscribeToken(
  params: { email: string; userId: string },
  explicitSecret?: string
): string {
  const normalizedEmail = params.email.trim().toLowerCase();
  const userId = params.userId.trim();
  if (!normalizedEmail || !userId) {
    throw new Error('Both email and userId are required to sign an unsubscribe token');
  }

  const secret = getUnsubscribeSecret(explicitSecret);
  const payload = JSON.stringify({
    e: normalizedEmail,
    u: userId,
    iat: Math.floor(Date.now() / 1000),
  });
  const payloadB64 = toBase64Url(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify an HMAC-SHA256 signed unsubscribe token.
 * Returns the decoded payload or null if invalid or tampered.
 */
export function verifyUnsubscribeToken(
  token: string,
  explicitSecret?: string
): UnsubscribeTokenPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) {
    return null;
  }

  let secret: string;
  try {
    secret = getUnsubscribeSecret(explicitSecret);
  } catch {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest();

  let providedSigBuf: Buffer;
  try {
    providedSigBuf = fromBase64Url(providedSig);
  } catch {
    return null;
  }

  if (providedSigBuf.length !== expectedSig.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedSigBuf, expectedSig)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadB64).toString('utf8')) as {
      e?: unknown;
      u?: unknown;
      iat?: unknown;
    };
    if (
      typeof parsed.e !== 'string' ||
      !parsed.e.trim() ||
      typeof parsed.u !== 'string' ||
      !parsed.u.trim()
    ) {
      return null;
    }

    return {
      email: parsed.e.trim().toLowerCase(),
      userId: parsed.u.trim(),
      iat: typeof parsed.iat === 'number' ? parsed.iat : 0,
    };
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(params: {
  baseUrl: string;
  email: string;
  userId: string;
  secret?: string;
}): string {
  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  const token = signUnsubscribeToken(
    { email: params.email, userId: params.userId },
    params.secret
  );
  return `${cleanBase}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Build RFC 8058 List-Unsubscribe and List-Unsubscribe-Post headers.
 */
export function buildListUnsubscribeHeaders(params: {
  baseUrl: string;
  email: string;
  userId: string;
  mailto?: string;
  secret?: string;
}): Record<string, string> {
  const httpsUrl = buildUnsubscribeUrl({
    baseUrl: params.baseUrl,
    email: params.email,
    userId: params.userId,
    secret: params.secret,
  });

  const entries = [`<${httpsUrl}>`];
  const mailto = params.mailto?.trim();
  if (mailto) {
    entries.push(`<mailto:${mailto}?subject=unsubscribe>`);
  }

  return {
    'List-Unsubscribe': entries.join(', '),
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
