import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import speakeasy from 'speakeasy';
import { generateRecoveryCodes } from '@/lib/recovery-codes';

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
    const code = typeof data?.code === 'string' ? data.code.trim() : '';

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
    const candidateSecret =
      securitySettings?.pendingTwoFactorSecret || securitySettings?.twoFactorSecret;

    if (!securitySettings || !candidateSecret) {
      return NextResponse.json(
        { success: false, message: 'Two-factor authentication not set up' },
        { status: 400 }
      );
    }

    // Verify the token with +/- 1 step clock-skew tolerance
    const verified = speakeasy.totp.verify({
      secret: candidateSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Promote verified pending secret, enable 2FA, and generate single-use recovery codes
    const { plain: recoveryCodes, hashes } = generateRecoveryCodes();
    securitySettings.twoFactorSecret = candidateSecret;
    securitySettings.pendingTwoFactorSecret = null;
    securitySettings.twoFactorEnabled = true;
    securitySettings.failedTwoFactorAttempts = 0;
    securitySettings.twoFactorLockUntil = null;
    securitySettings.recoveryCodes = hashes;
    await securitySettings.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Palette Mail Authentication verified and enabled',
      recoveryCodes,
    });
  } catch (error: unknown) {
    console.error('Error confirming 2FA:', error);
    const message = error instanceof Error ? error.message : 'Failed to confirm two-factor authentication';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 