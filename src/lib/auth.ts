import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { IUser } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env');
}

interface TokenPayload {
  id: string;
  email: string;
  name: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: Partial<IUser> & { _id: string }): string {
  const payload: TokenPayload = {
    id: user._id,
    email: user.email!,
    name: user.name!,
  };

  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from cookies in an API route
 */
export function getUserFromRequest(req: NextRequest): TokenPayload | null {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user from cookies in a Server Component
 * This is only usable in Server Components, not in API routes
 */
export async function getUser(): Promise<TokenPayload | null> {
  try {
    // Note: This is only callable in a Server Component
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Set auth cookie with JWT token
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
 * Clear auth cookie
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