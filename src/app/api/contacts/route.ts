import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Contact from '@/models/Contact';
import { getUserFromRequest } from '@/lib/auth';
import { parsePagination, buildPaginationMeta } from '@/lib/pagination';
import { enforceRateLimit } from '@/lib/rate-limit';

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\.,;:"']{1,64}(?:\.[^\s@<>()[\]\\.,;:"']+)*@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const MAX_EMAIL_LENGTH = 254;
const ALLOWED_STATUSES = new Set(['active', 'unsubscribed', 'bounced']);
const MAX_BULK_IMPORT = 500;
const MAX_BULK_IDS = 1000;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_CONTACT = 20;
const MAX_SEARCH_LENGTH = 100;
const UNPAGINATED_LIMIT = 1000;

type ContactStatus = 'active' | 'unsubscribed' | 'bounced';

interface BulkContactInsertDoc {
  userId: string;
  name: string;
  email: string;
  company: string;
  tags: string[];
  status: ContactStatus;
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex > 64) return false;
  return EMAIL_REGEX.test(email);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBulkTags(rawTags: unknown): string[] {
  const parts = Array.isArray(rawTags)
    ? rawTags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
    : typeof rawTags === 'string'
      ? rawTags.split(/[;|,]/).map((tag) => tag.trim())
      : [];

  return Array.from(
    new Set(parts.filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH))
  ).slice(0, MAX_TAGS_PER_CONTACT);
}

function normalizeSingleTags(rawTags: unknown): {
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

function validateObjectIds(rawIds: unknown): {
  validIds: mongoose.Types.ObjectId[];
  error: string | null;
} {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return { validIds: [], error: 'ids must be a non-empty array' };
  }
  if (rawIds.length > MAX_BULK_IDS) {
    return { validIds: [], error: `Maximum ${MAX_BULK_IDS} contact IDs allowed per request` };
  }

  const seen = new Set<string>();
  const validIds: mongoose.Types.ObjectId[] = [];

  for (const item of rawIds) {
    if (typeof item !== 'string' || !mongoose.Types.ObjectId.isValid(item)) {
      return { validIds: [], error: 'All contact IDs must be valid ObjectIds' };
    }
    if (!seen.has(item)) {
      seen.add(item);
      validIds.push(new mongoose.Types.ObjectId(item));
    }
  }

  return { validIds, error: null };
}

async function parseJsonObjectBody(
  request: NextRequest
): Promise<{ body: Record<string, unknown> | null; error: string | null }> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { body: null, error: 'Request body must be a JSON object' };
    }
    return { body: parsed as Record<string, unknown>, error: null };
  } catch {
    return { body: null, error: 'Invalid JSON payload' };
  }
}

