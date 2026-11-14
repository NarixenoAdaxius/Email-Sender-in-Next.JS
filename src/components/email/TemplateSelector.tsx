"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'react-toastify';
import { EmailTemplate } from '@/lib/email-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Globe, Lock, Star } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: EmailTemplate) => void;
  selectedTemplateId?: string;
  includePredefined?: boolean;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException || err instanceof Error) &&
    err.name === 'AbortError'
  );
}

export default function TemplateSelector({
  onSelect,
  selectedTemplateId,
  includePredefined = true,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const listAbortControllerRef = useRef<AbortController | null>(null);
  const selectAbortControllerRef = useRef<AbortController | null>(null);

  const fetchTemplates = useCallback(async () => {
    listAbortControllerRef.current?.abort();
    const controller = new AbortController();
    listAbortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ fields: 'summary' });
      if (!includePredefined) {
        params.set('includeDefault', 'false');
      }
      const url = `/api/templates?${params.toString()}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch templates';
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (!controller.signal.aborted) {
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
      }
    } catch (err: unknown) {
      if (isAbortError(err) || controller.signal.aborted) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      toast.error('Failed to load email templates');
    } finally {
      if (listAbortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [includePredefined]);

  useEffect(() => {
    void fetchTemplates();
    return () => {
      listAbortControllerRef.current?.abort();
      selectAbortControllerRef.current?.abort();
    };
  }, [fetchTemplates]);

  const handleSelectTemplate = async (template: EmailTemplate) => {
    const targetId = template.id || template._id;
    const needsFullFetch =
      Boolean(targetId) &&
      (!template.predefined || (!template.html && !template.content));

    if (needsFullFetch && targetId) {
      selectAbortControllerRef.current?.abort();
      const controller = new AbortController();
      selectAbortControllerRef.current = controller;

      try {
        const response = await fetch(`/api/templates/${encodeURIComponent(targetId)}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!response.ok) {
          onSelect(template);
          return;
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          onSelect(data.template || template);
        }
      } catch (err: unknown) {
        if (isAbortError(err) || controller.signal.aborted) {
          return;
        }
        onSelect(template);
      }
    } else {
      onSelect(template);
    }
  };

  const getTemplateId = (template: EmailTemplate) => template.id || template._id || '';

  const isTemplateSelected = (template: EmailTemplate) => {
    const id = getTemplateId(template);
    return Boolean(selectedTemplateId && selectedTemplateId === id);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-xl border border-border bg-card p-5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={fetchTemplates}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template, index) => {
        const id = getTemplateId(template);
        const selected = isTemplateSelected(template);
        const variables = Array.isArray(template.variables) ? template.variables : [];

        return (
          <motion.div
            key={id || template.name}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.12 }
                : {
                    type: 'spring',
                    bounce: 0,
                    duration: 0.35,
                    delay: Math.min(index * 0.03, 0.2),
                  }
            }
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
            onClick={() => handleSelectTemplate(template)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectTemplate(template);
              }
            }}
            className={`cursor-pointer rounded-xl border p-5 text-left shadow-xs transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
              selected
                ? 'border-[#4F46E5] bg-[#4F46E5]/5 ring-1 ring-[#4F46E5]'
                : 'border-border bg-card hover:border-[#4F46E5]/50 hover:shadow-md'
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {template.name}
              </h3>
              <div className="flex shrink-0 flex-wrap gap-1">
                {template.predefined && (
                  <Badge className="border-[#4F46E5]/20 bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#818CF8]">
                    <Star className="mr-1 h-3 w-3" />
                    Built-in
                  </Badge>
                )}
                {template.isPublic && !template.predefined && (
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <Globe className="mr-1 h-3 w-3" />
                    Public
                  </Badge>
                )}
                {!template.isPublic && !template.predefined && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Lock className="mr-1 h-3 w-3" />
                    Private
                  </Badge>
                )}
                {template.isOwner === false && !template.predefined && (
                  <Badge variant="secondary">Shared</Badge>
                )}
              </div>
            </div>

            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {template.description || template.subject}
            </p>

            {template.createdAt && (
              <div className="mt-3 flex items-center text-xs text-muted-foreground">
                <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                Created: {formatDate(template.createdAt)}
              </div>
            )}

            <div className="mt-4 border-t border-border pt-3">
              <span className="text-xs font-medium text-muted-foreground">Variables</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {variables.length > 0 ? (
                  variables.map((variable) => (
                    <span
                      key={`${id}-${variable}`}
                      className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
                    >
                      {variable}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No variables</span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {templates.length === 0 && (
        <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No templates found. Create your first template to get started.
          </p>
        </div>
      )}
    </div>
  );
}
