import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('Change password request received');
    
    // Connect to DB
    await connectDB();
    console.log('Connected to database');
    
    // Get the current user from the token
    const userPayload = getUserFromRequest(request);
    console.log('User from token:', userPayload ? { id: userPayload.id } : 'No user found');
    
    if (!userPayload) {
      console.log('User not authenticated');
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    console.log('Request data received:', { 
      currentPasswordLength: data.currentPassword ? data.currentPassword.length : 0,
      newPasswordLength: data.newPassword ? data.newPassword.length : 0
    });
    
    // Validate that required fields exist
    if (!data.currentPassword || !data.newPassword) {
      console.log('Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Find the user with password
    const user = await User.findById(userPayload.id);
    console.log('User found:', user ? { id: user._id, email: user.email } : 'No user found');
    
    if (!user) {
      console.log('User not found in database');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify current password
    console.log('Verifying current password');
    const isPasswordValid = await user.comparePassword(data.currentPassword);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Current password is incorrect');
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }
    
    // Update user password - use model's pre-save hook for hashing
    console.log('Updating user password');
    user.password = data.newPassword; // The pre-save hook will hash it
    await user.save();
    console.log('Password updated successfully');
    
    // Update the security settings to record password change
    console.log('Updating security settings');
    const securitySettings = await SecuritySettings.findOne({ userId: user._id });
    
    if (securitySettings) {
      console.log('Updating existing security settings');
      securitySettings.lastPasswordChange = new Date();
      await securitySettings.save();
    } else {
      console.log('Creating new security settings');
      await SecuritySettings.create({
        userId: user._id,
        lastPasswordChange: new Date(),
      });
    }
    
    console.log('Password change completed successfully');
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