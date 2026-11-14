import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import {
  generateToken,
  setAuthCookie,
  createSession,
  generatePendingTwoFactorToken,
  setPendingTwoFactorCookie,
} from '@/lib/auth';
import { loginSchema } from '@/utils/validation';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipLimited = await enforceRateLimit({
      key: `login:ip:${clientIp}`,
      limit: 20,
      windowSeconds: 15 * 60,
    });
    if (ipLimited) return ipLimited;

    try {
      await connectDB();
    } catch (dbError: unknown) {
      const details = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details,
        },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Request parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body - could not parse JSON' },
        { status: 400 }
      );
    }

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const emailLimited = await enforceRateLimit({
      key: `login:email:${email.toLowerCase()}`,
      limit: 10,
      windowSeconds: 15 * 60,
    });
    if (emailLimited) return emailLimited;

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const securitySettings = await SecuritySettings.findOne({ userId: user._id });

    if (securitySettings && securitySettings.twoFactorEnabled) {
      const pendingToken = await generatePendingTwoFactorToken(
        user._id.toString(),
        user.email
      );
      const pendingResponse = NextResponse.json({
        requiresTwoFactor: true,
        message: 'Please enter your 2FA verification code',
        email: user.email,
      });
      setPendingTwoFactorCookie(pendingResponse, pendingToken);
      return pendingResponse;
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
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

    setAuthCookie(response, token);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Login failed',
        message,
        stack:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
