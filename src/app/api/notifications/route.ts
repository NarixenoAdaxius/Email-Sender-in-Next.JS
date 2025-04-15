import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getUserNotifications } from '@/utils/notifications';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    // Check if user is authenticated
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Get notifications
    const { notifications, total } = await getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: `Failed to fetch notifications: ${error.message}` },
      { status: 500 }
    );
  }
} 