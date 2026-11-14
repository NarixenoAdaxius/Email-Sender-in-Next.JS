import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

// GET - Fetch a specific scheduled email
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const scheduledEmail = await ScheduledEmail.findOne({
      _id: id,
      userId: user.id,
    });

    if (!scheduledEmail) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 });
    }

    return NextResponse.json({ scheduledEmail });
  } catch (error) {
    console.error('Error fetching scheduled email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled email' },
      { status: 500 }
    );
  }
}

async function updateScheduledEmailHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
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
      scheduledDate?: unknown;
      recurrence?: unknown;
      recipientGroup?: unknown;
      recipients?: unknown;
      manualRecipients?: unknown;
      recipientType?: unknown;
      templateId?: unknown;
      variables?: unknown;
    };

    const scheduledEmail = await ScheduledEmail.findOne({
      _id: id,
      userId: user.id,
    });

    if (!scheduledEmail) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 });
    }

    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!['cancelled', 'sent', 'failed'].includes(scheduledEmail.status)) {
        return NextResponse.json(
          { error: `Cannot delete a ${scheduledEmail.status} email. Cancel it first.` },
          { status: 400 }
        );
      }
      await ScheduledEmail.deleteOne({ _id: id, userId: user.id });
      return NextResponse.json({ message: 'Scheduled email deleted successfully' });
    }

    if (scheduledEmail.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot update a ${scheduledEmail.status} email` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof data.subject === 'string') {
      const cleanSubject = data.subject.replace(/[\r\n]+/g, ' ').trim();
      if (cleanSubject) {
        updateData.subject = cleanSubject;
      }
    }

    if (data.scheduledDate !== undefined) {
      const parsedDate = parseValidScheduledDate(data.scheduledDate);
      if (!parsedDate) {
        return NextResponse.json(
          { error: 'Invalid scheduledDate format' },
          { status: 400 }
        );
      }
      if (parsedDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: 'Scheduled date must be in the future' },
          { status: 400 }
        );
      }
      updateData.scheduledDate = parsedDate;
      updateData.nextSendDate = parsedDate;
      updateData.anchorDay = parsedDate.getUTCDate();
    }

    if (typeof data.recurrence === 'string') {
      if (!(VALID_RECURRENCES as readonly string[]).includes(data.recurrence)) {
        return NextResponse.json(
          { error: 'Invalid recurrence value' },
          { status: 400 }
        );
      }
      updateData.recurrence = data.recurrence as RecurrencePattern;
    }

    if (typeof data.templateId === 'string' && data.templateId.trim()) {
      const template = await getTemplateByIdWithDb(data.templateId.trim());
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
      updateData.templateId = template.id;
      updateData.template = template.name;
    }

    if (
      data.recipientGroup !== undefined ||
      data.recipients !== undefined ||
      data.manualRecipients !== undefined ||
      data.recipientType !== undefined
    ) {
      const recipientConfig = await resolveScheduledRecipientsConfig({
        userId: user.id,
        recipientGroup: data.recipientGroup,
        recipients: data.recipients,
        manualRecipients: data.manualRecipients,
        recipientType: data.recipientType,
      });

      updateData.recipientGroup = recipientConfig.recipientGroup;
      updateData.recipients = recipientConfig.recipients;
      updateData.recipientType = recipientConfig.recipientType;
      updateData.recipientCount = recipientConfig.recipientCount;
    }

    if (data.variables && typeof data.variables === 'object' && !Array.isArray(data.variables)) {
      const sanitizedVariables: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.variables as Record<string, unknown>)) {
        if (
          !BLOCKED_KEYS.has(k) &&
          Object.prototype.hasOwnProperty.call(data.variables, k) &&
          typeof v === 'string'
        ) {
          sanitizedVariables[k] = v;
        }
      }
      updateData.variables = sanitizedVariables;
    }

    const updatedEmail = await ScheduledEmail.findOneAndUpdate(
      { _id: id, userId: user.id, status: 'scheduled' },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEmail) {
      return NextResponse.json(
        { error: 'Scheduled email could not be updated' },
        { status: 409 }
      );
    }

    await AppNotification.create({
      userId: user.id,
      type: 'emailSent',
      title: 'Email Schedule Updated',
      message: `Your scheduled email "${updatedEmail.subject}" has been updated.`,
      isRead: false,
      data: {
        scheduledEmailId: updatedEmail._id,
      },
    });

    return NextResponse.json({ scheduledEmail: updatedEmail });
  } catch (error: unknown) {
    if (error instanceof ScheduledEmailValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error updating scheduled email:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled email' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateScheduledEmailHandler(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return updateScheduledEmailHandler(request, context);
}

// DELETE - Cancel a scheduled email
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const user = await getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const scheduledEmail = await ScheduledEmail.findOne({
      _id: id,
      userId: user.id,
    });

    if (!scheduledEmail) {
      return NextResponse.json({ error: 'Scheduled email not found' }, { status: 404 });
    }

    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!['cancelled', 'sent', 'failed'].includes(scheduledEmail.status)) {
        return NextResponse.json(
          { error: `Cannot delete a ${scheduledEmail.status} email. Cancel it first.` },
          { status: 400 }
        );
      }
      await ScheduledEmail.deleteOne({ _id: id, userId: user.id });
      return NextResponse.json({ message: 'Scheduled email deleted successfully' });
    }

    if (scheduledEmail.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot cancel a ${scheduledEmail.status} email` },
        { status: 400 }
      );
    }

    const cancelledEmail = await ScheduledEmail.findOneAndUpdate(
      { _id: id, userId: user.id, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!cancelledEmail) {
      return NextResponse.json(
        { error: 'Scheduled email could not be cancelled' },
        { status: 409 }
      );
    }

    await AppNotification.create({
      userId: user.id,
      type: 'emailSent',
      title: 'Email Schedule Cancelled',
      message: `Your scheduled email "${scheduledEmail.subject}" has been cancelled.`,
      isRead: false,
      data: {
        scheduledEmailId: scheduledEmail._id,
      },
    });

    return NextResponse.json({
      message: 'Email schedule cancelled successfully',
      scheduledEmail: cancelledEmail,
    });
  } catch (error) {
    console.error('Error cancelling scheduled email:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled email' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
