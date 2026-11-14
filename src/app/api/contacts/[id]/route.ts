import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Contact from '@/models/Contact';
import { getUserFromRequest } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\.,;:"']{1,64}(?:\.[^\s@<>()[\]\\.,;:"']+)*@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_CONTACT = 20;
const ALLOWED_STATUSES = new Set(['active', 'unsubscribed', 'bounced']);

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex > 64) return false;
  return EMAIL_REGEX.test(email);
}

function normalizeContactTags(rawTags: unknown): {
  tags: string[];
  error: string | null;
} {
  if (rawTags === undefined || rawTags === null) {
    return { tags: [], error: null };
  }

  let parts: string[];
  if (Array.isArray(rawTags)) {
    parts = [];
    for (const item of rawTags) {
      if (typeof item !== 'string') {
        return { tags: [], error: 'Each tag must be a string' };
      }
      const trimmed = item.trim();
      if (trimmed) {
        if (trimmed.length > MAX_TAG_LENGTH) {
          return {
            tags: [],
            error: `Each tag must be at most ${MAX_TAG_LENGTH} characters`,
          };
        }
        parts.push(trimmed);
      }
    }
  } else if (typeof rawTags === 'string') {
    parts = rawTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    for (const tag of parts) {
      if (tag.length > MAX_TAG_LENGTH) {
        return {
          tags: [],
          error: `Each tag must be at most ${MAX_TAG_LENGTH} characters`,
        };
      }
    }
  } else {
    return {
      tags: [],
      error: 'Tags must be an array of strings or comma-separated string',
    };
  }

  const unique = Array.from(new Set(parts));
  if (unique.length > MAX_TAGS_PER_CONTACT) {
    return {
      tags: [],
      error: `Maximum ${MAX_TAGS_PER_CONTACT} tags allowed per contact`,
    };
  }

  return { tags: unique, error: null };
}

// GET - Fetch a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Get the authenticated user
    const user = await getUserFromRequest(request);

    // If no user is found, return unauthorized
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Find the contact
    const contact = await Contact.findOne({
      _id: id,
      userId: user.id,
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PUT - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Get the authenticated user
    const user = await getUserFromRequest(request);

    // If no user is found, return unauthorized
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `contacts-write:user:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const { id } = await params;

    // Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Parse the request body safely
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const data = parsedBody as Record<string, unknown>;

    if (typeof data.name !== 'string' || typeof data.email !== 'string') {
      return NextResponse.json(
        { error: 'Name and email must be valid strings' },
        { status: 400 }
      );
    }

    const rawName = data.name.trim();
    const rawEmail = data.email.trim().toLowerCase();

    if (!rawName || !rawEmail) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (data.company !== undefined && data.company !== null && typeof data.company !== 'string') {
      return NextResponse.json(
        { error: 'Company must be a string' },
        { status: 400 }
      );
    }
    const company = typeof data.company === 'string' ? data.company.trim() : '';

    const { tags, error: tagsError } = normalizeContactTags(data.tags);
    if (tagsError) {
      return NextResponse.json({ error: tagsError }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      name: rawName,
      email: rawEmail,
      company,
      tags,
    };

    if (data.status !== undefined && data.status !== null) {
      if (typeof data.status !== 'string') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const trimmedStatus = data.status.trim().toLowerCase();
      if (trimmedStatus) {
        if (!ALLOWED_STATUSES.has(trimmedStatus)) {
          return NextResponse.json(
            { error: 'Status must be active, unsubscribed, or bounced' },
            { status: 400 }
          );
        }
        updatePayload.status = trimmedStatus;
      }
    }

    // Find and update the contact
    const updatedContact = await Contact.findOneAndUpdate(
      { _id: id, userId: user.id },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact: updatedContact });
  } catch (error: unknown) {
    console.error('Error updating contact:', error);

    // Handle duplicate key error
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Get the authenticated user
    const user = await getUserFromRequest(request);

    // If no user is found, return unauthorized
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `contacts-write:user:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const { id } = await params;

    // Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    // Find and delete the contact
    const deletedContact = await Contact.findOneAndDelete({
      _id: id,
      userId: user.id,
    });

    if (!deletedContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
