"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Users, X } from 'lucide-react';
import TemplateSelector from '@/components/email/TemplateSelector';
import ContentEditor, { type SendEmailActionResult } from '@/components/email/ContentEditor';
import TemplatePreview from '@/components/email/TemplatePreview';
import { Button } from '@/components/ui/button';
import type { EmailTemplate } from '@/lib/email-templates';
import { requestJson } from '@/components/dashboard/requestJson';

const RETRY_RECIPIENT_KEY = 'palettemail:retryRecipient';
const RETRY_DRAFT_KEY = 'palettemail:retryDraft';
const EMAIL_REGEX =
  /^[^\s@<>()[\]\\,;:"']{1,64}@[^\s@<>()[\]\\.,;:"']+(?:\.[^\s@<>()[\]\\.,;:"']+)+$/;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException || err instanceof Error) &&
    err.name === 'AbortError'
  );
}

interface SendSummaryResult {
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  scheduled?: boolean;
  timestamp: string;
}

function buildDefaultVariables(template: EmailTemplate): Record<string, string> {
  const defaults: Record<string, string> = {};
  (template.variables || []).forEach((v) => {
    defaults[v] = template.defaultValues?.[v] || '';
  });
  return defaults;
}

function parseRecipientTokens(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && isValidEmail(s));
  }
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && isValidEmail(s));
  }
  return [];
}

