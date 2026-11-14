import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import Image from '@/models/Image';
import { hasValidImageMagicBytes } from '@/lib/utils';
import { enforceRateLimits, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const userPayload = await getUserFromRequest(request);
    
    if (!userPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const clientIp = getClientIp(request);
    const limited = await enforceRateLimits([
      { key: `upload-image:user:${userPayload.id}`, limit: 30, windowSeconds: 10 * 60 },
      { key: `upload-image:ip:${clientIp}`, limit: 60, windowSeconds: 10 * 60 },
    ]);
    if (limited) return limited;
    
    // Connect to MongoDB
    await connectDB();
    
    // Process the form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const rawFolder = formData.get('folder');
    const folder =
      typeof rawFolder === 'string' && /^[a-z0-9-_]+$/i.test(rawFolder)
        ? rawFolder
        : 'email-images';
    
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
    
    // Validate file size (non-empty and max 5MB)
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded image file is empty' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size should be less than 5MB' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0 || !hasValidImageMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Uploaded file signature does not match the declared image type.' },
        { status: 400 }
      );
    }
    
    // Save to MongoDB instead of Cloudinary
    const newImage = new Image({
      name: file.name,
      userId: userPayload.id,
      data: buffer,
      contentType: file.type,
      folder: folder,
      size: file.size,
    });
    
    await newImage.save();
    
    // Create URL for accessing the image
    const imageUrl = `/api/images/${newImage._id}`;
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      imageId: newImage._id.toString()
    });
    
  } catch (error: unknown) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
} 