import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import { IUser } from '@/models/User';
import Session from '@/models/Session';
import { UAParser } from 'ua-parser-js';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  sessionId?: string;
}

export type TokenUserInput = Partial<IUser> & {
  _id: string | { toString(): string };
};

/**
 * Lazily encode JWT_SECRET so module evaluation during Next.js builds does not throw
 * when environment variables are absent, while failing closed on token operations.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a signed JWT token for a user using jose (Node 26 & Edge compatible).
 */
export async function generateToken(
  user: TokenUserInput,
  sessionId?: string
): Promise<string> {
  const userId = typeof user._id === 'string' ? user._id : user._id.toString();
  const payload: Record<string, string> = {
    id: userId,
    email: user.email || '',
    name: user.name || '',
  };

  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

/**
 * Verify and decode a JWT token. Fails closed and returns null on invalid tokens.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const id =
      (typeof payload.id === 'string' && payload.id) ||
      (typeof payload.sub === 'string' && payload.sub) ||
      '';

    if (!id || typeof payload.email !== 'string' || typeof payload.name !== 'string') {
      return null;
    }

    const decoded: TokenPayload = {
      id,
      email: payload.email,
      name: payload.name,
    };

    if (typeof payload.sessionId === 'string' && payload.sessionId) {
      decoded.sessionId = payload.sessionId;
      await connectDB();
      const activeSession = await Session.findOne({
        token: payload.sessionId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
        .select('_id')
        .lean();
      if (!activeSession) {
        return null;
      }
    } else {
      await connectDB();
      const revokedSession = await Session.findOne({
        token,
        isRevoked: true,
      })
        .select('_id')
        .lean();
      if (revokedSession) {
        return null;
      }
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get the current user from cookies in an API route.
 */
export async function getUserFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Get the raw JWT token string from an API request cookie.
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  try {
    return req.cookies.get('token')?.value || null;
  } catch {
    return null;
  }
}

/**
 * Get the current user from cookies in a Server Component.
 */
export async function getUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Parse user agent string to extract browser, OS, and device type metadata.
 */
export function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
    os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
    deviceType: device.type || 'desktop',
  };
}

/**
 * Create a new persisted session record for a user.
 */
export async function createSession(
  userId: string,
  userAgent: string,
  ip: string
): Promise<string> {
  const deviceInfo = parseUserAgent(userAgent);

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  const sessionToken = await new SignJWT({
    userId,
    timestamp: Date.now(),
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());

  const session = new Session({
    userId,
    token: sessionToken,
    deviceInfo: {
      ...deviceInfo,
      ip,
    },
    expiresAt: expiryDate,
  });

  await session.save();

  return sessionToken;
}

/**
 * Set auth cookie with JWT token.
 */
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear auth cookie.
 */
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Generate a short-lived signed token proving primary password verification
 * before completing 2FA verification.
 */
export async function generatePendingTwoFactorToken(
  userId: string,
  email: string
): Promise<string> {
  return await new SignJWT({
    id: userId,
    email,
    purpose: 'pending_2fa',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(getJwtSecret());
}

/**
 * Verify a short-lived pending 2FA challenge token.
 */
export async function verifyPendingTwoFactorToken(
  token: string
): Promise<{ id: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      payload.purpose !== 'pending_2fa' ||
      typeof payload.id !== 'string' ||
      !payload.id ||
      typeof payload.email !== 'string' ||
      !payload.email
    ) {
      return null;
    }
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}

/**
 * Store the short-lived pending 2FA token in an HttpOnly cookie scoped to /api/auth.
 */
export function setPendingTwoFactorCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: 'pending_2fa',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60,
    path: '/api/auth',
  });
}

/**
 * Clear the short-lived pending 2FA cookie.
 */
export function clearPendingTwoFactorCookie(res: NextResponse): void {
  res.cookies.set({
    name: 'pending_2fa',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/api/auth',
  });
}
