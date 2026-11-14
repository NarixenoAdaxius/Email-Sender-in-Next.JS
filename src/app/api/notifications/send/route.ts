import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sendNotification, NotificationType } from '@/utils/notifications';
import { z } from 'zod';

// Validation schema for sending notifications
const sendNotificationSchema = z.object({
  type: z.enum([
    'newFeatures',
    'security',
    'emailSent',
    'emailOpened',
    'emailClicked',
    'emailBounced',
    'newTemplates',
  ]),
  title: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = await getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse request data
    const data = await request.json();
    
    // Validate input
    const validationResult = sendNotificationSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          issues: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const { type, title, subject, message, data: notificationData = {} } = validationResult.data;
    
    // Send notification scoped to the authenticated user
    const result = await sendNotification({
      userId: userPayload.id,
      type: type as NotificationType,
      title: title || subject,
      message,
      data: notificationData,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error: unknown) {
    console.error('Error sending notification:', error);
    const message = error instanceof Error ? error.message : 'Failed to send notification';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 