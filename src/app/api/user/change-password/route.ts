import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // Validate that required fields exist
    if (!data.currentPassword || !data.newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Find the user with password
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }
    
    // Create new password hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);
    
    // Update user password
    user.password = passwordHash;
    await user.save();
    
    // Update the security settings to record password change
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
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
} 