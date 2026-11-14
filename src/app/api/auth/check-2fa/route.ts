import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import { getUserFromRequest, verifyPendingTwoFactorToken } from '@/lib/auth';
import { z } from 'zod';

const check2FASchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const data: unknown = await request.json();

    const validationResult = check2FASchema.safeParse(data);
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

    const { email } = validationResult.data;

    // Require either an authenticated user or a valid pending_2fa session for this email
    const authUser = await getUserFromRequest(request);
    const pendingToken = request.cookies.get('pending_2fa')?.value;
    const pendingPayload = pendingToken
      ? await verifyPendingTwoFactorToken(pendingToken)
      : null;

    const authorizedEmail =
      authUser?.email.toLowerCase() === email.toLowerCase() ||
      pendingPayload?.email.toLowerCase() === email.toLowerCase();

    if (!authorizedEmail) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({
        success: true,
        requiresTwoFactor: false,
      });
    }

    const securitySettings = await SecuritySettings.findOne({ userId: user._id });
    const requiresTwoFactor = !!(securitySettings && securitySettings.twoFactorEnabled);

    return NextResponse.json({
      success: true,
      requiresTwoFactor,
    });
  } catch (error: unknown) {
    console.error('Error checking 2FA:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while checking two-factor authentication status',
      },
      { status: 500 }
    );
  }
}
