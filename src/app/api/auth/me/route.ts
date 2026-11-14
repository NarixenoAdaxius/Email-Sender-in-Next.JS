import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userPayload = await getUserFromRequest(request);

    if (!userPayload) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [user, userProfile] = await Promise.all([
      User.findById(userPayload.id).select('_id name email').lean<{
        _id: unknown;
        name: string;
        email: string;
      } | null>(),
      UserProfile.findOne({ userId: userPayload.id })
        .select('profilePicture')
        .lean<{ profilePicture?: string | null } | null>(),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: userProfile?.profilePicture || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
