"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  CalendarClock,
  Check,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Tag,
  Users,
  X,
} from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { EmailTemplate } from '@/lib/email-templates';
import { absolutizeEmailUrls } from '@/lib/utils';
import { requestJson } from '@/components/dashboard/requestJson';

export interface SendEmailActionResult {
  succeededCount?: number;
  skippedCount?: number;
  failedCount?: number;
}

interface ContentEditorProps {
  template: EmailTemplate;
  onSend: (
    templateId: string,
    variables: Record<string, string>,
    recipients: string[]
  ) => Promise<SendEmailActionResult | void>;
  onVariablesChange?: (variables: Record<string, string>) => void;
  recipients?: string[];
  onRecipientsChange?: (recipients: string[]) => void;
  initialVariables?: Record<string, string>;
  scheduledDate?: string;
}

interface ContactItem {
  _id: string;
  name: string;
  email: string;
  company?: string;
  tags?: string[];
  status?: string;
  suppressed?: boolean;
}

const EMAIL_REGEX =
  /^[^\s@<>()[\]\\,;:"']{1,64}@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EACH_BLOCK_REGEX = /\{\{#each\s+([a-zA-Z0-9_.-]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;
const EACH_PROP_REGEX = /\{\{\s*(this\.)?([a-zA-Z0-9_.-]+)\s*\}\}/g;
const EACH_THIS_REGEX = /\{\{\s*this\s*\}\}/g;
const PLACEHOLDER_REGEX = /\{\{([^{}]+)\}\}/g;

function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVariableLabel(variable: string): string {
  const spaced = variable
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();

  if (!spaced) return variable;

  return spaced
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function stripTrailingQuotedDisplayName(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed.endsWith('"')) return trimmed;
  for (let i = trimmed.length - 2; i >= 0; i--) {
    if (trimmed[i] === '"' && trimmed[i - 1] !== '\\') {
      return trimmed.slice(0, i).trim();
    }
  }
  return trimmed;
}

function extractAddressesBeforeAngleBracket(
  prefix: string,
  hasOuterClosingQuote: boolean
): string[] {
  let candidate = stripTrailingQuotedDisplayName(prefix);
  if (hasOuterClosingQuote && candidate.startsWith('"')) {
    return [];
  }

  let lastQuoteIdx = -1;
  let quoteCount = 0;
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] === '"' && candidate[i - 1] !== '\\') {
      quoteCount++;
      lastQuoteIdx = i;
    }
  }
  if (quoteCount % 2 === 1 && lastQuoteIdx !== -1) {
    candidate = candidate.slice(0, lastQuoteIdx).trim();
  }
  if (!candidate.includes('@')) return [];

  const parts = candidate.split(/\s+/).filter(Boolean);
  let lastAtIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].includes('@')) {
      lastAtIdx = i;
      break;
    }
  }
  return lastAtIdx !== -1 ? parts.slice(0, lastAtIdx + 1) : [];
}

function hasUnclosedQuotesOrBrackets(value: string): boolean {
  let inQuotes = false;
  let bracketDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"' && value[i - 1] !== '\\') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === '<') {
        bracketDepth++;
      } else if (ch === '>' && bracketDepth > 0) {
        bracketDepth--;
      }
    }
  }

  return inQuotes || bracketDepth > 0;
}

function findLastRecipientSplitIndex(value: string): number {
  let inQuotes = false;
  let bracketDepth = 0;
  let lastBoundary = -1;
  let segmentHasAtOrClosedBracket = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '"' && value[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) {
      if (ch === '<') {
        bracketDepth++;
        continue;
      }
      if (ch === '>' && bracketDepth > 0) {
        bracketDepth--;
        if (bracketDepth === 0) {
          segmentHasAtOrClosedBracket = true;
        }
        continue;
      }
      if (bracketDepth === 0) {
        if (ch === '@') {
          segmentHasAtOrClosedBracket = true;
        } else if (ch === ',' || ch === ';' || ch === '\n' || ch === '\r') {
          lastBoundary = i;
          segmentHasAtOrClosedBracket = false;
        } else if (/\s/.test(ch) && segmentHasAtOrClosedBracket) {
          lastBoundary = i;
          segmentHasAtOrClosedBracket = false;
        }
      }
    }
  }

  return lastBoundary;
}

