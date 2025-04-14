import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
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
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Process the form data
    const formData = await request.formData();
    const file = formData.get('profilePicture') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.' },
        { status: 400 }
      );
    }
    
    // Get file extension
    const fileExt = file.name.split('.').pop() || 'jpg';
    
    // Create a unique filename
    const filename = `${uuid()}.${fileExt}`;
    const publicDir = join(process.cwd(), 'public', 'uploads');
    const filepath = join(publicDir, filename);
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save file to disk
    await writeFile(filepath, buffer);
    
    // Update user profile with new profile picture URL
    let userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
    }
    
    const profilePictureUrl = `/uploads/${filename}`;
    userProfile.profilePicture = profilePictureUrl;
    await userProfile.save();
    
    return NextResponse.json({ 
      success: true,
      profilePicture: profilePictureUrl
    });
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
} 