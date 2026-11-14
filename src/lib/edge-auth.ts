import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  sessionId?: string;
}

function getEdgeJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verify and decode a JWT token using jose library (Edge Runtime compatible).
 */
export async function verifyTokenEdge(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEdgeJwtSecret());
    const id =
      (typeof payload.id === 'string' && payload.id) ||
      (typeof payload.sub === 'string' && payload.sub) ||
      '';

    if (!id || typeof payload.email !== 'string' || typeof payload.name !== 'string') {
      return null;
    }

    const userPayload: TokenPayload = {
      id,
      email: payload.email,
      name: payload.name,
    };

    if (typeof payload.sessionId === 'string' && payload.sessionId) {
      userPayload.sessionId = payload.sessionId;
    }

    return userPayload;
  } catch {
    return null;
  }
}

/**
 * Get the current user from cookies in an Edge Runtime context.
 */
export async function getUserFromRequestEdge(req: NextRequest): Promise<TokenPayload | null> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    return await verifyTokenEdge(token);
  } catch {
    return null;
  }
}
