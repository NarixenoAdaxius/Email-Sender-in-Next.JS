import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';

export async function POST(request: NextRequest) {
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
    
    // Find the user
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find or create security settings
    let securitySettings = await SecuritySettings.findOne({ userId: user._id });
    
    if (!securitySettings) {
      securitySettings = new SecuritySettings({ userId: user._id });
    }
    
    // Enable 2FA
    securitySettings.twoFactorEnabled = true;
    await securitySettings.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Two-factor authentication enabled successfully' 
    });
  } catch (error: any) {
    console.error('Error enabling 2FA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to enable two-factor authentication' },
      { status: 500 }
    );
  }
} 