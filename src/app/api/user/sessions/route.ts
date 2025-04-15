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
    const userPayload = getUserFromRequest(request);
    
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
    
    // Mark the current session
    const formattedSessions = sessions.map(session => {
      const { token, ...sessionData } = session.toObject();
      return {
        ...sessionData,
        isCurrent: session.token === currentToken,
      };
    });
    
    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
} 