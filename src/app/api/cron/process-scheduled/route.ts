import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import User from '@/models/User';
import AppNotification from '@/models/AppNotification';
import { getTemplateByIdWithDb } from '@/lib/email-templates';
import { sendEmail } from '@/utils/email';
import {
  RecurrencePattern,
  computeNextSendDate,
  resolveDeliveryRecipients,
} from '@/lib/scheduled-emails';

const BATCH_LIMIT = 25;
const STALE_PROCESSING_MS = 15 * 60 * 1000;

async function authorizeCronRequest(request: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${cronSecret}`;
  if (!authHeader) {
    return false;
  }

  const actualBuf = Buffer.from(authHeader, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

async function emitFailureNotification(
  userId: unknown,
  scheduledEmailId: unknown,
  subject: string,
  reason: string
) {
  try {
    await AppNotification.create({
      userId,
      type: 'emailBounced',
      title: 'Scheduled Email Failed',
      message: `Your scheduled email "${subject}" failed to send: ${reason}`,
      isRead: false,
      data: { scheduledEmailId },
    });
  } catch (notifyErr) {
    console.warn('Failed to create failure notification:', notifyErr);
  }
}

async function processDueScheduledEmails(request: NextRequest) {
  try {
    const authorized = await authorizeCronRequest(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_PROCESSING_MS);
    const dueEmails = await ScheduledEmail.find({
      $or: [
        {
          status: 'scheduled',
          $or: [
            { nextSendDate: { $lte: now } },
            { nextSendDate: { $exists: false }, scheduledDate: { $lte: now } },
            { nextSendDate: null, scheduledDate: { $lte: now } },
          ],
        },
        {
          status: 'processing',
          updatedAt: { $lte: staleThreshold },
        },
      ],
    })
      .sort({ nextSendDate: 1, scheduledDate: 1 })
      .limit(BATCH_LIMIT)
      .select('_id')
      .lean();

    const results: Array<{
      id: string;
      status: 'sent' | 'rescheduled' | 'failed';
      message: string;
    }> = [];

    let sentCount = 0;
    let failedCount = 0;

    for (const candidate of dueEmails) {
      const scheduled = await ScheduledEmail.findOneAndUpdate(
        {
          _id: candidate._id,
          $or: [
            { status: 'scheduled' },
            { status: 'processing', updatedAt: { $lte: staleThreshold } },
          ],
        },
        { $set: { status: 'processing' } },
        { new: true }
      );

      if (!scheduled) {
        continue;
      }

      const userId = scheduled.userId.toString();

      try {
        const recipients = await resolveDeliveryRecipients({
          userId,
          recipientGroup: scheduled.recipientGroup,
          recipients: scheduled.recipients,
        });

        if (recipients.length === 0) {
          scheduled.status = 'failed';
          scheduled.lastError = 'No recipients resolved at send time';
          await scheduled.save();
          failedCount++;
          results.push({
            id: scheduled._id.toString(),
            status: 'failed',
            message: 'No recipients resolved',
          });
          await emitFailureNotification(
            scheduled.userId,
            scheduled._id,
            scheduled.subject,
            'No recipients resolved at send time'
          );
          continue;
        }

        const templateId = String(scheduled.templateId);
        const template = await getTemplateByIdWithDb(templateId);

        if (!template) {
          const reason = `Template ${templateId} not found`;
          scheduled.status = 'failed';
          scheduled.lastError = reason;
          await scheduled.save();
          failedCount++;
          results.push({
            id: scheduled._id.toString(),
            status: 'failed',
            message: reason,
          });
          await emitFailureNotification(
            scheduled.userId,
            scheduled._id,
            scheduled.subject,
            reason
          );
          continue;
        }

        if (!template.predefined && !template.isPublic && template.userId !== userId) {
          const reason = 'Template access denied for this scheduled email';
          scheduled.status = 'failed';
          scheduled.lastError = reason;
          await scheduled.save();
          failedCount++;
          results.push({
            id: scheduled._id.toString(),
            status: 'failed',
            message: reason,
          });
          await emitFailureNotification(
            scheduled.userId,
            scheduled._id,
            scheduled.subject,
            reason
          );
          continue;
        }

        const owner = await User.findById(userId)
          .select('name email')
          .lean<{ name?: string; email?: string } | null>();

        const defaultTemplateVars: Record<string, string> = {};
        (template.variables || []).forEach((varName) => {
          defaultTemplateVars[varName] = template.defaultValues?.[varName] ?? '';
        });

        const variables: Record<string, unknown> = {
          ...defaultTemplateVars,
          senderName: owner?.name || 'PaletteMail',
          name: 'Subscriber',
          ...(scheduled.variables || {}),
        };

        const sendResult = await sendEmail({
          userId,
          templateId,
          variables,
          recipients,
          template: {
            ...template,
            subject: scheduled.subject,
          },
        });

        if (sendResult.success) {
          scheduled.lastSent = now;
          scheduled.lastError = undefined;
          const recurrence = (scheduled.recurrence || 'once') as RecurrencePattern;
          const baseDate = scheduled.nextSendDate || scheduled.scheduledDate || now;
          const anchorDay = scheduled.anchorDay || baseDate.getUTCDate();
          const nextSendDate = computeNextSendDate(baseDate, recurrence, now, anchorDay);

          if (recurrence === 'once' || !nextSendDate) {
            scheduled.status = 'sent';
            scheduled.nextSendDate = undefined;
            results.push({
              id: scheduled._id.toString(),
              status: 'sent',
              message: sendResult.message,
            });
          } else {
            scheduled.status = 'scheduled';
            scheduled.anchorDay = anchorDay;
            scheduled.nextSendDate = nextSendDate;
            scheduled.scheduledDate = nextSendDate;
            results.push({
              id: scheduled._id.toString(),
              status: 'rescheduled',
              message: `${sendResult.message}; next send at ${nextSendDate.toISOString()}`,
            });
          }

          await scheduled.save();
          sentCount++;

          await AppNotification.create({
            userId: scheduled.userId,
            type: 'emailSent',
            title: 'Scheduled Email Sent',
            message: `Your scheduled email "${scheduled.subject}" was delivered to ${sendResult.succeededCount ?? recipients.length} recipient(s).`,
            isRead: false,
            data: { scheduledEmailId: scheduled._id },
          });
        } else {
          scheduled.status = 'failed';
          scheduled.lastError = sendResult.message;
          await scheduled.save();
          failedCount++;

          results.push({
            id: scheduled._id.toString(),
            status: 'failed',
            message: sendResult.message,
          });

          await emitFailureNotification(
            scheduled.userId,
            scheduled._id,
            scheduled.subject,
            sendResult.message
          );
        }
      } catch (itemError: unknown) {
        const message =
          itemError instanceof Error ? itemError.message : 'Unexpected processing error';
        scheduled.status = 'failed';
        scheduled.lastError = message;
        await scheduled.save();
        failedCount++;
        results.push({
          id: scheduled._id.toString(),
          status: 'failed',
          message,
        });
        await emitFailureNotification(
          scheduled.userId,
          scheduled._id,
          scheduled.subject,
          message
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process scheduled emails';
    console.error('Error processing scheduled emails:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return processDueScheduledEmails(request);
}

export async function POST(request: NextRequest) {
  return processDueScheduledEmails(request);
}

export const dynamic = 'force-dynamic';