function splitRecipientTokens(raw: string): string[] {
  const input = raw.trim();
  if (!input) return [];

  // Split by top-level delimiters (, ; \r \n) outside quotes and angle brackets.
  const chunks: string[] = [];
  let current = '';
  let inQuotes = false;
  let bracketDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"' && input[i - 1] !== '\\') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (!inQuotes) {
      if (ch === '<') {
        bracketDepth++;
        current += ch;
        continue;
      }
      if (ch === '>' && bracketDepth > 0) {
        bracketDepth--;
        current += ch;
        continue;
      }
      if (bracketDepth === 0 && (ch === ',' || ch === ';' || ch === '\n' || ch === '\r')) {
        if (current.trim()) chunks.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) chunks.push(current.trim());

  // Extract RFC-5322 <address> segments before splitting remaining tokens on whitespace.
  const tokens: string[] = [];
  for (const chunk of chunks) {
    let cursor = 0;
    let foundBracketed = false;

    while (cursor < chunk.length) {
      const openIdx = chunk.indexOf('<', cursor);
      if (openIdx === -1) break;
      const closeIdx = chunk.indexOf('>', openIdx + 1);
      if (closeIdx === -1) break;

      foundBracketed = true;
      const prefix = chunk.slice(cursor, openIdx).trim();
      const inner = chunk.slice(openIdx + 1, closeIdx).trim();
      const hasOuterClosingQuote = chunk[closeIdx + 1] === '"';

      tokens.push(...extractAddressesBeforeAngleBracket(prefix, hasOuterClosingQuote));
      tokens.push(inner || '<>');

      cursor = closeIdx + 1;
      if (hasOuterClosingQuote) {
        cursor++;
      }
    }

    if (!foundBracketed) {
      tokens.push(...chunk.split(/\s+/).filter(Boolean));
    } else {
      const tail = chunk.slice(cursor).trim();
      if (tail && tail !== '"') {
        tokens.push(...tail.split(/\s+/).filter(Boolean));
      }
    }
  }

  return tokens;
}

function mergeUniqueEmails(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((e) => e.toLowerCase()));
  const next = [...existing];
  for (const email of incoming) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      next.push(trimmed);
    }
  }
  return next;
}

function getContactSuppressionReason(contact: ContactItem): string | null {
  const status = typeof contact.status === 'string' ? contact.status.trim().toLowerCase() : '';
  if (status === 'unsubscribed') return 'Unsubscribed';
  if (status === 'bounced') return 'Bounced';
  if (status === 'complained') return 'Complained';
  if (status === 'suppressed' || contact.suppressed) return 'Suppressed';
  return null;
}

function renderEachBlocks(
  text: string,
  allVariables: Map<string, string>,
  shouldEscape: boolean
): string {
  const formatVal = (val: string) => (shouldEscape ? escapeHtml(val) : val);

  return text.replace(EACH_BLOCK_REGEX, (_match, key: string, inner: string) => {
    if (UNSAFE_OBJECT_KEYS.has(key)) {
      return '';
    }

    const rawValue = allVariables.get(key);
    let items: Array<Record<string, string>> = [];

    if (rawValue && rawValue.trim()) {
      try {
        const parsed: unknown = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          items = parsed.map((entry) => {
            if (typeof entry === 'object' && entry !== null) {
              const safeItem: Record<string, string> = Object.create(null);
              for (const [k, v] of Object.entries(entry as Record<string, unknown>)) {
                if (!UNSAFE_OBJECT_KEYS.has(k)) {
                  safeItem[k] = String(v ?? '');
                }
              }
              return safeItem;
            }
            return { title: String(entry), content: String(entry) };
          });
        }
      } catch {
        items = rawValue
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => {
            const pipeIdx = line.indexOf('|');
            const colonIdx = line.indexOf(':');
            const splitIdx =
              pipeIdx !== -1 ? pipeIdx : colonIdx > 0 && colonIdx < 60 ? colonIdx : -1;
            if (splitIdx !== -1) {
              return {
                title: line.slice(0, splitIdx).trim() || `Update ${index + 1}`,
                content: line.slice(splitIdx + 1).trim(),
              };
            }
            return { title: `Update ${index + 1}`, content: line };
          });
      }
    }

    if (items.length === 0) {
      return '';
    }

    return items
      .map((item) =>
        inner
          .replace(
            EACH_PROP_REGEX,
            (match, thisPrefix: string | undefined, prop: string) => {
              if (UNSAFE_OBJECT_KEYS.has(prop)) {
                return '';
              }
              if (Object.prototype.hasOwnProperty.call(item, prop)) {
                return formatVal(item[prop] ?? '');
              }
              if (!thisPrefix && allVariables.has(prop)) {
                return match;
              }
              return '';
            }
          )
          .replace(EACH_THIS_REGEX, () => formatVal(item.content || item.title || ''))
      )
      .join('');
  });
}

