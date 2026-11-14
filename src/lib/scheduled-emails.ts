import Contact from '@/models/Contact';
import { ScheduledRecipientType } from '@/models/ScheduledEmail';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RecurrencePattern = 'once' | 'daily' | 'weekly' | 'monthly';

export const VALID_RECURRENCES: readonly RecurrencePattern[] = [
  'once',
  'daily',
  'weekly',
  'monthly',
];

export interface ResolveRecipientsInput {
  userId: string;
  recipientGroup?: unknown;
  recipients?: unknown;
  manualRecipients?: unknown;
  recipientType?: unknown;
}

export interface ResolvedRecipientsConfig {
  recipientGroup: string;
  recipients: string[];
  recipientType: ScheduledRecipientType;
  recipientCount: number;
}

export class ScheduledEmailValidationError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ScheduledEmailValidationError';
    this.status = status;
  }
}

function normalizeEmailList(input: unknown): string[] {
  const rawList: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        rawList.push(item);
      }
    }
  } else if (typeof input === 'string') {
    rawList.push(...input.split(','));
  }

  return Array.from(
    new Set(rawList.map((e) => e.trim().toLowerCase()).filter(Boolean))
  );
}

/**
 * Validate and resolve recipient group or individual/manual recipients for a scheduled email.
 */
export async function resolveScheduledRecipientsConfig(
  input: ResolveRecipientsInput
): Promise<ResolvedRecipientsConfig> {
  const trimmedGroup =
    typeof input.recipientGroup === 'string' ? input.recipientGroup.trim() : '';
  const hasGroup = trimmedGroup.length > 0 && trimmedGroup !== 'individual';

  const explicitRecipients = normalizeEmailList(input.recipients);
  const manualRecipients = normalizeEmailList(input.manualRecipients);
  const combinedRecipients = Array.from(
    new Set([...explicitRecipients, ...manualRecipients])
  );

  const requestedType =
    input.recipientType === 'group' ||
    input.recipientType === 'individual' ||
    input.recipientType === 'manual'
      ? input.recipientType
      : undefined;

  if (combinedRecipients.length > 0 && requestedType !== 'group') {
    const invalidEmails = combinedRecipients.filter((email) => !EMAIL_REGEX.test(email));
    if (invalidEmails.length > 0) {
      throw new ScheduledEmailValidationError(
        `Invalid recipient email address(es): ${invalidEmails.join(', ')}`
      );
    }

    const derivedType: ScheduledRecipientType =
      requestedType === 'manual' || manualRecipients.length > 0
        ? 'manual'
        : 'individual';

    return {
      recipientGroup: hasGroup ? trimmedGroup : 'individual',
      recipients: combinedRecipients,
      recipientType: derivedType,
      recipientCount: combinedRecipients.length,
    };
  }

  if (!hasGroup) {
    throw new ScheduledEmailValidationError(
      'Please provide either a recipientGroup or at least one recipient email'
    );
  }

  const contactQuery: Record<string, unknown> = { userId: input.userId };
  if (trimmedGroup !== 'all') {
    contactQuery.tags = { $in: [trimmedGroup] };
  }

  const recipientCount = await Contact.countDocuments(contactQuery);
  if (recipientCount === 0) {
    throw new ScheduledEmailValidationError(
      'No recipients found in the selected group'
    );
  }

  return {
    recipientGroup: trimmedGroup,
    recipients: [],
    recipientType: 'group',
    recipientCount,
  };
}

/**
 * Resolve concrete delivery email addresses at send time for a scheduled email.
 */
export async function resolveDeliveryRecipients(params: {
  userId: string;
  recipientGroup?: string;
  recipients?: string[];
}): Promise<string[]> {
  if (Array.isArray(params.recipients) && params.recipients.length > 0) {
    return Array.from(
      new Set(params.recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))
    );
  }

  const contactQuery: Record<string, unknown> = { userId: params.userId };
  const group = params.recipientGroup?.trim();
  if (group && group !== 'all' && group !== 'individual') {
    contactQuery.tags = { $in: [group] };
  }

  const contacts = await Contact.find(contactQuery)
    .select('email')
    .lean<Array<{ email?: string }>>();

  return Array.from(
    new Set(
      contacts
        .map((contact) => (typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : ''))
        .filter(Boolean)
    )
  );
}

/**
 * Compute the next send timestamp for recurring schedules, advancing past `now`.
 */
export function computeNextSendDate(
  baseDate: Date,
  recurrence: RecurrencePattern,
  now: Date = new Date(),
  anchorDayOverride?: number
): Date | undefined {
  if (recurrence === 'once' || Number.isNaN(baseDate.getTime())) {
    return undefined;
  }

  const anchorDay =
    typeof anchorDayOverride === 'number' && anchorDayOverride >= 1 && anchorDayOverride <= 31
      ? anchorDayOverride
      : baseDate.getUTCDate();
  const next = new Date(baseDate.getTime());
  const addInterval = (date: Date) => {
    if (recurrence === 'daily') {
      date.setUTCDate(date.getUTCDate() + 1);
    } else if (recurrence === 'weekly') {
      date.setUTCDate(date.getUTCDate() + 7);
    } else if (recurrence === 'monthly') {
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + 1);
      const maxDayInMonth = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
      ).getUTCDate();
      date.setUTCDate(Math.min(anchorDay, maxDayInMonth));
    }
  };

  addInterval(next);
  let safetyCounter = 0;
  while (next.getTime() <= now.getTime() && safetyCounter < 1000) {
    addInterval(next);
    safetyCounter++;
  }

  return next;
}
