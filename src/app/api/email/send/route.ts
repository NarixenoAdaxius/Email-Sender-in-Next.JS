import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { getUserFromRequest } from '@/lib/auth';
import { sendEmail } from '@/utils/email';
import { getTemplateByIdWithDb } from '@/lib/email-templates';
import { enforceRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\.,;:"']{1,64}(?:\.[^\s@<>()[\]\\.,;:"']+)*@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const MAX_EMAIL_LENGTH = 254;
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex > 64) return false;
  return EMAIL_REGEX.test(email);
}

const sendEmailSchema = z.object({
  templateId: z.string({ required_error: 'Please select a template' }).min(1),
  recipients: z
    .string()
    .min(1, { message: 'At least one recipient is required' })
    .refine(
      (emails) => {
        const emailList = emails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);
        return emailList.length > 0 && emailList.every((email) => isValidEmail(email));
      },
      { message: 'Please enter valid email addresses separated by commas' }
    ),
  variables: z
    .record(
      z.string(),
      z.union([z.string(), z.array(z.unknown())])
    )
    .optional()
    .default({})
    .refine(
      (data) =>
        Object.entries(data).every(([key, value]) => {
          if (BLOCKED_KEYS.has(key)) return true;
          if (key === 'baseUrl') return true;
          if (typeof value === 'string') return value.trim() !== '';
          return Array.isArray(value) && value.length > 0;
        }),
      { message: 'All template variables must be filled out' }
    ),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit({
      key: `email-send:user:${user.id}`,
      limit: 30,
      windowSeconds: 3600,
    });
    if (rateLimited) {
      return rateLimited;
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

    const body = parsedBody as {
      templateId?: string;
      recipients?: string | string[];
      variables?: Record<string, unknown>;
    };

    if (!body.templateId || typeof body.templateId !== 'string') {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const template = await getTemplateByIdWithDb(body.templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Enforce authorization on private database templates
    if (!template.predefined && !template.isPublic && template.userId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this template' },
        { status: 403 }
      );
    }

    const rawVariables =
      body.variables && typeof body.variables === 'object' && !Array.isArray(body.variables)
        ? body.variables
        : {};

    // Check required template variables (baseUrl is supplied automatically if omitted)
    const missingVariables = template.variables.filter((variable) => {
      if (variable === 'baseUrl' || BLOCKED_KEYS.has(variable)) return false;
      const val = Object.prototype.hasOwnProperty.call(rawVariables, variable)
        ? rawVariables[variable]
        : undefined;
      if (typeof val === 'string') return val.trim() === '';
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    });

    if (missingVariables.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required template variables',
          missingVariables,
        },
        { status: 400 }
      );
    }

    const safeInputVariables: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawVariables)) {
      if (!BLOCKED_KEYS.has(k) && Object.prototype.hasOwnProperty.call(rawVariables, k)) {
        safeInputVariables[k] = v;
      }
    }

    const validationResult = sendEmailSchema.safeParse({
      templateId: body.templateId,
      variables: safeInputVariables,
      recipients: Array.isArray(body.recipients)
        ? body.recipients.filter((item): item is string => typeof item === 'string').join(',')
        : body.recipients,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { templateId, recipients: recipientsString, variables } = validationResult.data;
    const recipients = recipientsString
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    const result = await sendEmail({
      userId: user.id,
      templateId,
      variables,
      recipients,
      template,
    });

    if (!result.success) {
      console.error('Email delivery failed:', result.message);
      return NextResponse.json(
        {
          error: 'Failed to send email',
          result: {
            success: false,
            status: result.status,
            emailId: result.emailId,
            succeededCount: result.succeededCount,
            failedCount: result.failedCount,
            skippedCount: result.skippedCount,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...result,
      message: result.message || 'Email sent successfully',
      result,
    });
  } catch (error: unknown) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
