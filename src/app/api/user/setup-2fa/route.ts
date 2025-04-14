import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import User from '@/models/User';
import SecuritySettings from '@/models/SecuritySettings';
import crypto from 'crypto';
import qrcode from 'qrcode';

// Helper function to generate a random secret
function generateSecret() {
  const secret = crypto.randomBytes(20).toString('hex');
  return secret;
}

// Helper function to generate a QR code URL
async function generateQrCode(email: string, secret: string) {
  const otpauthUrl = `otpauth://totp/EmailSender:${email}?secret=${secret}&issuer=EmailSender`;
  
  try {
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

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
    
    // Find the user
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate a new secret
    const secret = generateSecret();
    
    // Generate QR code
    const qrCode = await generateQrCode(user.email, secret);
    
    // Find or create security settings
    let securitySettings = await SecuritySettings.findOne({ userId: user._id });
    
    if (!securitySettings) {
      securitySettings = new SecuritySettings({ userId: user._id });
    }
    
    // Store the secret temporarily
    securitySettings.twoFactorSecret = secret;
    await securitySettings.save();
    
    return NextResponse.json({ 
      success: true,
      qrCode,
      secret
    });
  } catch (error: any) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to setup two-factor authentication' },
      { status: 500 }
    );
  }
} 