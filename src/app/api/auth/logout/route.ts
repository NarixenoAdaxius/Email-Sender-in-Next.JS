import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ 
      message: 'Logged out successfully' 
    });
    
    // Clear the auth cookie
    clearAuthCookie(response);
    
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
} 