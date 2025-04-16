import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import Image from '@/models/Image';

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
    
    // Check for either 'profilePicture' or 'image' field
    let file = formData.get('profilePicture') as File;
    
    if (!file) {
      // Try alternate field name
      file = formData.get('image') as File;
    }
    
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
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size should be less than 5MB' },
        { status: 400 }
      );
    }
    
    try {
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Save to MongoDB instead of Cloudinary
      const newImage = new Image({
        name: file.name || `profile-${Date.now()}.jpg`,
        userId: userPayload.id,
        data: buffer,
        contentType: file.type,
        folder: 'profile-pictures',
        size: file.size,
      });
      
      await newImage.save();
      
      // Create URL for accessing the image
      const imageUrl = `/api/images/${newImage._id.toString()}`;
      
      // Update user profile with new profile picture URL
      let userProfile = await UserProfile.findOne({ userId: user._id });
      
      if (!userProfile) {
        userProfile = new UserProfile({ userId: user._id });
      }
      
      userProfile.profilePicture = imageUrl;
      await userProfile.save();
      
      return NextResponse.json({ 
        success: true,
        profilePicture: imageUrl
      });
    } catch (uploadError: any) {
      console.error('Error saving image:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload image' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing a user's profile picture
 */
export async function DELETE(request: NextRequest) {
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
    
    // Find the user profile
    const userProfile = await UserProfile.findOne({ userId: user._id });
    
    if (!userProfile || !userProfile.profilePicture) {
      // No profile picture to remove
      return NextResponse.json({ 
        success: true,
        message: 'No profile picture to remove'
      });
    }
    
    // Extract the image ID from the profile picture URL
    const profilePictureUrl = userProfile.profilePicture;
    const imageId = profilePictureUrl.split('/').pop();
    
    if (imageId) {
      // Delete the image from the database
      await Image.findByIdAndDelete(imageId);
    }
    
    // Update user profile to remove profile picture reference
    userProfile.profilePicture = null;
    await userProfile.save();
    
    return NextResponse.json({ 
      success: true,
      message: 'Profile picture removed successfully'
    });
    
  } catch (error: any) {
    console.error('Error removing profile picture:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove profile picture' },
      { status: 500 }
    );
  }
} 