function renderTemplateString(
  text: string,
  variables: Record<string, string>,
  templateVariables: string[],
  absolutize = false,
  shouldEscape = true
): string {
  if (!text) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = variables.baseUrl || origin;
  const formatVal = (val: string) => (shouldEscape ? escapeHtml(val) : val);

  const variableMap = new Map<string, string>();
  for (const [key, value] of Object.entries(variables)) {
    if (!UNSAFE_OBJECT_KEYS.has(key) && typeof value === 'string') {
      variableMap.set(key, value);
    }
  }
  variableMap.set('baseUrl', baseUrl);

  const templateVarSet = new Set<string>();
  for (const variable of templateVariables) {
    if (typeof variable === 'string' && !UNSAFE_OBJECT_KEYS.has(variable)) {
      templateVarSet.add(variable);
    }
  }

  let result = renderEachBlocks(text, variableMap, shouldEscape);

  result = result.replace(PLACEHOLDER_REGEX, (fullMatch, rawKey: string) => {
    const key = rawKey.trim();
    if (!key || UNSAFE_OBJECT_KEYS.has(key)) {
      return fullMatch;
    }
    if (variableMap.has(key)) {
      const value = variableMap.get(key) ?? '';
      return value ? formatVal(value) : formatVal(`[${key}]`);
    }
    if (templateVarSet.has(key)) {
      return formatVal(`[${key}]`);
    }
    return fullMatch;
  });

  if (absolutize && baseUrl) {
    result = absolutizeEmailUrls(result, baseUrl);
  }

  return result;
}