export default function EmailSender() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const deferredVariables = useDeferredValue(variables);
  const [prefilledVariables, setPrefilledVariables] = useState<Record<string, string> | undefined>(
    undefined
  );
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSendResult, setLastSendResult] = useState<SendSummaryResult | null>(null);
  const templateFetchAbortRef = useRef<AbortController | null>(null);

  // Consume retry prefill from Email History (if present) on mount
  useEffect(() => {
    const controller = new AbortController();
    const collectedRecipients: string[] = [];
    let draftTemplateId: string | undefined;
    let draftVariables: Record<string, string> | undefined;

    try {
      const rawRetryRecipient = localStorage.getItem(RETRY_RECIPIENT_KEY);
      if (rawRetryRecipient) {
        localStorage.removeItem(RETRY_RECIPIENT_KEY);
        try {
          const parsed: unknown = JSON.parse(rawRetryRecipient);
          if (typeof parsed === 'string' || Array.isArray(parsed)) {
            collectedRecipients.push(...parseRecipientTokens(parsed));
          } else if (parsed && typeof parsed === 'object') {
            const record = parsed as Record<string, unknown>;
            collectedRecipients.push(...parseRecipientTokens(record.email));
            collectedRecipients.push(...parseRecipientTokens(record.recipient));
            collectedRecipients.push(...parseRecipientTokens(record.recipients));
            if (typeof record.templateId === 'string' && record.templateId.trim()) {
              draftTemplateId = record.templateId.trim();
            }
          }
        } catch {
          collectedRecipients.push(...parseRecipientTokens(rawRetryRecipient));
        }
      }

      const rawRetryDraft = localStorage.getItem(RETRY_DRAFT_KEY);
      if (rawRetryDraft) {
        localStorage.removeItem(RETRY_DRAFT_KEY);
        try {
          const parsed: unknown = JSON.parse(rawRetryDraft);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const record = parsed as Record<string, unknown>;
            collectedRecipients.push(...parseRecipientTokens(record.email));
            collectedRecipients.push(...parseRecipientTokens(record.recipient));
            collectedRecipients.push(...parseRecipientTokens(record.recipients));
            if (typeof record.templateId === 'string' && record.templateId.trim()) {
              draftTemplateId = record.templateId.trim();
            }
            if (
              record.variables &&
              typeof record.variables === 'object' &&
              !Array.isArray(record.variables)
            ) {
              const nextVars: Record<string, string> = {};
              for (const [key, val] of Object.entries(
                record.variables as Record<string, unknown>
              )) {
                if (typeof val === 'string' && !UNSAFE_OBJECT_KEYS.has(key)) {
                  nextVars[key] = val;
                }
              }
              draftVariables = nextVars;
            }
          }
        } catch {
          // Ignore malformed JSON draft
        }
      }
    } catch {
      // Ignore storage access failures
    }

    const seen = new Set<string>();
    const uniqueRecipients: string[] = [];
    collectedRecipients.forEach((email) => {
      if (!isValidEmail(email)) return;
      const key = email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecipients.push(email);
      }
    });

    if (uniqueRecipients.length > 0) {
      setRecipients((prev) => {
        const prevSeen = new Set(prev.map((r) => r.toLowerCase()));
        const additions = uniqueRecipients.filter((r) => !prevSeen.has(r.toLowerCase()));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
      toast.info(
        uniqueRecipients.length === 1
          ? `Pre-filled recipient ${uniqueRecipients[0]} for retry.`
          : `Pre-filled ${uniqueRecipients.length} recipients for retry.`
      );
    }

    if (draftTemplateId) {
      void (async () => {
        try {
          const data = await requestJson<{ template?: EmailTemplate }>(
            `/api/templates/${encodeURIComponent(draftTemplateId)}`,
            { signal: controller.signal },
            'Failed to load template'
          );
          if (!controller.signal.aborted && data.template) {
            setPrefilledVariables(draftVariables);
            setSelectedTemplate(data.template);
            setVariables({
              ...buildDefaultVariables(data.template),
              ...(draftVariables || {}),
            });
          }
        } catch (err: unknown) {
          if (isAbortError(err) || controller.signal.aborted) return;
          // User can still pick any template; recipients stay pre-filled
        }
      })();
    }

    return () => {
      controller.abort();
      templateFetchAbortRef.current?.abort();
    };
  }, []);

  const handleTemplateSelect = async (template: EmailTemplate) => {
    setError(null);
    setPrefilledVariables(undefined);

    if (!template.html && !template.content && template.id) {
      templateFetchAbortRef.current?.abort();
      const controller = new AbortController();
      templateFetchAbortRef.current = controller;

      try {
        const data = await requestJson<{ template?: EmailTemplate }>(
          `/api/templates/${encodeURIComponent(template.id)}`,
          { signal: controller.signal },
          'Failed to load template'
        );
        if (controller.signal.aborted) return;
        const resolved = data.template || template;
        setSelectedTemplate(resolved);
        setVariables(buildDefaultVariables(resolved));
      } catch (err: unknown) {
        if (isAbortError(err) || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load full template details';
        toast.error(message);
        setSelectedTemplate(template);
        setVariables(buildDefaultVariables(template));
      }
      return;
    }

    setSelectedTemplate(template);
    setVariables(buildDefaultVariables(template));
  };

  const handleVariablesChange = useCallback((newVariables: Record<string, string>) => {
    setVariables((prev) => ({
      ...prev,
      ...newVariables,
    }));
  }, []);

  const handleSendEmail = async (
    templateId: string,
    contentVariables: Record<string, string>,
    sendRecipients: string[]
  ): Promise<SendEmailActionResult> => {
    setError(null);
    setLastSendResult(null);

    try {
      setIsLoading(true);

      const result = await requestJson<{
        status?: string;
        message?: string;
        succeededCount?: number;
        failedCount?: number;
        skippedCount?: number;
        result?: {
          status?: string;
          message?: string;
          succeededCount?: number;
          failedCount?: number;
          skippedCount?: number;
        };
      }>(
        '/api/email/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId,
            variables: contentVariables,
            recipients: sendRecipients,
          }),
        },
        'Failed to send email'
      );

      const delivery = result.result ?? result;
      const succeededCount =
        typeof delivery.succeededCount === 'number'
          ? delivery.succeededCount
          : typeof result.succeededCount === 'number'
            ? result.succeededCount
            : delivery.status === 'failed'
              ? 0
              : sendRecipients.length;
      const failedCount =
        typeof delivery.failedCount === 'number'
          ? delivery.failedCount
          : typeof result.failedCount === 'number'
            ? result.failedCount
            : 0;
      const skippedCount =
        typeof delivery.skippedCount === 'number'
          ? delivery.skippedCount
          : typeof result.skippedCount === 'number'
            ? result.skippedCount
            : 0;

      setLastSendResult({
        succeededCount,
        failedCount,
        skippedCount,
        scheduled: false,
        timestamp: new Date().toISOString(),
      });

      if (succeededCount === 0 && skippedCount > 0) {
        toast.warning('All recipients were skipped (unsubscribed or bounced).');
      } else if (delivery.status === 'partial' || failedCount > 0 || skippedCount > 0) {
        const partialMsg =
          delivery.message ||
          result.message ||
          `Sent to ${succeededCount}, skipped ${skippedCount}, failed ${failedCount}.`;
        toast.warning(partialMsg);
      } else {
        const successMessage =
          delivery.message ||
          result.message ||
          `Email sent successfully to ${succeededCount} recipient${succeededCount === 1 ? '' : 's'}.`;
        toast.success(successMessage);
      }

      setVariables(contentVariables);
      return { succeededCount, failedCount, skippedCount };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const allSkipped =
    lastSendResult !== null &&
    lastSendResult.succeededCount === 0 &&
    lastSendResult.failedCount === 0 &&
    lastSendResult.skippedCount > 0;
  const hasNotices =
    lastSendResult !== null &&
    (lastSendResult.failedCount > 0 || lastSendResult.skippedCount > 0);

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-700 dark:text-red-400"
        >
          <p className="font-semibold">Error sending email</p>
          <p className="mt-1 opacity-90">{error}</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {lastSendResult && (
          <motion.div
            key="post-send-summary"
            role="status"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : { type: 'spring', duration: 0.3, bounce: 0 }
            }
            className={`rounded-xl border p-4 backdrop-blur-xl ${
              allSkipped || hasNotices
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {allSkipped || hasNotices ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {allSkipped
                        ? 'All recipients were skipped (unsubscribed or bounced)'
                        : hasNotices
                          ? 'Email send completed with notices'
                          : lastSendResult.scheduled
                            ? 'Email scheduled successfully'
                            : 'Email delivered'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-background/60 px-2.5 py-0.5 font-medium tabular-nums">
                      Delivered: {lastSendResult.succeededCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-background/60 px-2.5 py-0.5 font-medium tabular-nums">
                      Skipped/Suppressed: {lastSendResult.skippedCount}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-background/60 px-2.5 py-0.5 font-medium tabular-nums">
                      Failed: {lastSendResult.failedCount}
                    </span>
                  </div>

                  {!(
                    lastSendResult.succeededCount === 0 &&
                    lastSendResult.failedCount === 0 &&
                    lastSendResult.skippedCount > 0
                  ) && (
                    <div>
                      <Link
                        href={
                          lastSendResult.scheduled ? '/dashboard/schedule' : '/dashboard/history'
                        }
                        className="inline-flex min-h-11 sm:min-h-8 items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
                      >
                        {lastSendResult.scheduled ? (
                          <>View in Schedule</>
                        ) : (
                          <>View in Email History</>
                        )}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLastSendResult(null)}
                aria-label="Dismiss send summary"
                className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-8 shrink-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedTemplate ? (
          <motion.div
            key="template-selector"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : { type: 'spring', bounce: 0, duration: 0.25 }
            }
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Select a Template
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a built-in or custom template to begin composing.
                </p>
              </div>

              {recipients.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">
                    {recipients.length} pre-filled recipient
                    {recipients.length === 1 ? '' : 's'} ready
                  </span>
                  <button
                    type="button"
                    data-compact="true"
                    onClick={() => setRecipients([])}
                    aria-label="Clear pre-filled recipients"
                    className="relative rounded-full p-0.5 hover:bg-indigo-500/20 after:absolute after:-inset-1.5 after:content-['']"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <TemplateSelector onSelect={handleTemplateSelect} includePredefined={true} />
          </motion.div>
        ) : (
          <motion.div
            key="template-composer"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : { type: 'spring', bounce: 0, duration: 0.25 }
            }
            className="grid gap-8 lg:grid-cols-2"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Customize Email
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setPrefilledVariables(undefined);
                  }}
                  disabled={isLoading}
                  className="min-h-11 sm:min-h-8 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Change Template
                </Button>
              </div>
              <ContentEditor
                template={selectedTemplate}
                onSend={handleSendEmail}
                onVariablesChange={handleVariablesChange}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                initialVariables={prefilledVariables}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Live Preview
              </h3>
              <TemplatePreview template={selectedTemplate} variables={deferredVariables} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
