import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import * as OTPAuth from 'otpauth';

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
    
    const data = await request.json();
    
    // Validate that the code exists
    if (!data.code) {
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
        { success: false, message: '2FA setup not initialized' },
        { status: 400 }
      );
    }
    
    // Verify the code
    try {
      // For testing in development, accept code "123456"
      let isValid = process.env.NODE_ENV === 'development' && data.code === '123456';
      
      if (!isValid) {
        // Create a new TOTP object
        const totp = new OTPAuth.TOTP({
          issuer: 'EmailSender',
          label: user.email,
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: securitySettings.twoFactorSecret
        });
        
        // Verify the token
        isValid = totp.validate({ token: data.code }) !== null;
      }
      
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error validating 2FA code:', error);
      return NextResponse.json(
        { success: false, message: 'Error validating code' },
        { status: 500 }
      );
    }
    
    // Enable 2FA for the user
    securitySettings.twoFactorEnabled = true;
    await securitySettings.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Two-factor authentication verified successfully' 
    });
  } catch (error: any) {
    console.error('Error confirming 2FA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
} 