export default function ContentEditor({
  template,
  onSend,
  onVariablesChange,
  recipients: recipientsProp,
  onRecipientsChange,
  initialVariables,
  scheduledDate,
}: ContentEditorProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [showBaseUrl, setShowBaseUrl] = useState(false);
  const initialVariablesRef = useRef(initialVariables);
  initialVariablesRef.current = initialVariables;
  const onVariablesChangeRef = useRef(onVariablesChange);
  onVariablesChangeRef.current = onVariablesChange;
  const isConfirmSendingRef = useRef(false);

  // Tokenized recipient state (supports controlled + uncontrolled usage)
  const [internalRecipients, setInternalRecipients] = useState<string[]>(recipientsProp ?? []);
  const isRecipientsControlled = recipientsProp !== undefined;
  const recipients = isRecipientsControlled ? recipientsProp : internalRecipients;

  const [recipientDraft, setRecipientDraft] = useState('');
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Contacts picker modal state
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [hasFetchedContacts, setHasFetchedContacts] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsSearch, setContactsSearch] = useState('');

  // Pre-send confirmation modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmSending, setIsConfirmSending] = useState(false);
  const [pendingSend, setPendingSend] = useState<{
    recipients: string[];
    variables: Record<string, string>;
  } | null>(null);

  const updateRecipients = useCallback(
    (next: string[]) => {
      if (!isRecipientsControlled) {
        setInternalRecipients(next);
      }
      onRecipientsChange?.(next);
      setRecipientError(null);
    },
    [isRecipientsControlled, onRecipientsChange]
  );

  const commitTokens = useCallback(
    (tokens: string[]): string[] => {
      const next = mergeUniqueEmails(recipients, tokens);
      if (next.length !== recipients.length) {
        updateRecipients(next);
      }
      return next;
    },
    [recipients, updateRecipients]
  );

  const removeRecipient = (emailToRemove: string) => {
    const next = recipients.filter((email) => email !== emailToRemove);
    updateRecipients(next);
  };

  const validRecipients = useMemo(
    () => recipients.filter((email) => isValidEmail(email)),
    [recipients]
  );
  const invalidRecipients = useMemo(
    () => recipients.filter((email) => !isValidEmail(email)),
    [recipients]
  );

  const templateVariables = useMemo(
    () => (Array.isArray(template.variables) ? template.variables : []),
    [template.variables]
  );

  const formSchema = useMemo(() => {
    const schemaMap: Record<string, z.ZodTypeAny> = {
      baseUrl: z.string().optional(),
    };

    templateVariables.forEach((variable) => {
      if (variable !== 'baseUrl') {
        const label = formatVariableLabel(variable);
        schemaMap[variable] = z.string().trim().min(1, { message: `${label} is required` });
      }
    });

    return z.object(schemaMap);
  }, [templateVariables]);

  type FormValues = z.infer<typeof formSchema>;

  const createDefaultValues = useCallback(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const defaults: Record<string, string> = {
      baseUrl: origin,
    };

    templateVariables.forEach((variable) => {
      if (variable !== 'baseUrl') {
        defaults[variable] =
          initialVariablesRef.current?.[variable] ?? template.defaultValues?.[variable] ?? '';
      }
    });

    return defaults;
  }, [template.defaultValues, templateVariables]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(),
  });

  useEffect(() => {
    const defaults = createDefaultValues();
    form.reset(defaults);
    onVariablesChangeRef.current?.(defaults);
  }, [template.id, form, createDefaultValues]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!onVariablesChangeRef.current) return;
      const definedVariables = Object.fromEntries(
        Object.entries(value).filter(([, val]) => typeof val === 'string')
      ) as Record<string, string>;

      onVariablesChangeRef.current(definedVariables);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Recipient input handlers
  const handleRecipientInputChange = (value: string) => {
    if (/[\s,;]/.test(value)) {
      if (hasUnclosedQuotesOrBrackets(value)) {
        setRecipientDraft(value);
        if (recipientError) setRecipientError(null);
        return;
      }

      if (/[\s,;]$/.test(value)) {
        if (/\s$/.test(value) && /"\s+$/.test(value)) {
          // User typed a closing quote + space for a quoted display name (e.g. `"Alice Smith" `)
          setRecipientDraft(value);
          if (recipientError) setRecipientError(null);
          return;
        }
        const tokens = splitRecipientTokens(value);
        if (tokens.length > 0) {
          commitTokens(tokens);
        }
        setRecipientDraft('');
      } else {
        const splitIdx = findLastRecipientSplitIndex(value);
        if (splitIdx !== -1) {
          const prefix = value.slice(0, splitIdx);
          const remaining = value.slice(splitIdx + 1).replace(/^[\s,;]+/, '');
          const tokens = splitRecipientTokens(prefix);
          if (tokens.length > 0) {
            commitTokens(tokens);
          }
          setRecipientDraft(remaining);
        } else {
          setRecipientDraft(value);
        }
      }
      return;
    }

    setRecipientDraft(value);
    if (recipientError) setRecipientError(null);
  };

  const handleRecipientPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    if (/[\s,;<>"]/.test(pastedText)) {
      e.preventDefault();
      const combined = `${recipientDraft} ${pastedText}`;
      const tokens = splitRecipientTokens(combined);
      if (tokens.length > 0) {
        commitTokens(tokens);
      }
      setRecipientDraft('');
    }
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (recipientDraft.trim()) {
        commitTokens(splitRecipientTokens(recipientDraft));
        setRecipientDraft('');
      }
      return;
    }

    if (e.key === 'Tab') {
      if (recipientDraft.trim()) {
        commitTokens(splitRecipientTokens(recipientDraft));
        setRecipientDraft('');
      }
      return;
    }

    if (e.key === 'Backspace' && recipientDraft === '' && recipients.length > 0) {
      e.preventDefault();
      updateRecipients(recipients.slice(0, -1));
    }
  };

  const handleRecipientBlur = () => {
    if (recipientDraft.trim()) {
      commitTokens(splitRecipientTokens(recipientDraft));
      setRecipientDraft('');
    }
  };

  // Contacts Picker logic
  const fetchContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    setContactsError(null);
    try {
      const data = await requestJson<{ contacts?: ContactItem[] }>(
        '/api/contacts',
        undefined,
        'Failed to load contacts'
      );
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setHasFetchedContacts(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load contacts';
      setContactsError(message);
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  const handleOpenContactsDialog = () => {
    setIsContactsOpen(true);
    if (!hasFetchedContacts && !isLoadingContacts) {
      void fetchContacts();
    }
  };

  const selectedEmailSet = useMemo(
    () => new Set(recipients.map((email) => email.trim().toLowerCase())),
    [recipients]
  );

  const activeContactsTagGroups = useMemo(() => {
    const tagMap = new Map<string, Set<string>>();

    contacts.forEach((contact) => {
      if (getContactSuppressionReason(contact)) return;
      if (!contact.email || !isValidEmail(contact.email.trim())) return;
      if (!Array.isArray(contact.tags)) return;

      contact.tags.forEach((rawTag) => {
        const tag = rawTag.trim();
        if (!tag) return;
        const existing = tagMap.get(tag) ?? new Set<string>();
        existing.add(contact.email.trim());
        tagMap.set(tag, existing);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, emails]) => ({
        tag,
        emails: Array.from(emails),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const q = contactsSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      const nameMatch = contact.name?.toLowerCase().includes(q);
      const emailMatch = contact.email?.toLowerCase().includes(q);
      const companyMatch = contact.company?.toLowerCase().includes(q);
      const tagMatch =
        Array.isArray(contact.tags) &&
        contact.tags.some((t) => t.toLowerCase().includes(q));
      return Boolean(nameMatch || emailMatch || companyMatch || tagMatch);
    });
  }, [contacts, contactsSearch]);

  const toggleContactEmail = (contact: ContactItem) => {
    if (getContactSuppressionReason(contact)) return;
    const email = contact.email.trim();
    if (!email) return;

    const lower = email.toLowerCase();
    if (selectedEmailSet.has(lower)) {
      updateRecipients(recipients.filter((item) => item.trim().toLowerCase() !== lower));
    } else {
      updateRecipients(mergeUniqueEmails(recipients, [email]));
    }
  };

  const handleAddTagGroup = (tag: string, emails: string[]) => {
    const next = mergeUniqueEmails(recipients, emails);
    const addedCount = next.length - recipients.length;
    updateRecipients(next);

    if (addedCount > 0) {
      toast.success(
        `Added ${addedCount} contact${addedCount === 1 ? '' : 's'} from "${tag}"`
      );
    } else {
      toast.info(`All active contacts in "${tag}" are already selected.`);
    }
  };

  // Pre-send validation and confirmation preview
  const handlePrepareSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let effectiveRecipients = recipients;
    if (recipientDraft.trim()) {
      const tokens = splitRecipientTokens(recipientDraft);
      effectiveRecipients = mergeUniqueEmails(recipients, tokens);
      updateRecipients(effectiveRecipients);
      setRecipientDraft('');
    }

    const effectiveValid = effectiveRecipients.filter((email) => isValidEmail(email));
    const effectiveInvalid = effectiveRecipients.filter((email) => !isValidEmail(email));

    let hasRecipientIssue = false;
    if (effectiveRecipients.length === 0) {
      setRecipientError('At least one recipient is required');
      hasRecipientIssue = true;
    } else if (effectiveInvalid.length > 0) {
      setRecipientError('Please fix or remove invalid email addresses before sending');
      hasRecipientIssue = true;
    } else if (effectiveValid.length === 0) {
      setRecipientError('At least one valid email address is required');
      hasRecipientIssue = true;
    }

    const fieldsValid = await form.trigger();
    if (hasRecipientIssue || !fieldsValid) {
      return;
    }

    const rawValues = form.getValues();
    const cleanedVariables = Object.fromEntries(
      Object.entries(rawValues).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')])
    );

    setPendingSend({
      recipients: effectiveValid,
      variables: cleanedVariables,
    });
    setIsConfirmOpen(true);
  };

  const previewVariables = useMemo(() => {
    if (pendingSend) return pendingSend.variables;
    const vals = form.getValues();
    return Object.fromEntries(
      Object.entries(vals).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')])
    );
  }, [pendingSend, form]);

  const previewSubject = useMemo(
    () =>
      renderTemplateString(
        template.subject || '',
        previewVariables,
        templateVariables,
        false,
        false
      ),
    [template.subject, previewVariables, templateVariables]
  );

  const previewHtml = useMemo(
    () =>
      renderTemplateString(
        template.html || template.content || '',
        previewVariables,
        templateVariables,
        true,
        true
      ),
    [template.html, template.content, previewVariables, templateVariables]
  );

  const handleConfirmSend = async () => {
    if (!pendingSend || isConfirmSendingRef.current) return;
    isConfirmSendingRef.current = true;
    setIsConfirmSending(true);
    try {
      const result = await onSend(
        template.id,
        pendingSend.variables,
        pendingSend.recipients
      );
      setIsConfirmOpen(false);
      setPendingSend(null);

      if ((result?.succeededCount ?? 1) > 0) {
        initialVariablesRef.current = undefined;
        const defaults = createDefaultValues();
        form.reset(defaults);
        onVariablesChangeRef.current?.(defaults);
        updateRecipients([]);
        setRecipientDraft('');
      }
    } catch {
      setIsConfirmOpen(false);
    } finally {
      isConfirmSendingRef.current = false;
      setIsConfirmSending(false);
    }
  };

  const isScheduled = Boolean(scheduledDate && scheduledDate.trim());
  const formattedScheduleDate = useMemo(() => {
    if (!scheduledDate) return '';
    const d = new Date(scheduledDate);
    if (Number.isNaN(d.getTime())) return scheduledDate;
    return d.toLocaleString();
  }, [scheduledDate]);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{template.name}</h2>
        {template.description && (
          <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={handlePrepareSend} className="space-y-4">
          {/* Tokenized Recipients Input */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="recipient-token-input"
                  className="text-sm font-medium leading-none text-foreground"
                >
                  Recipients
                </label>
                {recipients.length > 0 && (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {validRecipients.length} valid
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenContactsDialog}
                className="min-h-11 sm:min-h-8 gap-1.5 rounded-lg text-xs active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Pick from Contacts
              </Button>
            </div>

            <div
              onClick={() => recipientInputRef.current?.focus()}
              className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-background/80 p-2 transition-[border-color,box-shadow] duration-150 focus-within:ring-2 focus-within:ring-ring/50 dark:bg-input/20 ${
                recipientError || invalidRecipients.length > 0
                  ? 'border-destructive focus-within:border-destructive focus-within:ring-destructive/30'
                  : 'border-input focus-within:border-ring'
              }`}
            >
              <AnimatePresence initial={false}>
                {recipients.map((email) => {
                  const isValid = isValidEmail(email);
                  return (
                    <motion.span
                      key={email}
                      layout={!prefersReducedMotion}
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.1 }
                          : { type: 'spring', duration: 0.3, bounce: 0 }
                      }
                      title={isValid ? email : 'Invalid email format'}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                        isValid
                          ? 'border-border bg-muted/80 text-foreground'
                          : 'border-destructive/60 bg-destructive/10 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {!isValid && (
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{email}</span>
                      {!isValid && (
                        <span className="sr-only"> (Invalid email format)</span>
                      )}
                      <button
                        type="button"
                        data-compact="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecipient(email);
                        }}
                        aria-label={`Remove ${email}`}
                        className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isValid
                            ? 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
                            : 'text-red-700 hover:bg-destructive/20 dark:text-red-400'
                        }`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </motion.span>
                  );
                })}
              </AnimatePresence>

              <input
                ref={recipientInputRef}
                id="recipient-token-input"
                type="text"
                inputMode="email"
                autoComplete="off"
                value={recipientDraft}
                onChange={(e) => handleRecipientInputChange(e.target.value)}
                onPaste={handleRecipientPaste}
                onKeyDown={handleRecipientKeyDown}
                onBlur={handleRecipientBlur}
                placeholder={
                  recipients.length === 0
                    ? 'Type or paste emails (comma, space, or semicolon)...'
                    : 'Add another recipient...'
                }
                className="min-w-[180px] flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {invalidRecipients.length > 0 && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-700 dark:text-red-400"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Invalid email format: {invalidRecipients.join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateRecipients(validRecipients)}
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                >
                  Remove invalid
                </button>
              </div>
            )}

            {recipientError && invalidRecipients.length === 0 && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {recipientError}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Separate multiple addresses with commas, semicolons, spaces, or paste a list directly.
            </p>
          </div>

          <div className="border-b border-border pb-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Email Content</h3>
            <p className="text-xs text-muted-foreground">
              Fill in the variables below to customize your email.
            </p>
            <button
              type="button"
              className="mt-1.5 text-xs font-medium text-[#4F46E5] hover:underline dark:text-[#818CF8]"
              onClick={() => setShowBaseUrl(!showBaseUrl)}
            >
              {showBaseUrl ? 'Hide Base URL' : 'Show Base URL (for debugging)'}
            </button>
          </div>

          {showBaseUrl && (
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Used for resolving relative asset URLs in emails.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {templateVariables.map((variable) => {
            if (variable === 'baseUrl') return null;
            const isLongContent = variable.toLowerCase().includes('content');
            const label = formatVariableLabel(variable);

            return (
              <FormField
                key={variable}
                control={form.control}
                name={variable as keyof FormValues}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        {label}
                        {variable === 'senderName' && (
                          <span className="ml-2 text-xs font-normal text-[#4F46E5] dark:text-[#818CF8]">
                            (Also used in the &ldquo;From&rdquo; field)
                          </span>
                        )}
                      </FormLabel>
                      <code className="rounded-md border border-border bg-muted/70 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {`{{${variable}}}`}
                      </code>
                    </div>
                    <FormControl>
                      {isLongContent ? (
                        <Textarea
                          placeholder={`Enter ${label}...`}
                          className="h-24"
                          {...field}
                        />
                      ) : (
                        <Input placeholder={`Enter ${label}...`} {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}

          <Button
            type="submit"
            disabled={isConfirmSending}
            className="min-h-11 sm:min-h-10 w-full bg-[#4F46E5] text-white hover:bg-[#4338CA] active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
          >
            {isScheduled ? (
              <>
                <CalendarClock className="mr-2 h-4 w-4" aria-hidden="true" />
                Schedule Email
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Send Email
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Pick from Contacts / Tags Dialog */}
      <Dialog open={isContactsOpen} onOpenChange={setIsContactsOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col border-border/60 bg-background/85 backdrop-blur-xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pick Recipients from Contacts</DialogTitle>
            <DialogDescription>
              Search contacts individually or add everyone in a tag group. Unsubscribed and bounced contacts are automatically skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-hidden py-1">
            {/* Search & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                  placeholder="Search by name, email, or company..."
                  aria-label="Search contacts"
                  className="min-h-11 sm:min-h-10 pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void fetchContacts()}
                disabled={isLoadingContacts}
                aria-label="Refresh contacts"
                title="Refresh contacts"
                className="min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingContacts ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            </div>

            {/* Tag Group Pills */}
            {activeContactsTagGroups.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Quick add by tag</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeContactsTagGroups.map(({ tag, emails }) => (
                    <motion.button
                      key={tag}
                      type="button"
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                      transition={
                        prefersReducedMotion
                          ? undefined
                          : { type: 'spring', duration: 0.3, bounce: 0 }
                      }
                      onClick={() => handleAddTagGroup(tag, emails)}
                      className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-500/15 dark:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>+ Add all &ldquo;{tag}&rdquo;</span>
                      <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-xs tabular-nums">
                        {emails.length}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact List */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border/70 bg-card/70">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Loading contacts...</span>
                </div>
              ) : contactsError ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-destructive">{contactsError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchContacts()}
                    className="mt-3 min-h-11 sm:min-h-9"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {contacts.length === 0
                    ? 'No contacts found yet. Add contacts from the Contacts page.'
                    : `No contacts match "${contactsSearch}".`}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredContacts.map((contact) => {
                    const suppressionReason = getContactSuppressionReason(contact);
                    const isSuppressed = Boolean(suppressionReason);
                    const isSelected = selectedEmailSet.has(contact.email.trim().toLowerCase());

                    return (
                      <li key={contact._id}>
                        <button
                          type="button"
                          disabled={isSuppressed}
                          onClick={() => toggleContactEmail(contact)}
                          className={`flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                            isSuppressed
                              ? 'cursor-not-allowed opacity-60 bg-muted/30'
                              : isSelected
                                ? 'bg-indigo-500/10'
                                : 'hover:bg-muted/50 cursor-pointer'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSuppressed
                                ? 'border-border bg-muted'
                                : isSelected
                                  ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                                  : 'border-input bg-background'
                            }`}
                          >
                            {isSelected && !isSuppressed && (
                              <Check className="h-3 w-3" />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {contact.name}
                              </span>
                              {contact.company && (
                                <span className="truncate text-xs text-muted-foreground">
                                  · {contact.company}
                                </span>
                              )}
                              {suppressionReason && (
                                <Badge
                                  variant="outline"
                                  className="border-destructive/30 bg-destructive/10 text-red-700 dark:text-red-400"
                                >
                                  {suppressionReason}
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {contact.email}
                            </p>
                          </div>

                          {Array.isArray(contact.tags) && contact.tags.length > 0 && (
                            <div className="hidden shrink-0 flex-wrap gap-1 sm:flex">
                              {contact.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="items-center justify-between gap-2 sm:justify-between">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {validRecipients.length} recipient{validRecipients.length === 1 ? '' : 's'} selected
            </span>
            <Button
              type="button"
              onClick={() => setIsContactsOpen(false)}
              className="min-h-11 sm:min-h-9 bg-[#4F46E5] text-white hover:bg-[#4338CA] active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Send Confirmation AlertDialog */}
      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!isConfirmSending) setIsConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-xl border-border/60 bg-background/85 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isScheduled ? 'Confirm scheduled email?' : 'Ready to send your email?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Review the recipients, subject line, and rendered preview before{' '}
              {isScheduled ? 'scheduling' : 'sending'}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingSend && (
            <div className="space-y-3 text-sm">
              {/* Recipients summary */}
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    Recipients
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {pendingSend.recipients.length}{' '}
                    {pendingSend.recipients.length === 1 ? 'recipient' : 'recipients'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pendingSend.recipients.slice(0, 8).map((email) => (
                    <span
                      key={email}
                      className="inline-flex rounded-full border border-border bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {email}
                    </span>
                  ))}
                  {pendingSend.recipients.length > 8 && (
                    <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                      +{pendingSend.recipients.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              {/* Scheduled time (if applicable) */}
              {isScheduled && (
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-xs">
                  <span className="font-medium text-muted-foreground">Scheduled for</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formattedScheduleDate}
                  </span>
                </div>
              )}

              {/* Resolved Subject */}
              <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                <span className="text-xs font-medium text-muted-foreground">Subject</span>
                <p className="mt-1 font-medium text-foreground">
                  {previewSubject || '(No subject)'}
                </p>
              </div>

              {/* Mini HTML Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Message Preview
                </span>
                <iframe
                  sandbox=""
                  title="Pre-send email preview"
                  srcDoc={previewHtml}
                  className="h-48 w-full rounded-lg border border-border bg-white"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isConfirmSending}
              className="min-h-11 sm:min-h-10 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isConfirmSending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmSend();
              }}
              className="min-h-11 sm:min-h-10 bg-[#4F46E5] text-white hover:bg-[#4338CA] active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
            >
              {isConfirmSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {isScheduled ? 'Scheduling...' : 'Sending...'}
                </>
              ) : isScheduled ? (
                'Confirm Schedule'
              ) : (
                'Confirm & Send Now'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
