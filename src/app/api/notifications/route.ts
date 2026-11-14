import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AppNotification from '@/models/AppNotification';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get the authenticated user
    const user = await getUserFromRequest(request);
    
    // If no user is found, return unauthorized
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get URL params
    const searchParams = request.nextUrl.searchParams;
    const rawLimit = Number(searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.trunc(rawLimit), 1), 50)
      : 10;
    const rawPage = Number(searchParams.get('page'));
    const page = Number.isFinite(rawPage) ? Math.max(Math.trunc(rawPage), 1) : 1;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build query
    const query: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) {
      query.isRead = false;
    }

    // Fetch notifications, filtered total, and overall unread count in parallel
    const [notifications, total, unreadCount] = await Promise.all([
      AppNotification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AppNotification.countDocuments(query),
      AppNotification.countDocuments({ userId: user.id, isRead: false }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic'; 