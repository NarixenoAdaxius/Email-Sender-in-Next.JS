import mongoose from 'mongoose';
import EmailHistory, { EmailHistoryStatus, IEmailFailureDetail } from '@/models/EmailHistory';
import Suppression from '@/models/Suppression';
import { EmailTemplate, compileTemplate, getTemplateByIdWithDb } from '@/lib/email-templates';
import {
  createEmailTransport,
  EmailTransport,
  SendTransportResult,
} from '@/lib/email-transport';
import { buildListUnsubscribeHeaders } from '@/lib/unsubscribe';
import { sanitizeTemplateCss, sanitizeTemplateHtml } from '@/lib/sanitize-html';

const SEND_CONCURRENCY = 5;
const SUPPRESSION_CHUNK_SIZE = 1000;

function sanitizeEmailSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, ' ').trim();
}

function injectTemplateCss(html: string, rawCss?: string): string {
  const safeCss = sanitizeTemplateCss(rawCss);
  if (!safeCss) {
    return html;
  }

  // Avoid duplicating CSS if a <style> block already contains it
  if (/<style\b[^>]*>[\s\S]*?<\/style>/i.test(html) && html.includes(safeCss)) {
    return html;
  }

  const styleTag = `<style>\n${safeCss}\n</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }
  return `${styleTag}\n${html}`;
}

function compileAndSanitizeEmailHtml(
  rawHtml: string,
  variables: Record<string, unknown>,
  rawCss?: string
): string {
  const compiledHtml = compileTemplate(rawHtml, variables);
  const htmlWithCss = injectTemplateCss(compiledHtml, rawCss);
  return sanitizeTemplateHtml(htmlWithCss);
}

export interface SendEmailParams {
  userId: string;
  templateId: string;
  variables: Record<string, unknown>;
  recipients: string[];
  template?: EmailTemplate;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
  emailId?: string;
  status?: EmailHistoryStatus;
  succeededCount?: number;
  failedCount?: number;
  skippedCount?: number;
  skippedRecipients?: string[];
  failedRecipients?: IEmailFailureDetail[];
}

export function partitionSuppressedRecipients(
  recipients: string[],
  suppressedEmails: Iterable<string>
): { deliverableRecipients: string[]; skippedRecipients: string[] } {
  const suppressedSet = new Set(
    Array.from(suppressedEmails, (e) => e.trim().toLowerCase())
  );
  const deliverableRecipients: string[] = [];
  const skippedRecipients: string[] = [];

  for (const recipient of recipients) {
    if (suppressedSet.has(recipient.trim().toLowerCase())) {
      skippedRecipients.push(recipient);
    } else {
      deliverableRecipients.push(recipient);
    }
  }

  return { deliverableRecipients, skippedRecipients };
}

/**
 * Send an email using a template with bounded concurrency and log accurate delivery history.
 */
export async function sendEmail({
  userId,
  templateId,
  variables,
  recipients,
  template,
}: SendEmailParams): Promise<SendEmailResult> {
  const normalizedRecipients = Array.from(
    new Set(recipients.map((r) => r.trim().toLowerCase()).filter(Boolean))
  );
  if (normalizedRecipients.length === 0) {
    return {
      success: false,
      message: 'At least one recipient email address is required',
      status: 'failed',
      succeededCount: 0,
      failedCount: 0,
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  const senderHeaderPreview =
    typeof variables.senderName === 'string' && variables.senderName.trim()
      ? variables.senderName.replace(/[\r\n"]/g, ' ').trim()
      : 'PaletteMail';
  const variablesWithBaseUrl: Record<string, unknown> = {
    ...variables,
    senderName: senderHeaderPreview,
    baseUrl,
  };

  // 1. Compile subject and HTML template
  let compiledTemplate: { subject: string; html: string };
  try {
    if (template) {
      const htmlContent = template.html || template.content || '';
      compiledTemplate = {
        html: compileAndSanitizeEmailHtml(
          htmlContent,
          variablesWithBaseUrl,
          template.css ?? template.customCss
        ),
        subject: sanitizeEmailSubject(
          compileTemplate(template.subject, variablesWithBaseUrl, { escapeHtml: false })
        ),
      };
    } else {
      compiledTemplate = await getCompiledTemplate(templateId, variablesWithBaseUrl);
    }
  } catch (templateError: unknown) {
    const message =
      templateError instanceof Error ? templateError.message : 'Unknown template error';
    console.error('Template compilation error:', message);
    await trySaveFailureHistory({
      userId,
      templateId,
      subject: 'Failed Email (Template Error)',
      recipients: normalizedRecipients,
      content: JSON.stringify(variables),
      errorMessage: `Template error: ${message}`,
    });
    return {
      success: false,
      message: `Template error: ${message}`,
      status: 'failed',
      succeededCount: 0,
      failedCount: normalizedRecipients.length,
    };
  }

  const { subject, html } = compiledTemplate;

  // 2. Filter out suppressed recipients for this user
  let deliverableRecipients = normalizedRecipients;
  let skippedRecipients: string[] = [];
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const suppressedDocs: Array<{ email: string }> = [];
      for (let i = 0; i < normalizedRecipients.length; i += SUPPRESSION_CHUNK_SIZE) {
        const chunk = normalizedRecipients.slice(i, i + SUPPRESSION_CHUNK_SIZE);
        const chunkDocs = await Suppression.find({
          userId: userObjectId,
          email: { $in: chunk },
        })
          .select('email')
          .lean<{ email: string }[]>();
        suppressedDocs.push(...chunkDocs);
      }

      const partitioned = partitionSuppressedRecipients(
        normalizedRecipients,
        suppressedDocs.map((d) => d.email)
      );
      deliverableRecipients = partitioned.deliverableRecipients;
      skippedRecipients = partitioned.skippedRecipients;
    } catch (suppressionErr) {
      console.warn('Failed to query suppressions (continuing):', suppressionErr);
    }
  }

  if (deliverableRecipients.length === 0) {
    return {
      success: true,
      message: `Skipped ${skippedRecipients.length} suppressed recipient${skippedRecipients.length === 1 ? '' : 's'}`,
      status: 'success',
      succeededCount: 0,
      failedCount: 0,
      skippedCount: skippedRecipients.length,
      skippedRecipients,
    };
  }

  // 3. Create email transport before attempting delivery
  let transport: EmailTransport;
  try {
    transport = createEmailTransport();
  } catch (transportError: unknown) {
    const message =
      transportError instanceof Error
        ? transportError.message
        : 'Unknown email transport configuration error';
    console.error('Email transport creation error:', message);
    await trySaveFailureHistory({
      userId,
      templateId,
      subject,
      recipients: deliverableRecipients,
      content: html,
      errorMessage: `Email transport configuration error: ${message}`,
    });
    return {
      success: false,
      message: `Email transport configuration error: ${message}`,
      status: 'failed',
      succeededCount: 0,
      failedCount: deliverableRecipients.length,
      skippedCount: skippedRecipients.length,
      ...(skippedRecipients.length > 0 ? { skippedRecipients } : {}),
    };
  }

  const fromAddress = transport.getFromAddress(variablesWithBaseUrl.senderName);

  // 4. Deliver emails with bounded concurrency
  const settledResults: PromiseSettledResult<SendTransportResult>[] = new Array(
    deliverableRecipients.length
  );
  const workerCount = Math.min(SEND_CONCURRENCY, deliverableRecipients.length);
  let cursor = 0;

  async function deliveryWorker() {
    while (cursor < deliverableRecipients.length) {
      const idx = cursor++;
      const recipient = deliverableRecipients[idx];
      try {
        const headers = buildListUnsubscribeHeaders({
          baseUrl,
          email: recipient,
          userId,
          mailto: process.env.SMTP_USER,
        });
        const info = await transport.send({
          from: fromAddress,
          to: recipient,
          subject,
          html,
          headers,
        });
        settledResults[idx] = { status: 'fulfilled', value: info };
      } catch (err) {
        settledResults[idx] = { status: 'rejected', reason: err };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => deliveryWorker()));

  // 5. Compute exact delivery outcome
  const succeededRecipients: string[] = [];
  const failedRecipients: IEmailFailureDetail[] = [];
  const messageIds: string[] = [];

  settledResults.forEach((result, idx) => {
    const recipient = deliverableRecipients[idx];
    if (result.status === 'fulfilled') {
      succeededRecipients.push(recipient);
      if (result.value.messageId) {
        messageIds.push(result.value.messageId);
      }
    } else {
      const errMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason || 'Delivery failed');
      failedRecipients.push({ recipient, error: errMessage });
    }
  });

  const status: EmailHistoryStatus =
    failedRecipients.length === 0
      ? 'success'
      : succeededRecipients.length > 0
        ? 'partial'
        : 'failed';

  const errorMessage =
    failedRecipients.length > 0
      ? failedRecipients.map((item) => `${item.recipient}: ${item.error}`).join('; ')
      : undefined;

  // 6. Persist a single accurate EmailHistory record after delivery completes
  let historyId: mongoose.Types.ObjectId | undefined;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    try {
      historyId = await saveEmailHistory({
        userId: new mongoose.Types.ObjectId(userId),
        templateId,
        subject,
        recipients: deliverableRecipients,
        content: html,
        status,
        errorMessage,
        succeededCount: succeededRecipients.length,
        failedCount: failedRecipients.length,
        failedRecipients,
        ...(messageIds.length > 0 ? { messageIds } : {}),
      });
    } catch (historyErr) {
      console.warn('Failed to persist email history record:', historyErr);
    }
  }

  const skippedSuffix =
    skippedRecipients.length > 0 ? ` (${skippedRecipients.length} suppressed skipped)` : '';

  if (status === 'failed') {
    return {
      success: false,
      message: `Failed to send email: ${errorMessage || 'Delivery failed'}${skippedSuffix}`,
      emailId: historyId?.toString(),
      status,
      succeededCount: 0,
      failedCount: failedRecipients.length,
      skippedCount: skippedRecipients.length,
      ...(skippedRecipients.length > 0 ? { skippedRecipients } : {}),
      failedRecipients,
    };
  }

  if (status === 'partial') {
    return {
      success: true,
      message: `Email sent to ${succeededRecipients.length} of ${deliverableRecipients.length} recipients (${failedRecipients.length} failed)${skippedSuffix}`,
      emailId: historyId?.toString(),
      status,
      succeededCount: succeededRecipients.length,
      failedCount: failedRecipients.length,
      skippedCount: skippedRecipients.length,
      ...(skippedRecipients.length > 0 ? { skippedRecipients } : {}),
      failedRecipients,
    };
  }

  return {
    success: true,
    message: `Email sent to ${succeededRecipients.length} recipient${succeededRecipients.length === 1 ? '' : 's'}${skippedSuffix}`,
    emailId: historyId?.toString(),
    status,
    succeededCount: succeededRecipients.length,
    failedCount: 0,
    skippedCount: skippedRecipients.length,
    ...(skippedRecipients.length > 0 ? { skippedRecipients } : {}),
  };
}

/**
 * Simplified email sending function for testing and direct usage.
 * Does not require a userId and does not save to history.
 */
export async function sendTestEmail({
  to,
  subject,
  html,
  variables = {},
}: {
  to: string | string[];
  subject: string;
  html: string;
  variables?: Record<string, string>;
}): Promise<{ success: boolean; message: string }> {
  try {
    const recipients = Array.from(
      new Set(
        (Array.isArray(to) ? to : [to])
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean)
      )
    );
    if (recipients.length === 0) {
      return {
        success: false,
        message: 'At least one recipient email address is required',
      };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';
    const transport = createEmailTransport();
    const displayName =
      typeof variables?.senderName === 'string' && variables.senderName.trim()
        ? variables.senderName.replace(/[\r\n"]/g, ' ').trim()
        : 'PaletteMail';
    const fromAddress = transport.getFromAddress(displayName);
    const allVariables = { ...variables, senderName: displayName, baseUrl };

    const compiledHtml = sanitizeTemplateHtml(compileTemplate(html, allVariables));
    const compiledSubject = sanitizeEmailSubject(
      compileTemplate(subject, allVariables, { escapeHtml: false })
    );

    const info = await transport.send({
      from: fromAddress,
      to: recipients.join(', '),
      subject: compiledSubject,
      html: compiledHtml,
    });

    return {
      success: true,
      message: `Email sent: ${info.messageId || 'ok'}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    console.error('Test email sending error:', message);

    return {
      success: false,
      message: `Failed to send email: ${message}`,
    };
  }
}

