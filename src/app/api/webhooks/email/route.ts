import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import EmailHistory from '@/models/EmailHistory';
import { EmailLog } from '@/models/EmailLog';
import Suppression, { SuppressionReason } from '@/models/Suppression';

const SVIX_TOLERANCE_SECONDS = 300;

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyResendSvixSignature(request: NextRequest, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!secret || !svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > SVIX_TOLERANCE_SECONDS) {
    return false;
  }

  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8');

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  const signatures = svixSignature.split(' ').filter(Boolean);
  return signatures.some((sigEntry) => {
    const [version, sigValue] = sigEntry.split(',', 2);
    if (version !== 'v1' || !sigValue) return false;
    return timingSafeEqualStr(sigValue, expectedSig);
  });
}

function verifySharedWebhookSecret(request: NextRequest): boolean {
  const configuredSecret =
    process.env.EMAIL_WEBHOOK_SECRET || process.env.SES_WEBHOOK_SECRET;
  if (!configuredSecret) return false;

  const headerSecret =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-ses-webhook-secret') ||
    '';

  return Boolean(headerSecret) && timingSafeEqualStr(headerSecret, configuredSecret);
}

interface SnsEnvelope {
  Type?: string;
  MessageId?: string;
  TopicArn?: string;
  Subject?: string;
  Message?: string;
  Timestamp?: string;
  Token?: string;
  SubscribeURL?: string;
  Signature?: string;
  SignatureVersion?: string;
  SigningCertURL?: string;
}

function buildSnsStringToSign(msg: SnsEnvelope): string {
  const fields: string[] = [];
  if (msg.Type === 'Notification') {
    fields.push('Message', msg.Message || '');
    fields.push('MessageId', msg.MessageId || '');
    if (msg.Subject) {
      fields.push('Subject', msg.Subject);
    }
    fields.push('Timestamp', msg.Timestamp || '');
    fields.push('TopicArn', msg.TopicArn || '');
    fields.push('Type', msg.Type || '');
  } else {
    fields.push('Message', msg.Message || '');
    fields.push('MessageId', msg.MessageId || '');
    fields.push('SubscribeURL', msg.SubscribeURL || '');
    fields.push('Timestamp', msg.Timestamp || '');
    fields.push('Token', msg.Token || '');
    fields.push('TopicArn', msg.TopicArn || '');
    fields.push('Type', msg.Type || '');
  }
  return `${fields.join('\n')}\n`;
}

async function verifySnsSignature(msg: SnsEnvelope): Promise<boolean> {
  if (!msg.Signature || !msg.SigningCertURL || !msg.Type) {
    return false;
  }

  let certUrl: URL;
  try {
    certUrl = new URL(msg.SigningCertURL);
  } catch {
    return false;
  }

  if (
    certUrl.protocol !== 'https:' ||
    !/^sns\.[a-z0-9-]+\.amazonaws\.com$/i.test(certUrl.hostname)
  ) {
    return false;
  }

  try {
    const certRes = await fetch(certUrl.toString());
    if (!certRes.ok) return false;
    const certPem = await certRes.text();

    const algorithm = msg.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1';
    const verifier = crypto.createVerify(algorithm);
    verifier.update(buildSnsStringToSign(msg), 'utf8');
    return verifier.verify(certPem, msg.Signature, 'base64');
  } catch {
    return false;
  }
}

