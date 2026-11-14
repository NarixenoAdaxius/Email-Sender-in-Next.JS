import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import speakeasy from 'speakeasy';
import {
  generateToken,
  setAuthCookie,
  createSession,
  verifyPendingTwoFactorToken,
  clearPendingTwoFactorCookie,
} from '@/lib/auth';
import { z } from 'zod';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';
import { hashRecoveryCode, normalizeRecoveryCode } from '@/lib/recovery-codes';

const verify2FASchema = z.object({
  email: z.string().email(),
  code: z.string().trim().min(6).max(32),
  useRecoveryCode: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const limited = await enforceRateLimit({
      key: `verify-2fa:ip:${clientIp}`,
      limit: 20,
      windowSeconds: 15 * 60,
    });
    if (limited) return limited;

    await connectDB();

    const data: unknown = await request.json();

    const validationResult = verify2FASchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, code, useRecoveryCode } = validationResult.data;

    const pendingToken = request.cookies.get('pending_2fa')?.value;
    const pendingPayload = pendingToken
      ? await verifyPendingTwoFactorToken(pendingToken)
      : null;

    if (
      !pendingPayload ||
      pendingPayload.email.toLowerCase() !== email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Two-factor authentication session expired. Please sign in again.',
        },
        { status: 401 }
      );
    }

    const user = await User.findById(pendingPayload.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const securitySettings = await SecuritySettings.findOne({ userId: user._id });

    if (
      !securitySettings ||
      !securitySettings.twoFactorEnabled ||
      !securitySettings.twoFactorSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Two-factor authentication not enabled for this user',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    if (securitySettings.twoFactorLockUntil && securitySettings.twoFactorLockUntil > now) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many failed verification attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    const isRecoveryAttempt = Boolean(useRecoveryCode) || !/^\d{6}$/.test(code);

    if (isRecoveryAttempt) {
      const normalized = normalizeRecoveryCode(code);
      const codeHash = normalized.length === 10 ? hashRecoveryCode(normalized) : null;
      const consumed = codeHash
        ? await SecuritySettings.findOneAndUpdate(
            {
              userId: user._id,
              twoFactorEnabled: true,
              recoveryCodes: codeHash,
              $or: [
                { twoFactorLockUntil: null },
                { twoFactorLockUntil: { $lte: now } },
              ],
            },
            {
              $pull: { recoveryCodes: codeHash },
              $set: { failedTwoFactorAttempts: 0, twoFactorLockUntil: null },
            },
            { new: true }
          )
        : null;

      if (!consumed) {
        const nextAttempts = (securitySettings.failedTwoFactorAttempts || 0) + 1;
        securitySettings.failedTwoFactorAttempts = nextAttempts;

        if (nextAttempts >= 5) {
          securitySettings.twoFactorLockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await securitySettings.save();
          const lockResponse = NextResponse.json(
            {
              success: false,
              message: 'Too many failed verification attempts. Please sign in again later.',
            },
            { status: 429 }
          );
          clearPendingTwoFactorCookie(lockResponse);
          return lockResponse;
        }

        await securitySettings.save();
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid or already used recovery code',
          },
          { status: 400 }
        );
      }
    } else {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const baseStep = Math.floor(nowSeconds / 30);
      const delta = speakeasy.totp.verifyDelta({
        secret: securitySettings.twoFactorSecret,
        encoding: 'base32',
        token: code,
        time: nowSeconds,
        window: 1,
      });

      const verifiedStep = delta !== undefined ? baseStep + delta.delta : null;
      const isReplay =
        verifiedStep !== null &&
        typeof securitySettings.lastVerifiedTotpStep === 'number' &&
        verifiedStep <= securitySettings.lastVerifiedTotpStep;

      if (verifiedStep === null || isReplay) {
        const nextAttempts = (securitySettings.failedTwoFactorAttempts || 0) + 1;
        securitySettings.failedTwoFactorAttempts = nextAttempts;

        if (nextAttempts >= 5) {
          securitySettings.twoFactorLockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await securitySettings.save();
          const lockResponse = NextResponse.json(
            {
              success: false,
              message: 'Too many failed verification attempts. Please sign in again later.',
            },
            { status: 429 }
          );
          clearPendingTwoFactorCookie(lockResponse);
          return lockResponse;
        }

        await securitySettings.save();
        return NextResponse.json(
          {
            success: false,
            message: isReplay
              ? 'This verification code has already been used. Wait for the next code.'
              : 'Invalid verification code',
          },
          { status: 400 }
        );
      }

      securitySettings.failedTwoFactorAttempts = 0;
      securitySettings.twoFactorLockUntil = null;
      securitySettings.lastVerifiedTotpStep = verifiedStep;
      await securitySettings.save();
    }

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sessionToken = await createSession(
      user._id.toString(),
      userAgent,
      Array.isArray(ip) ? ip[0] : ip
    );

    const token = await generateToken(user, sessionToken);

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

    setAuthCookie(response, token);
    clearPendingTwoFactorCookie(response);

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to verify two-factor authentication';
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
