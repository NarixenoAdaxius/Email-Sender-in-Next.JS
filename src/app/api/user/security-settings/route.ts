import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';

export async function GET(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Find the user
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find or create security settings
    let securitySettings = await SecuritySettings.findOne({ userId: user._id });
    
    if (!securitySettings) {
      // Create default settings if none exist
      securitySettings = await SecuritySettings.create({
        userId: user._id,
        // Default values are defined in the schema
      });
    }
    
    return NextResponse.json({
      twoFactorEnabled: securitySettings.twoFactorEnabled,
      lastPasswordChange: securitySettings.lastPasswordChange
    });
  } catch (error: any) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch security settings' },
      { status: 500 }
    );
  }
} 