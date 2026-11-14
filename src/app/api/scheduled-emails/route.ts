import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import AppNotification from '@/models/AppNotification';
import { getUserFromRequest } from '@/lib/auth';
import { getTemplateByIdWithDb } from '@/lib/email-templates';
import {
  RecurrencePattern,
  ScheduledEmailValidationError,
  VALID_RECURRENCES,
  resolveScheduledRecipientsConfig,
} from '@/lib/scheduled-emails';

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseValidScheduledDate(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoMatch =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      trimmed
    );
  if (!isoMatch) return null;

  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const hour = isoMatch[4] !== undefined ? Number(isoMatch[4]) : 0;
  const minute = isoMatch[5] !== undefined ? Number(isoMatch[5]) : 0;
  const second = isoMatch[6] !== undefined ? Number(isoMatch[6]) : 0;

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// GET - Fetch all scheduled emails for the current user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduledEmails = await ScheduledEmail.find({
      userId: user.id,
    })
      .sort({ scheduledDate: 1 })
      .lean();

    return NextResponse.json({ scheduledEmails });
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled emails' },
      { status: 500 }
    );
  }
}

// POST - Create a new scheduled email
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const data = parsedBody as {
      subject?: unknown;
      recipientGroup?: unknown;
      recipients?: unknown;
      manualRecipients?: unknown;
      recipientType?: unknown;
      scheduledDate?: unknown;
      templateId?: unknown;
      recurrence?: unknown;
      variables?: unknown;
    };

    const subject =
      typeof data.subject === 'string'
        ? data.subject.replace(/[\r\n]+/g, ' ').trim()
        : '';
    const templateId =
      typeof data.templateId === 'string' ? data.templateId.trim() : '';
    const scheduledDateRaw = parseValidScheduledDate(data.scheduledDate);

    if (!subject || !templateId || !scheduledDateRaw) {
      return NextResponse.json(
        { error: 'Subject, valid scheduledDate, and templateId are required' },
        { status: 400 }
      );
    }

    if (scheduledDateRaw.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    const recurrence: RecurrencePattern =
      typeof data.recurrence === 'string' &&
      (VALID_RECURRENCES as readonly string[]).includes(data.recurrence)
        ? (data.recurrence as RecurrencePattern)
        : 'once';

    // Validate template exists and user can access it
    const template = await getTemplateByIdWithDb(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }

    if (!template.predefined && !template.isPublic && template.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this template' },
        { status: 403 }
      );
    }

    const recipientConfig = await resolveScheduledRecipientsConfig({
      userId: user.id,
      recipientGroup: data.recipientGroup,
      recipients: data.recipients,
      manualRecipients: data.manualRecipients,
      recipientType: data.recipientType,
    });

    const sanitizedVariables: Record<string, string> = {};
    if (data.variables && typeof data.variables === 'object' && !Array.isArray(data.variables)) {
      for (const [k, v] of Object.entries(data.variables as Record<string, unknown>)) {
        if (
          !BLOCKED_KEYS.has(k) &&
          Object.prototype.hasOwnProperty.call(data.variables, k) &&
          typeof v === 'string'
        ) {
          sanitizedVariables[k] = v;
        }
      }
    }

    const scheduledEmail = await ScheduledEmail.create({
      userId: user.id,
      subject,
      recipientGroup: recipientConfig.recipientGroup,
      recipients: recipientConfig.recipients,
      recipientType: recipientConfig.recipientType,
      recipientCount: recipientConfig.recipientCount,
      scheduledDate: scheduledDateRaw,
      anchorDay: scheduledDateRaw.getUTCDate(),
      template: template.name,
      templateId: template.id,
      variables: sanitizedVariables,
      recurrence,
      status: 'scheduled',
      nextSendDate: scheduledDateRaw,
    });

    await AppNotification.create({
      userId: user.id,
      type: 'emailSent',
      title: 'Email Scheduled',
      message: `Your email "${subject}" has been scheduled for ${scheduledDateRaw.toLocaleString()}`,
      isRead: false,
      data: {
        scheduledEmailId: scheduledEmail._id,
      },
    });

    return NextResponse.json({ scheduledEmail }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ScheduledEmailValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error creating scheduled email:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled email' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