/**
 * Get a compiled template with variables replaced
 */
async function getCompiledTemplate(
  templateId: string,
  variables: Record<string, unknown>
): Promise<{ subject: string; html: string }> {
  const template = await getTemplateByIdWithDb(templateId);

  if (!template) {
    throw new Error(`Template with ID ${templateId} not found`);
  }

  const html = compileAndSanitizeEmailHtml(
    template.html || template.content || '',
    variables,
    template.css ?? template.customCss
  );
  const subject = sanitizeEmailSubject(
    compileTemplate(template.subject, variables, { escapeHtml: false })
  );

  return { subject, html };
}

async function trySaveFailureHistory(params: {
  userId: string;
  templateId: string;
  subject: string;
  recipients: string[];
  content: string;
  errorMessage: string;
}): Promise<void> {
  if (!params.userId || !mongoose.Types.ObjectId.isValid(params.userId)) {
    return;
  }

  try {
    await saveEmailHistory({
      userId: new mongoose.Types.ObjectId(params.userId),
      templateId: params.templateId,
      subject: params.subject,
      recipients: params.recipients,
      content: params.content,
      status: 'failed',
      errorMessage: params.errorMessage,
      succeededCount: 0,
      failedCount: params.recipients.length,
    });
  } catch {
    console.warn('Failed to save email history for failed email');
  }
}

/**
 * Save email to history collection
 */
async function saveEmailHistory(emailData: {
  userId: mongoose.Types.ObjectId;
  templateId: string;
  subject: string;
  recipients: string[];
  content: string;
  status: EmailHistoryStatus;
  errorMessage?: string;
  succeededCount?: number;
  failedCount?: number;
  failedRecipients?: IEmailFailureDetail[];
  messageIds?: string[];
}): Promise<mongoose.Types.ObjectId> {
  const emailHistory = new EmailHistory({
    ...emailData,
    sentAt: new Date(),
  });

  await emailHistory.save();

  return emailHistory._id;
}
