import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest, generateToken, setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';

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
  } catch (error: unknown) {
    console.error('Error fetching user profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user profile';
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
    
    // Update name in user model
    const nextName = typeof data.name === 'string' ? data.name.trim() : '';
    const nameChanged = Boolean(nextName && nextName !== user.name);
    if (nameChanged) {
      user.name = nextName;
      await user.save();
    }
    
    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
    }
    
    // Update profile fields
    if (data.jobTitle !== undefined) userProfile.jobTitle = data.jobTitle;
    if (data.company !== undefined) userProfile.company = data.company;
    if (data.location !== undefined) userProfile.location = data.location;
    if (data.phone !== undefined) userProfile.phone = data.phone;
    if (data.bio !== undefined) userProfile.bio = data.bio;
    if (data.timezone !== undefined) userProfile.timezone = data.timezone;
    
    await userProfile.save();
    
    const response = NextResponse.json({ 
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

    if (nameChanged) {
      const refreshedToken = await generateToken(user, userPayload.sessionId);
      setAuthCookie(response, refreshedToken);
    }

    return response;
  } catch (error: unknown) {
    console.error('Error updating user profile:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user profile';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
} 