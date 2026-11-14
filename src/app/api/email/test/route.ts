import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/utils/email';
import { getTemplateById } from '@/lib/email-templates';
import { getUserFromRequest } from '@/lib/auth';
import { getBaseUrl } from '@/lib/utils';
import { getEmailProvider } from '@/lib/email-transport';
import { sanitizeTemplateHtml } from '@/lib/sanitize-html';
import { enforceRateLimit } from '@/lib/rate-limit';

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\.,;:"']{1,64}(?:\.[^\s@<>()[\]\\.,;:"']+)*@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const MAX_EMAIL_LENGTH = 254;
const BLOCKED_VARIABLE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (email.includes(',') || /[\r\n]/.test(email)) return false;
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex > 64) return false;
  return EMAIL_REGEX.test(email);
}

function normalizeVariables(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { senderName: 'PaletteMail Studio' };
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      BLOCKED_VARIABLE_KEYS.has(key) ||
      !Object.prototype.hasOwnProperty.call(raw, key)
    ) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = String(value);
    }
  }
  if (!normalized.senderName?.trim()) {
    normalized.senderName = 'PaletteMail Studio';
  }
  return normalized;
}

/**
 * Test email API route - restricted to authenticated users in non-production environments.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test email endpoint is only available in development mode' },
      { status: 404 }
    );
  }

  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit({
      key: `email:test:${user.id}`,
      limit: 10,
      windowSeconds: 60,
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
      email?: unknown;
      subject?: unknown;
      html?: unknown;
      variables?: unknown;
    };
    const trimmedEmail = typeof body.email === 'string' ? body.email.trim() : '';

    if (!trimmedEmail) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please provide a single valid recipient email address' },
        { status: 400 }
      );
    }

    const provider = getEmailProvider();
    if (provider === 'smtp') {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASSWORD;

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        console.error('SMTP configuration is incomplete', {
          SMTP_HOST: !smtpHost,
          SMTP_PORT: !smtpPort,
          SMTP_USER: !smtpUser,
          SMTP_PASSWORD: !smtpPass,
        });
        return NextResponse.json(
          { error: 'Email service configuration is incomplete' },
          { status: 500 }
        );
      }
    }

    const hasCustomHtml = typeof body.html === 'string' && body.html.trim().length > 0;

    if (hasCustomHtml) {
      const sanitizedHtml = sanitizeTemplateHtml(body.html as string);
      if (!sanitizedHtml.trim()) {
        return NextResponse.json(
          { error: 'Test email HTML contains no valid content after sanitization' },
          { status: 400 }
        );
      }

      const rawSubject =
        typeof body.subject === 'string' && body.subject.trim()
          ? body.subject
          : 'PaletteMail Studio Test Email';
      const resolvedSubject = rawSubject.replace(/[\r\n]+/g, ' ').trim() || 'PaletteMail Studio Test Email';
      const resolvedVariables = normalizeVariables(body.variables);

      const result = await sendTestEmail({
        to: trimmedEmail,
        subject: resolvedSubject,
        html: sanitizedHtml,
        variables: resolvedVariables,
      });

      if (!result.success) {
        console.error('Failed to send studio test email:', result.message);
        return NextResponse.json(
          { error: 'Failed to send test email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        emailInfo: {
          to: trimmedEmail,
          subject: resolvedSubject,
          template: 'studio-custom',
        },
        result,
      });
    }

    const baseUrl = getBaseUrl();
    const welcomeTemplate = getTemplateById('welcome-email');

    if (!welcomeTemplate) {
      return NextResponse.json(
        { error: 'Welcome email template not found' },
        { status: 500 }
      );
    }

    const variables = {
      name: 'Test User',
      email: trimmedEmail,
      loginLink: `${baseUrl}/login`,
      senderName: 'PaletteMail Test',
      baseUrl,
    };

    const result = await sendTestEmail({
      to: trimmedEmail,
      subject: 'PaletteMail Test Email',
      html: welcomeTemplate.html,
      variables,
    });

    if (!result.success) {
      console.error('Failed to send welcome test email:', result.message);
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailInfo: {
        to: trimmedEmail,
        subject: 'PaletteMail Test Email',
        template: welcomeTemplate.id,
      },
      result,
    });
  } catch (error: unknown) {
    console.error('Error sending test email:', error);

    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
