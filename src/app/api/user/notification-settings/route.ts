import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import NotificationSettings from '@/models/NotificationSettings';

export async function GET(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = await getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Find the user
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find or create notification settings
    let settings = await NotificationSettings.findOne({ userId: user._id });
    
    if (!settings) {
      // Create default settings if none exist
      settings = await NotificationSettings.create({
        userId: user._id,
        // Default values are defined in the schema
      });
    }
    
    return NextResponse.json({
      app: settings.app
    });
  } catch (error: unknown) {
    console.error('Error fetching notification settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch notification settings';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = await getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // Find the user
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find or create notification settings
    let settings = await NotificationSettings.findOne({ userId: user._id });
    
    if (!settings) {
      settings = new NotificationSettings({ userId: user._id });
    }
    
    // Update settings with new data
    if (data.app && typeof data.app === 'object') {
      settings.app = {
        ...settings.app,
        ...data.app
      };
    }
    
    await settings.save();
    
    return NextResponse.json({ 
      success: true, 
      settings: {
        app: settings.app
      }
    });
  } catch (error: unknown) {
    console.error('Error updating notification settings:', error);
    const message = error instanceof Error ? error.message : 'Failed to update notification settings';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 