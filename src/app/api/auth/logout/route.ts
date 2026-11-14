import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest, clearAuthCookie, getTokenFromRequest } from '@/lib/auth';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userPayload = await getUserFromRequest(request);
    const token = getTokenFromRequest(request);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    clearAuthCookie(response);

    if (userPayload) {
      const tokensToRevoke = [token, userPayload.sessionId].filter(
        (t): t is string => Boolean(t)
      );

      if (tokensToRevoke.length > 0) {
        try {
          await Session.updateMany(
            { token: { $in: tokensToRevoke }, isRevoked: false },
            { $set: { isRevoked: true } }
          );
        } catch (sessionError) {
          console.error('Error revoking session:', sessionError);
        }
      }
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    console.error('Logout error:', error);
    const response = NextResponse.json(
      { success: false, message },
      { status: 500 }
    );

    clearAuthCookie(response);

    return response;
  }
}
