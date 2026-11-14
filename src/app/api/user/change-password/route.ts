import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getTokenFromRequest, getUserFromRequest } from '@/lib/auth';
import Session from '@/models/Session';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';

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

    const data = (await request.json().catch(() => null)) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    } | null;

    const currentPassword =
      typeof data?.currentPassword === 'string' ? data.currentPassword : '';
    const newPassword = typeof data?.newPassword === 'string' ? data.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters' },
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

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    user.password = newPassword;
    await user.save();

    const securitySettings = await SecuritySettings.findOne({ userId: user._id });

    if (securitySettings) {
      securitySettings.lastPasswordChange = new Date();
      await securitySettings.save();
    } else {
      await SecuritySettings.create({
        userId: user._id,
        lastPasswordChange: new Date(),
      });
    }

    const currentSessionToken =
      userPayload.sessionId || getTokenFromRequest(request) || '';
    await Session.revokeAllExcept(user._id, currentSessionToken);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    const message = error instanceof Error ? error.message : 'Failed to change password';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}