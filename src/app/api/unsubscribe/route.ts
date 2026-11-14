import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Suppression from '@/models/Suppression';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

async function handleUnsubscribe(token: string | null) {
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing unsubscribe token' },
      { status: 400 }
    );
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload || !mongoose.Types.ObjectId.isValid(payload.userId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired unsubscribe token' },
      { status: 400 }
    );
  }

  await dbConnect();

  await Suppression.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(payload.userId),
      email: payload.email.toLowerCase(),
    },
    {
      $set: {
        reason: 'unsubscribe',
        source: 'one-click',
      },
      $setOnInsert: {
        userId: new mongoose.Types.ObjectId(payload.userId),
        email: payload.email.toLowerCase(),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    success: true,
    email: payload.email,
    message: 'You have been unsubscribed.',
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    return await handleUnsubscribe(token);
  } catch (error) {
    console.error('Unsubscribe GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let token = request.nextUrl.searchParams.get('token');

    if (!token) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = (await request.json().catch(() => ({}))) as { token?: string };
        token = typeof body.token === 'string' ? body.token : null;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formText = await request.text().catch(() => '');
        const params = new URLSearchParams(formText);
        token = params.get('token');
      }
    }

    return await handleUnsubscribe(token);
  } catch (error) {
    console.error('Unsubscribe POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
