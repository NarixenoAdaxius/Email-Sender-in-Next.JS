import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export type EmailProviderName = 'smtp' | 'resend' | 'ses';

export interface SendTransportMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export interface SendTransportResult {
  messageId?: string;
  provider: EmailProviderName;
}

export interface EmailTransport {
  provider: EmailProviderName;
  getFromAddress(senderName?: unknown): string;
  send(message: SendTransportMessage): Promise<SendTransportResult>;
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransporterKey = '';

let cachedSesClient: SESv2Client | null = null;
let cachedSesRegion = '';

export function getEmailProvider(): EmailProviderName {
  const raw = (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
  if (raw === 'resend' || raw === 'ses' || raw === 'smtp') {
    return raw;
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: "${raw}". Expected smtp, resend, or ses.`);
}

export function formatSenderHeader(
  rawName: unknown,
  fromEmail: string
): { displayName: string; from: string } {
  const safeName =
    typeof rawName === 'string' && rawName.trim()
      ? rawName.replace(/[\r\n"]/g, ' ').trim()
      : 'PaletteMail';
  return {
    displayName: safeName,
    from: `"${safeName}" <${fromEmail}>`,
  };
}

function extractBareEmail(address: string): string {
  const match = address.match(/<([^>]+)>/);
  return (match ? match[1] : address).trim();
}

function getSmtpConfig() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return { user, pass, host, port };
}

/**
 * Reuse a module-level pooled Nodemailer transporter per SMTP configuration
 * to avoid leaking open socket pools on every send.
 */
function createSmtpTransport(): EmailTransport {
  const { user, pass, host, port } = getSmtpConfig();

  if (!user || !pass) {
    throw new Error(
      `Email configuration missing. Please set SMTP_USER and SMTP_PASSWORD in your .env file.
    Current values:
    - SMTP_HOST: ${host || 'not set'}
    - SMTP_PORT: ${port || 'not set'}
    - SMTP_USER: ${user ? 'set' : 'not set'}
    - SMTP_PASSWORD: ${pass ? 'set' : 'not set'}`
    );
  }

  const configKey = `${host}:${port}:${user}:${pass}`;
  if (!cachedTransporter || cachedTransporterKey !== configKey) {
    if (cachedTransporter) {
      cachedTransporter.close();
    }

    cachedTransporter =
      host === 'smtp.gmail.com'
        ? nodemailer.createTransport({
            service: 'gmail',
            pool: true,
            maxConnections: 5,
            auth: { user, pass },
          })
        : nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            pool: true,
            maxConnections: 5,
            auth: { user, pass },
          });
    cachedTransporterKey = configKey;
  }

  const transporter = cachedTransporter;

  return {
    provider: 'smtp',
    getFromAddress(senderName?: unknown) {
      return formatSenderHeader(senderName, user).from;
    },
    async send(message: SendTransportMessage): Promise<SendTransportResult> {
      const info = await transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        headers: message.headers,
      });
      return {
        messageId: info.messageId,
        provider: 'smtp',
      };
    },
  };
}

function createResendTransport(): EmailTransport {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmailRaw =
    process.env.RESEND_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!apiKey) {
    throw new Error('Resend configuration missing. Please set RESEND_API_KEY.');
  }
  if (!fromEmailRaw) {
    throw new Error(
      'Resend sender address missing. Please set RESEND_FROM or EMAIL_FROM.'
    );
  }

  const bareFrom = extractBareEmail(fromEmailRaw);

  return {
    provider: 'resend',
    getFromAddress(senderName?: unknown) {
      return formatSenderHeader(senderName, bareFrom).from;
    },
    async send(message: SendTransportMessage): Promise<SendTransportResult> {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          headers: message.headers,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Resend API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = (await response.json()) as { id?: string };
      return {
        messageId: data.id,
        provider: 'resend',
      };
    },
  };
}

function createSesTransport(): EmailTransport {
  const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1';
  const fromEmailRaw =
    process.env.SES_FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER;

  if (!fromEmailRaw) {
    throw new Error(
      'AWS SES sender address missing. Please set SES_FROM_EMAIL or EMAIL_FROM.'
    );
  }

  if (!cachedSesClient || cachedSesRegion !== region) {
    cachedSesClient = new SESv2Client({ region });
    cachedSesRegion = region;
  }

  const client = cachedSesClient;
  const bareFrom = extractBareEmail(fromEmailRaw);

  return {
    provider: 'ses',
    getFromAddress(senderName?: unknown) {
      return formatSenderHeader(senderName, bareFrom).from;
    },
    async send(message: SendTransportMessage): Promise<SendTransportResult> {
      const headers = message.headers
        ? Object.entries(message.headers).map(([Name, Value]) => ({ Name, Value }))
        : undefined;

      const command = new SendEmailCommand({
        FromEmailAddress: message.from,
        Destination: {
          ToAddresses: [message.to],
        },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: message.html, Charset: 'UTF-8' },
            },
            ...(headers && headers.length > 0 ? { Headers: headers } : {}),
          },
        },
      });

      const response = await client.send(command);
      return {
        messageId: response.MessageId,
        provider: 'ses',
      };
    },
  };
}

export function createEmailTransport(
  providerOverride?: EmailProviderName
): EmailTransport {
  const provider = providerOverride ?? getEmailProvider();
  switch (provider) {
    case 'resend':
      return createResendTransport();
    case 'ses':
      return createSesTransport();
    case 'smtp':
    default:
      return createSmtpTransport();
  }
}
