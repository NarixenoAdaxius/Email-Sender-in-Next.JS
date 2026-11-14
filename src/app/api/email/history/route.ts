import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import connectDB from '@/lib/db';
import EmailHistory, { IEmailHistory } from '@/models/EmailHistory';
import EmailTemplate from '@/models/EmailTemplate';
import { getTemplates } from '@/lib/email-templates';
import mongoose from 'mongoose';
import { parsePagination, buildPaginationMeta } from '@/lib/pagination';

const ALLOWED_STATUSES = new Set(['all', 'success', 'partial', 'failed']);
const MAX_SEARCH_LENGTH = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseDateParam(value: string | null, endOfDay: boolean): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (month < 1 || month > 12) return null;
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > maxDay) return null;

    const parsed = endOfDay
      ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoDateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(
      trimmed
    );
  if (!isoDateTimeMatch) {
    return null;
  }

  const year = Number(isoDateTimeMatch[1]);
  const month = Number(isoDateTimeMatch[2]);
  const day = Number(isoDateTimeMatch[3]);
  const hour = Number(isoDateTimeMatch[4]);
  const minute = Number(isoDateTimeMatch[5]);
  const second = isoDateTimeMatch[6] !== undefined ? Number(isoDateTimeMatch[6]) : 0;

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().slice(0, MAX_SEARCH_LENGTH);
    const status = (searchParams.get('status') || '').trim();
    const rawFrom = searchParams.get('from');
    const rawTo = searchParams.get('to');

    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    const fromDate = parseDateParam(rawFrom, false);
    if (rawFrom && rawFrom.trim() && !fromDate) {
      return NextResponse.json(
        { error: 'Invalid "from" date parameter' },
        { status: 400 }
      );
    }

    const toDate = parseDateParam(rawTo, true);
    if (rawTo && rawTo.trim() && !toDate) {
      return NextResponse.json(
        { error: 'Invalid "to" date parameter' },
        { status: 400 }
      );
    }

    // Default limit stays 50 for backward compatibility with existing consumers
    const { page, limit, skip } = parsePagination(
      searchParams.get('page'),
      searchParams.get('limit'),
      50,
      100
    );

    const query: mongoose.FilterQuery<IEmailHistory> = {
      userId: new mongoose.Types.ObjectId(user.id),
    };

    if (status && status !== 'all') {
      query.status = status as IEmailHistory['status'];
    }

    if (fromDate || toDate) {
      const sentAtRange: { $gte?: Date; $lte?: Date } = {};
      if (fromDate) sentAtRange.$gte = fromDate;
      if (toDate) sentAtRange.$lte = toDate;
      query.sentAt = sentAtRange;
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { subject: { $regex: safeSearch, $options: 'i' } },
        { recipients: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [total, emails] = await Promise.all([
      EmailHistory.countDocuments(query),
      EmailHistory.find(query)
        .select('_id templateId subject recipients sentAt status errorMessage')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Batch resolve template names in one query (plus predefined templates)
    const predefinedMap = new Map<string, string>(
      getTemplates().map((template) => [template.id, template.name])
    );

    const dbTemplateIds = Array.from(
      new Set(
        emails
          .map((email) => String(email.templateId || ''))
          .filter((id) => id && !predefinedMap.has(id) && mongoose.Types.ObjectId.isValid(id))
      )
    );

    const dbTemplateMap = new Map<string, string>();
    if (dbTemplateIds.length > 0) {
      const dbTemplates = await EmailTemplate.find({
        _id: { $in: dbTemplateIds.map((id) => new mongoose.Types.ObjectId(id)) },
        $or: [{ userId: user.id }, { isPublic: true }],
      })
        .select('_id name')
        .lean();

      dbTemplates.forEach((tpl) => {
        dbTemplateMap.set(String(tpl._id), String(tpl.name));
      });
    }

    const formattedEmails = emails.map((email) => {
      const templateId = String(email.templateId || '');
      const templateName =
        predefinedMap.get(templateId) ??
        dbTemplateMap.get(templateId) ??
        'Unknown Template';

      return {
        id: String(email._id),
        subject: String(email.subject),
        recipients: Array.isArray(email.recipients) ? email.recipients : [],
        recipient:
          Array.isArray(email.recipients) && email.recipients.length > 0
            ? email.recipients[0]
            : '',
        templateId,
        templateName,
        template: templateName,
        sentDate: email.sentAt
          ? new Date(email.sentAt).toISOString()
          : new Date().toISOString(),
        status: String(email.status),
        errorMessage: email.errorMessage ? String(email.errorMessage) : undefined,
      };
    });

    return NextResponse.json({
      emails: formattedEmails,
      pagination: {
        ...buildPaginationMeta(page, limit, total),
        pages: Math.ceil(total / limit), // legacy field
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching email history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email history' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
