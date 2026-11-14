import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest, getTokenFromRequest } from '@/lib/auth';
import Session from '@/models/Session';
import mongoose from 'mongoose';

/**
 * GET /api/user/sessions
 * Fetches all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = await getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get current token
    const currentToken = getTokenFromRequest(request);
    
    // Find all active sessions for this user
    const sessions = await Session.findActiveSessionsByUserId(
      new mongoose.Types.ObjectId(userPayload.id)
    );
    
    // Mark the current session without exposing raw session tokens
    const formattedSessions = sessions.map(session => {
      const sessionData = session.toObject() as unknown as Record<string, unknown>;
      const isCurrent =
        session.token === currentToken ||
        Boolean(userPayload.sessionId && session.token === userPayload.sessionId);
      delete sessionData.token;
      return {
        ...sessionData,
        isCurrent,
      };
    });
    
    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error: unknown) {
    console.error('Error fetching sessions:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 