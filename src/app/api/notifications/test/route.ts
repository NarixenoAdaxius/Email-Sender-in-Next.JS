import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { sendNotification, NotificationType } from '@/utils/notifications';
import { connectToDatabase } from '@/lib/mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = await getUserFromRequest(req);
    
    // Check if user is authenticated
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const data = await req.json();
    
    // Default to newFeatures if no type is provided
    const type = data.type || 'newFeatures';
    const title = data.title || undefined; // Let the system generate a default title if not provided
    const message = data.message || 'This is a test notification';
    
    // Valid notification types
    const validTypes: NotificationType[] = [
      'newFeatures',
      'security',
      'emailSent',
      'emailOpened', 
      'emailClicked',
      'emailBounced',
      'newTemplates'
    ];
    
    if (!validTypes.includes(type as NotificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }
    
    // Send the notification
    const result = await sendNotification({
      userId,
      type: type as NotificationType,
      title,
      message,
      data: data.data || {}
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification created',
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error creating test notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create test notification: ${errorMessage}` },
      { status: 500 }
    );
  }
} 