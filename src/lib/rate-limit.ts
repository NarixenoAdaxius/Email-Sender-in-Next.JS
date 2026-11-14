import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RateLimit from '@/models/RateLimit';

export interface RateLimitOptions {
  /** Logical bucket + identity, e.g. `login:ip:1.2.3.4` */
  key: string;
  /** Max requests allowed per window */
  limit: number;
  /** Window length in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * MongoDB-backed fixed-window limiter (atomic upsert + $inc, TTL cleanup).
 * Fails OPEN (logs) when the database errors.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const windowMs = opts.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;
  try {
    await connectDB();
    const doc = await RateLimit.findOneAndUpdate(
      { _id: `${opts.key}:${windowStart}` },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowEnd + 60_000) },
      },
      { upsert: true, new: true }
    ).lean();
    const count = doc?.count ?? 1;
    return {
      allowed: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
    };
  } catch (error) {
    console.error('Rate limiter error (failing open):', error);
    return { allowed: true, remaining: opts.limit, retryAfterSeconds: 0 };
  }
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      success: false,
      message: 'Too many requests. Please try again later.',
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

/**
 * Convenience for Node route handlers. Returns a 429 NextResponse when the
 * limit is exceeded, otherwise null:
 *   const limited = await enforceRateLimit({ key: `email-send:user:${id}`, limit: 30, windowSeconds: 60 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(opts: RateLimitOptions): Promise<NextResponse | null> {
  const result = await checkRateLimit(opts);
  return result.allowed ? null : rateLimitResponse(result.retryAfterSeconds);
}

/** Enforce several limits; returns the first 429 hit. */
export async function enforceRateLimits(opts: RateLimitOptions[]): Promise<NextResponse | null> {
  for (const o of opts) {
    const limited = await enforceRateLimit(o);
    if (limited) return limited;
  }
  return null;
}
