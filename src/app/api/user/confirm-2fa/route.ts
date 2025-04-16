import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import speakeasy from 'speakeasy';

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
    
    // Parse request body
    const data = await request.json();
    const { code } = data;
    
    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Verification code is required' },
        { status: 400 }
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
    
    // Find security settings
    const securitySettings = await SecuritySettings.findOne({ userId: user._id });
    
    if (!securitySettings || !securitySettings.twoFactorSecret) {
      return NextResponse.json(
        { success: false, message: 'Two-factor authentication not set up' },
        { status: 400 }
      );
    }
    
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: securitySettings.twoFactorSecret,
      encoding: 'base32',
      token: code
    });
    
    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Enable 2FA
    securitySettings.twoFactorEnabled = true;
    await securitySettings.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Palette Mail Authentication verified and enabled' 
    });
  } catch (error: any) {
    console.error('Error confirming 2FA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to confirm two-factor authentication' },
      { status: 500 }
    );
  }
} 