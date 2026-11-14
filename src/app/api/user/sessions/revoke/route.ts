import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest, getTokenFromRequest } from '@/lib/auth';
import Session from '@/models/Session';
import mongoose from 'mongoose';
import { z } from 'zod';

// Validation schema for session revocation
const revokeSchema = z.object({
  sessionId: z.string().optional(),
  revokeAll: z.boolean().optional()
}).refine(data => data.sessionId !== undefined || data.revokeAll === true, {
  message: 'Either sessionId or revokeAll must be provided'
});

/**
 * POST /api/user/sessions/revoke
 * Revokes a specific session or all other sessions
 */
export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const data = await request.json();
    
    // Validate input
    const validationResult = revokeSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          issues: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const { sessionId, revokeAll } = validationResult.data;
    const userId = new mongoose.Types.ObjectId(userPayload.id);
    const currentToken = getTokenFromRequest(request);
    const activeSessionTokens = [currentToken, userPayload.sessionId].filter(
      (tokenValue): tokenValue is string => Boolean(tokenValue)
    );
    
    // Check if we should revoke all other sessions
    if (revokeAll) {
      if (activeSessionTokens.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Current session not found' },
          { status: 400 }
        );
      }
      
      // Revoke all sessions except the current one
      await Session.updateMany(
        {
          userId,
          token: { $nin: activeSessionTokens },
          isRevoked: false
        },
        {
          $set: { isRevoked: true }
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'All other sessions have been revoked'
      });
    } 
    
    // Revoke a specific session
    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid session ID' },
          { status: 400 }
        );
      }

      const session = await Session.findOne({
        _id: new mongoose.Types.ObjectId(sessionId),
        userId
      });
      
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Session not found' },
          { status: 404 }
        );
      }
      
      // Don't allow revoking the current session
      if (activeSessionTokens.includes(session.token)) {
        return NextResponse.json(
          { success: false, message: 'Cannot revoke current session' },
          { status: 400 }
        );
      }
      
      // Revoke the session
      session.isRevoked = true;
      await session.save();
      
      return NextResponse.json({
        success: true,
        message: 'Session has been revoked'
      });
    }
    
    // This shouldn't happen due to validation, but just in case
    return NextResponse.json(
      { success: false, message: 'Invalid request' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Error revoking session:', error);
    const message = error instanceof Error ? error.message : 'Failed to revoke session';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 