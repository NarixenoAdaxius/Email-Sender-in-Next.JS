import mongoose from 'mongoose';
import EmailTemplateModel, { IEmailTemplate } from '@/models/EmailTemplate';
import { absolutizeEmailUrls } from '@/lib/utils';

// Direct image URL for email clients
const logoUrl = 'https://i.imgur.com/P8J3e6Y.png';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  css?: string;
  customCss?: string;
  designMode?: string;
  variables: string[];
  defaultValues?: Record<string, string>;
  predefined?: boolean;
  isPublic?: boolean;
  isOwner?: boolean;
  userId?: string;
  createdAt?: string;
  _id?: string;
  content?: string;
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome-email',
    name: 'Welcome Email',
    description: 'Send a welcome email to new users',
    subject: 'Welcome to PaletteMail, {{name}}!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Welcome to PaletteMail, {{name}}!</h1>
          <p style="margin-bottom: 15px;">Thank you for signing up! We're excited to have you on board.</p>
          <p style="margin-bottom: 15px;">Your account has been successfully created with the email: <strong>{{email}}</strong></p>
          <p style="margin-bottom: 15px;">If you have any questions or need assistance, feel free to reply to this email. Our support team is always here to help.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{loginLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Account</a>
          </div>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>This email was sent by {{senderName}} via PaletteMail</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: ['name', 'email', 'loginLink', 'senderName', 'baseUrl'],
    predefined: true,
  },
  {
    id: 'monthly-newsletter',
    name: 'Monthly Newsletter',
    description: 'Send a monthly newsletter with updates and news',
    subject: '{{month}} Newsletter - Latest Updates From Our Team',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">{{month}} Newsletter</h1>
          <p style="margin-bottom: 15px;">Hello {{name}},</p>
          <p style="margin-bottom: 15px;">Here are the latest updates from our team:</p>
          
          <div style="margin: 25px 0;">
            {{#each newsItems}}
            <div style="margin-bottom: 20px; border-left: 3px solid #4F46E5; padding-left: 15px;">
              <h3 style="margin-bottom: 10px; color: #4F46E5;">{{this.title}}</h3>
              <p>{{this.content}}</p>
            </div>
            {{/each}}
          </div>
          
          <p style="margin-top: 15px;">Thank you for being a valued member of our community!</p>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>You received this email because you're subscribed to our newsletter.</p>
          <p>To unsubscribe, <a href="{{unsubscribeLink}}" style="color: #4F46E5;">click here</a>.</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: ['month', 'name', 'newsItems', 'unsubscribeLink', 'baseUrl'],
    predefined: true,
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    description: 'Send a password reset link to users',
    subject: 'Reset Your Password - PaletteMail',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
          <p style="margin-bottom: 15px;">Hello {{name}},</p>
          <p style="margin-bottom: 15px;">We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
          <p style="margin-bottom: 15px;">To reset your password, please click the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
          </div>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>This email was sent by {{senderName}} via PaletteMail</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: ['name', 'resetLink', 'senderName', 'baseUrl'],
    predefined: true,
  },
  {
    id: 'interview-invitation',
    name: 'Interview Invitation',
    description: 'Send an interview invitation to candidates',
    subject: 'Interview Invitation - {{position}} Position',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Interview Invitation</h1>
          <p style="margin-bottom: 15px;">Hello {{name}},</p>
          <p style="margin-bottom: 15px;">We're excited to invite you for an interview for the <strong>{{position}}</strong> position at {{company}}.</p>
          <p style="margin-bottom: 15px;">The interview is scheduled for {{interviewDate}} at {{interviewTime}}.</p>
          <p style="margin-bottom: 15px;">Please find the meeting details below:</p>
          <p><strong>Meeting ID:</strong> {{meetingID}}</p>
          <p><strong>Meeting Link:</strong> {{meetingLink}}</p>
          <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{acceptLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
            <a href="{{declineLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px;">Decline Invitation</a>
          </div>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>This email was sent by {{senderName}} via PaletteMail</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: [
      'position',
      'name',
      'company',
      'interviewDate',
      'interviewTime',
      'meetingID',
      'meetingLink',
      'acceptLink',
      'declineLink',
      'senderName',
      'baseUrl',
    ],
    predefined: true,
  },
  {
    id: 'general-notification',
    name: 'General Notification',
    description: 'Send a general notification to users',
    subject: '{{subject}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">{{title}}</h1>
          <p style="margin-bottom: 15px;">Hello {{name}},</p>
          <p style="margin-bottom: 15px;">We're excited to announce that we've made some exciting changes to our service. Here's what's new:</p>
          <p>{{description}}</p>
          <p>We're confident that these changes will make your experience even better.</p>
          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{learnMoreLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Learn More</a>
          </div>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>This email was sent by {{senderName}} via PaletteMail</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: ['subject', 'title', 'name', 'description', 'learnMoreLink', 'senderName', 'baseUrl'],
    predefined: true,
  },
  {
    id: 'security-alert',
    name: 'Security Alert',
    description: 'Send a security alert notification to users',
    subject: 'Security Alert - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Security Alert</h1>
          <p style="margin-bottom: 15px;">Hello {{name}},</p>
          <p style="margin-bottom: 15px;">We've detected unusual activity on your account. We're taking steps to protect your data.</p>
          <p style="margin-bottom: 15px;">If this was not you, please reset your password immediately.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
          </div>
        </div>
        <div style="color: #777; font-size: 14px; text-align: center; margin-top: 30px;">
          <p>This email was sent by {{senderName}} via PaletteMail</p>
          <p>&copy; 2023 PaletteMail. All rights reserved.</p>
        </div>
      </div>
    `,
    variables: ['name', 'resetLink', 'senderName', 'baseUrl'],
    predefined: true,
  },
];

export default emailTemplates;

/**
 * Get all available predefined email templates
 */
export function getTemplates(): EmailTemplate[] {
  return emailTemplates;
}

/**
 * Get a predefined email template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return emailTemplates.find((template) => template.id === id);
}

/**
 * Get a template from database by ID
 */
export async function getTemplateFromDb(id: string): Promise<IEmailTemplate | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  try {
    const template = await EmailTemplateModel.findById(id);
    return template;
  } catch (error) {
    console.error('Error fetching template from database:', error);
    return null;
  }
}

/**
 * Parse a list variable value into an array for {{#each ...}} block rendering.
 * Supports arrays, JSON array strings, or newline-delimited strings ("Title | Content" or plain text).
 */
function parseEachItems(rawValue: unknown): unknown[] {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue !== 'string') {
    return [];
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall back to line-based parsing
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const pipeIndex = line.indexOf('|');
    const colonIndex = line.indexOf(':');
    const splitIndex =
      pipeIndex !== -1 ? pipeIndex : colonIndex > 0 && colonIndex < 60 ? colonIndex : -1;

    if (splitIndex !== -1) {
      const title = line.slice(0, splitIndex).trim();
      const content = line.slice(splitIndex + 1).trim();
      return { title: title || `Update ${index + 1}`, content };
    }

    return {
      title: lines.length === 1 ? 'Latest Update' : `Update ${index + 1}`,
      content: line,
    };
  });
}

const BLOCKED_TEMPLATE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeOwnProperty(
  obj: Record<string, unknown>,
  key: string
): boolean {
  return (
    !BLOCKED_TEMPLATE_KEYS.has(key) &&
    Object.prototype.hasOwnProperty.call(obj, key)
  );
}

function escapeHtmlValue(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isDangerousUriScheme(rawUrl: string): boolean {
  const decoded = rawUrl
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/&colon;/gi, ':')
    .replace(/[\u0000-\u0020\u007F]+/g, '')
    .toLowerCase();

  return (
    decoded.startsWith('javascript:') ||
    decoded.startsWith('vbscript:') ||
    decoded.startsWith('data:')
  );
}

function sanitizeRenderedUrlAttributes(html: string): string {
  return html.replace(
    /\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi,
    (
      fullMatch,
      attrName: string,
      doubleQuoted?: string,
      singleQuoted?: string,
      unquoted?: string
    ) => {
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
      if (!isDangerousUriScheme(value)) {
        return fullMatch;
      }
      const replacement = attrName.toLowerCase() === 'src' ? '' : '#';
      const quote = singleQuoted !== undefined && doubleQuoted === undefined ? "'" : '"';
      return `${attrName}=${quote}${replacement}${quote}`;
    }
  );
}

function renderEachBlock(
  blockBody: string,
  item: unknown,
  shouldEscape: boolean
): string {
  const formatVal = (val: unknown): string => {
    const str = val === undefined || val === null ? '' : String(val);
    return shouldEscape ? escapeHtmlValue(str) : str;
  };

  if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    let rendered = blockBody.replace(
      /\{\{\s*(?:this\.)?([a-zA-Z0-9_]+)\s*\}\}/g,
      (match, prop: string) => {
        if (isSafeOwnProperty(record, prop)) {
          return formatVal(record[prop]);
        }
        return match;
      }
    );
    const fallbackText = formatVal(record.title ?? record.content ?? record.name ?? '');
    rendered = rendered.replace(/\{\{\s*this\s*\}\}/g, () => fallbackText);
    return rendered;
  }

  const scalar = formatVal(item);
  return blockBody
    .replace(/\{\{\s*this\.content\s*\}\}/g, () => scalar)
    .replace(/\{\{\s*this\.title\s*\}\}/g, '')
    .replace(/\{\{\s*this\s*\}\}/g, () => scalar);
}

/**
 * Compile an email template with scalar variables and {{#each ...}}...{{/each}} blocks.
 */
export function compileTemplate(
  templateHtml: string,
  variables: Record<string, unknown>,
  options?: { escapeHtml?: boolean }
): string {
  if (typeof templateHtml !== 'string') {
    return '';
  }

  const shouldEscape = options?.escapeHtml !== false;
  const safeVars: Record<string, unknown> =
    variables && typeof variables === 'object' && !Array.isArray(variables)
      ? variables
      : {};

  let compiledHtml = templateHtml;

  // First process {{#each key}}...{{/each}} blocks
  compiledHtml = compiledHtml.replace(
    /\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_fullMatch, key: string, blockBody: string) => {
      if (!isSafeOwnProperty(safeVars, key)) {
        return '';
      }
      const items = parseEachItems(safeVars[key]);
      if (items.length === 0) {
        return '';
      }
      return items.map((item) => renderEachBlock(blockBody, item, shouldEscape)).join('');
    }
  );

  // Build single-pass scalar lookup table (avoids prototype keys and second-order injection)
  const scalarMap = new Map<string, string>();
  for (const [key, value] of Object.entries(safeVars)) {
    if (!isSafeOwnProperty(safeVars, key)) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const str = String(value);
      scalarMap.set(key, shouldEscape ? escapeHtmlValue(str) : str);
    } else if (value === null || value === undefined) {
      scalarMap.set(key, '');
    }
  }

  if (scalarMap.size > 0) {
    compiledHtml = compiledHtml.replace(
      /\{\{\s*([^{}]+?)\s*\}\}/g,
      (match, rawKey: string) => {
        const key = rawKey.trim();
        if (!BLOCKED_TEMPLATE_KEYS.has(key) && scalarMap.has(key)) {
          return scalarMap.get(key)!;
        }
        return match;
      }
    );
  }

  if (shouldEscape) {
    compiledHtml = sanitizeRenderedUrlAttributes(compiledHtml);
  }

  if (
    isSafeOwnProperty(safeVars, 'baseUrl') &&
    typeof safeVars.baseUrl === 'string' &&
    /^https?:\/\//i.test(safeVars.baseUrl.trim())
  ) {
    compiledHtml = absolutizeEmailUrls(compiledHtml, safeVars.baseUrl.trim());
  }

  return compiledHtml;
}

/**
 * Get template by ID with support for database templates
 */
export async function getTemplateByIdWithDb(id: string): Promise<EmailTemplate | null> {
  const predefinedTemplate = getTemplateById(id);
  if (predefinedTemplate) {
    return predefinedTemplate;
  }

  try {
    const dbTemplate = await getTemplateFromDb(id);
    if (dbTemplate) {
      return {
        id: String(dbTemplate._id),
        name: dbTemplate.name,
        description: dbTemplate.description || '',
        subject: dbTemplate.subject,
        html: dbTemplate.html,
        content: dbTemplate.html,
        css: dbTemplate.css || '',
        customCss: dbTemplate.css || '',
        designMode: dbTemplate.designMode,
        variables: dbTemplate.variables || [],
        defaultValues: {},
        predefined: false,
        isPublic: Boolean(dbTemplate.isPublic),
        userId: dbTemplate.userId ? dbTemplate.userId.toString() : undefined,
      };
    }
  } catch (error) {
    console.error('Error getting template with DB:', error);
  }

  return null;
}
