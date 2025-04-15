import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/utils/notifications';
import AppNotification from '@/models/AppNotification';

export async function POST(req: NextRequest) {
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
    const data = await req.json();
    
    // Check for notificationId or markAll flag
    if (!data.notificationId && !data.markAll) {
      return NextResponse.json(
        { error: 'Either notificationId or markAll parameter is required' },
        { status: 400 }
      );
    }
    
    let success = false;
    
    if (data.markAll) {
      // Mark all notifications as read
      success = await markAllNotificationsAsRead(userId);
    } else {
      // Verify the notification belongs to the user
      const notification = await AppNotification.findById(data.notificationId);
      
      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
      
      if (notification.userId.toString() !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
      
      // Mark the specific notification as read
      success = await markNotificationAsRead(data.notificationId);
    }
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: data.markAll ? 'All notifications marked as read' : 'Notification marked as read',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to mark notification(s) as read' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: `Failed to mark notification as read: ${error.message}` },
      { status: 500 }
    );
  }
} 