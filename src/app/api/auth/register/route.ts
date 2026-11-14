import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateToken, setAuthCookie, createSession } from '@/lib/auth';
import { registerSchema } from '@/utils/validation';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limited = await enforceRateLimit({
      key: `register:ip:${clientIp}`,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (limited) return limited;

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

    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validationResult.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    let user;
    try {
      user = await User.create({
        name,
        email,
        password,
      });
    } catch (createError: unknown) {
      const details =
        createError instanceof Error ? createError.message : 'Failed to create user';
      console.error('User creation error:', createError);
      return NextResponse.json(
        {
          error: 'Failed to create user',
          details,
        },
        { status: 500 }
      );
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

    const response = NextResponse.json(
      {
        message: 'User registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );

    setAuthCookie(response, token);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        error: 'Registration failed',
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
