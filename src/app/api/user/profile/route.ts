import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import mongoose from 'mongoose';

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
    const user = await User.findById(userPayload.id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find or create user profile
    let userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile) {
      // Create a new profile if it doesn't exist
      userProfile = await UserProfile.create({
        userId: user._id,
        // Default values are defined in the schema
      });
    }
    
    // Combine user and profile data
    const profileData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      company: userProfile.company || '',
      location: userProfile.location || '',
      phone: userProfile.phone || '',
      jobTitle: userProfile.jobTitle || '',
      bio: userProfile.bio || '',
      profilePicture: userProfile.profilePicture || null,
      timezone: userProfile.timezone || 'UTC+00:00',
    };
    
    return NextResponse.json({ profile: profileData });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
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
    
    // Update basic user data
    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email;
    await user.save();
    
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
    
    // Combine user and profile data for response
    const profileData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      company: userProfile.company || '',
      location: userProfile.location || '',
      phone: userProfile.phone || '',
      jobTitle: userProfile.jobTitle || '',
      bio: userProfile.bio || '',
      profilePicture: userProfile.profilePicture || null,
      timezone: userProfile.timezone || 'UTC+00:00',
    };
    
    return NextResponse.json({ 
      success: true, 
      profile: profileData
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
} 