// GET - Fetch all contacts for the current user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get the authenticated user
    const user = await getUserFromRequest(request);

    // If no user is found, return unauthorized
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hasPaging = searchParams.has('page') || searchParams.has('limit');
    const filter: Record<string, unknown> = { userId: user.id };

    const rawSearch = (searchParams.get('search') || '').trim().slice(0, MAX_SEARCH_LENGTH);
    if (rawSearch) {
      const safeSearch = escapeRegex(rawSearch);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { company: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const rawTag = (searchParams.get('tag') || '').trim();
    if (rawTag && rawTag !== 'all') {
      filter.tags = rawTag.slice(0, MAX_TAG_LENGTH);
    }

    const projection = '_id name email company tags status createdAt updatedAt';

    if (!hasPaging) {
      // Backward compatible: return contacts capped at 1000 without redundant countDocuments
      const contacts = await Contact.find(filter)
        .select(projection)
        .sort({ name: 1 })
        .limit(UNPAGINATED_LIMIT)
        .lean();
      const total = contacts.length;
      return NextResponse.json({
        contacts,
        pagination: { page: 1, limit: total, total, totalPages: 1 },
      });
    }

    const { page, limit, skip } = parsePagination(
      searchParams.get('page'),
      searchParams.get('limit'),
      20,
      100
    );
    const [total, contacts, rawTags] = await Promise.all([
      Contact.countDocuments(filter),
      Contact.find(filter)
        .select(projection)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.distinct('tags', { userId: user.id }),
    ]);

    const availableTags = rawTags
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      contacts,
      pagination: buildPaginationMeta(page, limit, total),
      availableTags,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST - Create a new contact or bulk-import contacts
export async function POST(request: NextRequest) {
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

    // Parse the request body safely
    const { body, error: parseError } = await parseJsonObjectBody(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || 'Invalid request body' },
        { status: 400 }
      );
    }

    // Bulk import mode when body.contacts is provided
    if (body.contacts !== undefined) {
      if (!Array.isArray(body.contacts)) {
        return NextResponse.json(
          { error: 'contacts must be an array' },
          { status: 400 }
        );
      }

      if (body.contacts.length === 0) {
        return NextResponse.json(
          { error: 'Contacts array cannot be empty' },
          { status: 400 }
        );
      }

      if (body.contacts.length > MAX_BULK_IMPORT) {
        return NextResponse.json(
          { error: `Maximum ${MAX_BULK_IMPORT} contacts allowed per import request` },
          { status: 400 }
        );
      }

      let invalidCount = 0;
      let duplicateInPayloadCount = 0;
      const dedupedByEmail = new Map<string, BulkContactInsertDoc>();

      for (const rawRow of body.contacts) {
        if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
          invalidCount++;
          continue;
        }

        const row = rawRow as Record<string, unknown>;
        const rawEmail = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
        if (!isValidEmail(rawEmail)) {
          invalidCount++;
          continue;
        }

        let status: ContactStatus = 'active';
        if (row.status !== undefined && row.status !== null) {
          if (typeof row.status !== 'string') {
            invalidCount++;
            continue;
          }
          const trimmedStatus = row.status.trim().toLowerCase();
          if (trimmedStatus) {
            if (!ALLOWED_STATUSES.has(trimmedStatus)) {
              invalidCount++;
              continue;
            }
            status = trimmedStatus as ContactStatus;
          }
        }

        if (dedupedByEmail.has(rawEmail)) {
          duplicateInPayloadCount++;
          continue;
        }

        const rawName = typeof row.name === 'string' ? row.name.trim() : '';
        const name = rawName || rawEmail.split('@')[0] || 'Contact';
        const company = typeof row.company === 'string' ? row.company.trim() : '';
        const tags = normalizeBulkTags(row.tags);

        dedupedByEmail.set(rawEmail, {
          userId: user.id,
          name,
          email: rawEmail,
          company,
          tags,
          status,
        });
      }

      const candidateEmails = Array.from(dedupedByEmail.keys());
      const existingDocs =
        candidateEmails.length > 0
          ? await Contact.find({
              userId: user.id,
              email: { $in: candidateEmails },
            })
              .select('email')
              .lean<{ email: string }[]>()
          : [];

      const existingEmailSet = new Set(
        existingDocs.map((doc) => String(doc.email).trim().toLowerCase())
      );

      const docsToInsert: BulkContactInsertDoc[] = [];
      let existingCount = 0;

      for (const [email, doc] of dedupedByEmail.entries()) {
        if (existingEmailSet.has(email)) {
          existingCount++;
        } else {
          docsToInsert.push(doc);
        }
      }

      let importedCount = 0;
      let skippedCount = duplicateInPayloadCount + existingCount;

      if (docsToInsert.length > 0) {
        try {
          const inserted = await Contact.insertMany(docsToInsert, { ordered: false });
          importedCount = inserted.length;
        } catch (err: unknown) {
          const bulkErr = err as {
            code?: number;
            insertedDocs?: unknown[];
            result?: { insertedCount?: number };
            writeErrors?: Array<{ code?: number }>;
          };
          const writeErrors = Array.isArray(bulkErr.writeErrors) ? bulkErr.writeErrors : [];
          const allDuplicateKeys =
            writeErrors.length > 0 && writeErrors.every((we) => we.code === 11000);

          if (bulkErr.code === 11000 || allDuplicateKeys) {
            const inserted =
              typeof bulkErr.result?.insertedCount === 'number'
                ? bulkErr.result.insertedCount
                : Array.isArray(bulkErr.insertedDocs)
                  ? bulkErr.insertedDocs.length
                  : 0;
            importedCount = inserted;
            skippedCount += Math.max(0, docsToInsert.length - inserted);
          } else {
            throw err;
          }
        }
      }

      const message = `Imported ${importedCount} contact${importedCount === 1 ? '' : 's'}${
        skippedCount > 0 ? `, skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'}` : ''
      }${invalidCount > 0 ? `, ${invalidCount} invalid` : ''}`;

      return NextResponse.json(
        {
          message,
          importedCount,
          skippedCount,
          invalidCount,
        },
        { status: importedCount > 0 ? 201 : 200 }
      );
    }

    // Single-contact creation mode
    if (typeof body.name !== 'string' || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Name and email must be valid strings' },
        { status: 400 }
      );
    }

    const rawName = body.name.trim();
    const rawEmail = body.email.trim().toLowerCase();

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

    if (body.company !== undefined && body.company !== null && typeof body.company !== 'string') {
      return NextResponse.json(
        { error: 'Company must be a string' },
        { status: 400 }
      );
    }
    const company = typeof body.company === 'string' ? body.company.trim() : '';

    const { tags, error: tagsError } = normalizeSingleTags(body.tags);
    if (tagsError) {
      return NextResponse.json({ error: tagsError }, { status: 400 });
    }

    // Validate optional status if provided
    let status: ContactStatus = 'active';
    if (body.status !== undefined && body.status !== null) {
      if (typeof body.status !== 'string') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      const trimmedStatus = body.status.trim().toLowerCase();
      if (trimmedStatus) {
        if (!ALLOWED_STATUSES.has(trimmedStatus)) {
          return NextResponse.json(
            { error: 'Status must be active, unsubscribed, or bounced' },
            { status: 400 }
          );
        }
        status = trimmedStatus as ContactStatus;
      }
    }

    // Check if contact with this email already exists for this user
    const existingContact = await Contact.findOne({
      userId: user.id,
      email: rawEmail,
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      );
    }

    // Create new contact
    const contact = await Contact.create({
      userId: user.id,
      name: rawName,
      email: rawEmail,
      company,
      tags,
      status,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating contact:', error);

    // Handle duplicate key error specifically
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk tag contacts owned by the current user
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `contacts-write:user:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const { body, error: parseError } = await parseJsonObjectBody(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { validIds, error: idsError } = validateObjectIds(body.ids);
    if (idsError) {
      return NextResponse.json({ error: idsError }, { status: 400 });
    }

    const cleanTag = typeof body.addTag === 'string' ? body.addTag.trim() : '';
    if (!cleanTag || cleanTag.length > MAX_TAG_LENGTH) {
      return NextResponse.json(
        { error: `addTag must be a non-empty string of at most ${MAX_TAG_LENGTH} characters` },
        { status: 400 }
      );
    }

    const result = await Contact.updateMany(
      { _id: { $in: validIds }, userId: user.id },
      { $addToSet: { tags: cleanTag } }
    );

    const modifiedCount = result.modifiedCount ?? 0;
    return NextResponse.json({
      message: `Added tag "${cleanTag}" to ${modifiedCount} contact${modifiedCount === 1 ? '' : 's'}`,
      modifiedCount,
    });
  } catch (error) {
    console.error('Error updating contacts in bulk:', error);
    return NextResponse.json(
      { error: 'Failed to update contacts' },
      { status: 500 }
    );
  }
}

// DELETE - Bulk delete contacts owned by the current user
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit({
      key: `contacts-write:user:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (limited) return limited;

    const { body, error: parseError } = await parseJsonObjectBody(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || 'Invalid request body' },
        { status: 400 }
      );
    }

    const { validIds, error: idsError } = validateObjectIds(body.ids);
    if (idsError) {
      return NextResponse.json({ error: idsError }, { status: 400 });
    }

    const result = await Contact.deleteMany({
      _id: { $in: validIds },
      userId: user.id,
    });

    const deletedCount = result.deletedCount ?? 0;
    return NextResponse.json({
      message: `Deleted ${deletedCount} contact${deletedCount === 1 ? '' : 's'}`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error deleting contacts in bulk:', error);
    return NextResponse.json(
      { error: 'Failed to delete contacts' },
      { status: 500 }
    );
  }
}

// Import this if you want to use it in other files
export const dynamic = 'force-dynamic';
