import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import speakeasy from 'speakeasy';
import { generateRecoveryCodes } from '@/lib/recovery-codes';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userPayload = await getUserFromRequest(request);

    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Verification code is required to enable 2FA' },
        { status: 400 }
      );
    }

    const user = await User.findById(userPayload.id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const securitySettings = await SecuritySettings.findOne({ userId: user._id });
    const candidateSecret =
      securitySettings?.pendingTwoFactorSecret || securitySettings?.twoFactorSecret;

    if (!securitySettings || !candidateSecret) {
      return NextResponse.json(
        { success: false, message: 'Two-factor authentication secret not configured' },
        { status: 400 }
      );
    }

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
      message: 'Two-factor authentication enabled successfully',
      recoveryCodes,
    });
  } catch (error: unknown) {
    console.error('Error enabling 2FA:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to enable two-factor authentication';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}