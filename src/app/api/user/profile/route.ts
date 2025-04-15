import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';

export async function GET(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Find the user
    const user = await User.findById(userPayload.id).select('name email');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find user profile
    let userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile) {
      // Create default profile if none exists
      userProfile = await UserProfile.create({
        userId: user._id,
        // Default values defined in schema
      });
    }
    
    // Return combined user and profile data
    return NextResponse.json({
      name: user.name,
      email: user.email,
      jobTitle: userProfile.jobTitle || '',
      company: userProfile.company || '',
      location: userProfile.location || '',
      phone: userProfile.phone || '',
      bio: userProfile.bio || '',
      profilePicture: userProfile.profilePicture || '',
      timezone: userProfile.timezone || 'UTC+00:00'
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Connect to DB
    await connectDB();
    
    // Get the current user from the token
    const userPayload = getUserFromRequest(request);
    
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
    
    // Update name in user model
    if (data.name) {
      user.name = data.name;
      await user.save();
    }
    
    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
    }
    
    // Update profile fields
    const fieldsToUpdate = [
      'jobTitle',
      'company',
      'location',
      'phone',
      'bio',
      'timezone'
    ];
    
    fieldsToUpdate.forEach(field => {
      if (data[field] !== undefined) {
        userProfile[field] = data[field];
      }
    });
    
    await userProfile.save();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: {
        name: user.name,
        email: user.email,
        jobTitle: userProfile.jobTitle,
        company: userProfile.company,
        location: userProfile.location,
        phone: userProfile.phone,
        bio: userProfile.bio,
        profilePicture: userProfile.profilePicture,
        timezone: userProfile.timezone
      }
    });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update user profile' },
      { status: 500 }
    );
  }
} 