async function recordSuppressionAndHistory(params: {
  messageId?: string;
  emails: string[];
  eventStatus: 'bounced' | 'complained' | 'delivered';
  suppressionReason?: SuppressionReason;
  source: string;
}) {
  const { messageId, emails, eventStatus, suppressionReason, source } = params;

  let resolvedUserId: unknown = null;

  if (messageId) {
    const [historyDoc, logDoc] = await Promise.all([
      EmailHistory.findOne({ messageIds: messageId }).select('userId').lean<{ userId?: unknown }>(),
      EmailLog.findOne({ messageId }).select('userId').lean<{ userId?: unknown }>(),
    ]);

    resolvedUserId = historyDoc?.userId || logDoc?.userId || null;

    if (eventStatus === 'bounced' || eventStatus === 'complained') {
      await Promise.all([
        EmailHistory.updateMany(
          { messageIds: messageId },
          { $set: { status: eventStatus } }
        ),
        EmailLog.updateMany({ messageId }, { $set: { status: eventStatus } }),
      ]);
    } else if (eventStatus === 'delivered') {
      await EmailLog.updateMany({ messageId }, { $set: { status: 'delivered' } });
    }
  }

  if (suppressionReason && resolvedUserId && emails.length > 0) {
    const uniqueEmails = Array.from(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
    );
    await Promise.all(
      uniqueEmails.map((email) =>
        Suppression.findOneAndUpdate(
          { userId: resolvedUserId, email },
          {
            $set: { reason: suppressionReason, source },
            $setOnInsert: { userId: resolvedUserId, email },
          },
          { upsert: true, new: true }
        )
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const isResendSigned = verifyResendSvixSignature(request, rawBody);
    const isSecretSigned = verifySharedWebhookSecret(request);
    const isSnsEnvelope = typeof parsed.Type === 'string' && typeof parsed.Signature === 'string';
    const isSnsSigned = !isResendSigned && !isSecretSigned && isSnsEnvelope
      ? await verifySnsSignature(parsed as unknown as SnsEnvelope)
      : false;

    if (!isResendSigned && !isSecretSigned && !isSnsSigned) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    await dbConnect();

    // 1. Resend webhook payload
    if (typeof parsed.type === 'string' && parsed.data && typeof parsed.data === 'object') {
      const data = parsed.data as {
        email_id?: string;
        message_id?: string;
        to?: string | string[];
        bounce?: { type?: string };
      };
      const messageId = data.email_id || data.message_id;
      const recipients = Array.isArray(data.to)
        ? data.to
        : typeof data.to === 'string'
          ? [data.to]
          : [];

      if (parsed.type === 'email.bounced') {
        const isTransient = data.bounce?.type?.toLowerCase() === 'transient';
        await recordSuppressionAndHistory({
          messageId,
          emails: recipients,
          eventStatus: 'bounced',
          suppressionReason: isTransient ? undefined : 'bounce',
          source: 'resend-webhook',
        });
      } else if (parsed.type === 'email.complained') {
        await recordSuppressionAndHistory({
          messageId,
          emails: recipients,
          eventStatus: 'complained',
          suppressionReason: 'complaint',
          source: 'resend-webhook',
        });
      } else if (parsed.type === 'email.delivered') {
        await recordSuppressionAndHistory({
          messageId,
          emails: recipients,
          eventStatus: 'delivered',
          source: 'resend-webhook',
        });
      }

      return NextResponse.json({ received: true, provider: 'resend' });
    }

    // 2. AWS SES / SNS payload
    let sesPayload = parsed;
    if (parsed.Type === 'SubscriptionConfirmation') {
      return NextResponse.json({
        received: true,
        provider: 'ses-sns',
        type: 'SubscriptionConfirmation',
      });
    }
    if (parsed.Type === 'Notification' && typeof parsed.Message === 'string') {
      try {
        sesPayload = JSON.parse(parsed.Message) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: 'Invalid SNS Message JSON' }, { status: 400 });
      }
    }

    const notificationType =
      (sesPayload.notificationType as string | undefined) ||
      (sesPayload.eventType as string | undefined);
    const mail = sesPayload.mail as { messageId?: string } | undefined;
    const messageId = mail?.messageId;

    if (notificationType === 'Bounce') {
      const bounce = sesPayload.bounce as {
        bounceType?: string;
        bouncedRecipients?: Array<{ emailAddress?: string }>;
      };
      const isPermanent = !bounce?.bounceType || bounce.bounceType === 'Permanent';
      const emails = (bounce?.bouncedRecipients || [])
        .map((r) => r.emailAddress || '')
        .filter(Boolean);

      await recordSuppressionAndHistory({
        messageId,
        emails,
        eventStatus: 'bounced',
        suppressionReason: isPermanent ? 'bounce' : undefined,
        source: 'ses-webhook',
      });
    } else if (notificationType === 'Complaint') {
      const complaint = sesPayload.complaint as {
        complainedRecipients?: Array<{ emailAddress?: string }>;
      };
      const emails = (complaint?.complainedRecipients || [])
        .map((r) => r.emailAddress || '')
        .filter(Boolean);

      await recordSuppressionAndHistory({
        messageId,
        emails,
        eventStatus: 'complained',
        suppressionReason: 'complaint',
        source: 'ses-webhook',
      });
    } else if (notificationType === 'Delivery') {
      await recordSuppressionAndHistory({
        messageId,
        emails: [],
        eventStatus: 'delivered',
        source: 'ses-webhook',
      });
    }

    return NextResponse.json({ received: true, provider: 'ses' });
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process email webhook' },
      { status: 500 }
    );
  }
}
