"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'react-toastify';
import {
  ArrowUpDown,
  Copy,
  Eye,
  Globe,
  LayoutTemplate,
  Loader2,
  Lock,
  Monitor,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { absolutizeEmailUrls } from '@/lib/utils';

interface EmailTemplate {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  subject?: string;
  html?: string;
  content?: string;
  css?: string;
  customCss?: string;
  designMode?: string;
  blocks?: unknown;
  theme?: unknown;
  variables?: string[];
  isPublic?: boolean;
  isOwner?: boolean;
  predefined?: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type SortOption = 'newest' | 'oldest' | 'name-asc';
type FilterOption = 'all' | 'private' | 'public' | 'default';

const TEMPLATES_PAGE_SIZE = 12;
const FALLBACK_PREVIEW_HTML =
  '<div style="font-family:sans-serif;padding:24px;color:#888">No preview available</div>';
const ALLOWED_DUPLICATE_DESIGN_MODES = new Set(['studio', 'visual', 'code', 'custom']);

const isDefaultTemplate = (template: EmailTemplate): boolean =>
  Boolean(template.predefined || template.isDefault);

const getTemplateId = (template: EmailTemplate): string =>
  template._id || template.id || '';

const getTemplateKindLabel = (template: EmailTemplate): 'Default' | 'Studio' | 'Custom' => {
  if (isDefaultTemplate(template)) return 'Default';
  const mode = template.designMode?.toLowerCase();
  const html = template.html || template.content || '';
  if (
    mode === 'studio' ||
    mode === 'visual' ||
    (Array.isArray(template.blocks) && template.blocks.length > 0) ||
    html.includes('data-pm-canvas') ||
    html.includes('data-pm-block')
  ) {
    return 'Studio';
  }
  return 'Custom';
};

const parseValidDate = (ts?: string): Date | null => {
  if (!ts) return null;
  const parsed = new Date(ts);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTemplateTimestamp = (template: EmailTemplate): number => {
  const updated = parseValidDate(template.updatedAt);
  if (updated) return updated.getTime();
  const created = parseValidDate(template.createdAt);
  if (created) return created.getTime();
  return 0;
};

const formatTemplateDate = (template: EmailTemplate): string => {
  if (isDefaultTemplate(template)) return 'Built-in';
  const updated = parseValidDate(template.updatedAt);
  if (updated) return `Updated ${updated.toLocaleDateString()}`;
  const created = parseValidDate(template.createdAt);
  if (created) return created.toLocaleDateString();
  return 'Custom';
};

const LazyTemplateThumbnail = memo(function LazyTemplateThumbnail({
  name,
  rawHtml,
  origin,
}: {
  name: string;
  rawHtml: string;
  origin: string;
}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isIntersecting) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsIntersecting(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isIntersecting]);

  const resolvedSrcDoc = useMemo(() => {
    if (!isIntersecting) return '';
    if (!rawHtml.trim()) return FALLBACK_PREVIEW_HTML;
    return origin ? absolutizeEmailUrls(rawHtml, origin) : rawHtml;
  }, [isIntersecting, rawHtml, origin]);

  return (
    <div
      ref={containerRef}
      className="mx-auto mt-2.5 h-[150px] w-[252px] overflow-hidden rounded-t-md border border-border/50 bg-white shadow-xs transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none"
    >
      {isIntersecting ? (
        <iframe
          sandbox=""
          title={`${name} preview`}
          srcDoc={resolvedSrcDoc}
          className="h-[400px] w-[600px] origin-top-left scale-[0.42] pointer-events-none select-none border-0 bg-white"
          loading="lazy"
          tabIndex={-1}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full flex-col gap-2.5 bg-muted/30 p-4"
        >
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-full animate-pulse rounded bg-muted/80" />
          <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted/80" />
          <div className="mt-1 h-16 w-full animate-pulse rounded bg-muted/60" />
        </div>
      )}
    </div>
  );
});

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(() => new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [origin, setOrigin] = useState('');
  const prefersReducedMotion = Boolean(useReducedMotion());

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setVisibleCounts({});
  }, [searchQuery, filterBy, sortBy]);

  const fetchTemplates = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setIsLoading(true);
      }
      setFetchError(null);
      const response = await fetch('/api/templates');

      if (!response.ok) {
        let errorMessage = 'Failed to fetch templates';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load templates';
      if (!options?.silent) {
        setFetchError(message);
      }
      toast.error(message);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const getPreviewSrcDoc = useCallback(
    (template: EmailTemplate | null): string => {
      const rawHtml = template?.html || template?.content || '';
      if (!rawHtml.trim()) return FALLBACK_PREVIEW_HTML;
      return origin ? absolutizeEmailUrls(rawHtml, origin) : rawHtml;
    },
    [origin]
  );

  const openPreview = (template: EmailTemplate) => {
    setPreviewViewport('desktop');
    setPreviewTemplate(template);
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    const targetId = getTemplateId(template);
    if (!targetId || duplicatingIds.has(targetId)) return;

    try {
      setDuplicatingIds((prev) => {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      });

      const getRes = await fetch(`/api/templates/${encodeURIComponent(targetId)}`);
      if (!getRes.ok) {
        let errorMessage = 'Failed to load template details';
        try {
          const errorData = await getRes.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      const getData = await getRes.json();
      const full: EmailTemplate = (getData?.template as EmailTemplate | undefined) || template;

      const resolvedCss =
        typeof full.customCss === 'string' && full.customCss.length > 0
          ? full.customCss
          : typeof full.css === 'string'
            ? full.css
            : '';

      const resolvedHtml =
        full.html || full.content || template.html || template.content || '';

      const resolvedSubject =
        (full.subject || template.subject || '').trim() || full.name || template.name;

      const rawDesignMode =
        typeof (full.designMode ?? template.designMode) === 'string'
          ? String(full.designMode ?? template.designMode).trim().toLowerCase()
          : '';
      const resolvedDesignMode =
        rawDesignMode !== 'default' && ALLOWED_DUPLICATE_DESIGN_MODES.has(rawDesignMode)
          ? rawDesignMode
          : Array.isArray(full.blocks) && full.blocks.length > 0
            ? 'studio'
            : 'custom';

      const postRes = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${full.name || template.name} (Copy)`,
          description: full.description ?? template.description ?? '',
          subject: resolvedSubject,
          html: resolvedHtml,
          blocks: full.blocks ?? null,
          theme: full.theme ?? null,
          css: resolvedCss,
          customCss: resolvedCss,
          designMode: resolvedDesignMode,
          variables: Array.isArray(full.variables) ? full.variables : [],
          isPublic: false,
        }),
      });

      if (!postRes.ok) {
        let errorMessage = 'Failed to duplicate template';
        try {
          const errorData = await postRes.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      await fetchTemplates({ silent: true });
      toast.success('Template duplicated');

      setPreviewTemplate((current) =>
        current && getTemplateId(current) === targetId ? null : current
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error duplicating template');
    } finally {
      setDuplicatingIds((prev) => {
        if (!prev.has(targetId)) return prev;
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    const targetId = getTemplateId(templateToDelete);
    if (!targetId) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/templates/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      toast.success('Template deleted successfully');
      setTemplateToDelete(null);
      if (previewTemplate && getTemplateId(previewTemplate) === targetId) {
        setPreviewTemplate(null);
      }
      await fetchTemplates({ silent: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error deleting template');
    } finally {
      setIsDeleting(false);
    }
  };

  const filterCounts = useMemo(() => {
    let privateCount = 0;
    let publicCount = 0;
    let defaultCount = 0;

    for (const template of templates) {
      if (isDefaultTemplate(template)) {
        defaultCount += 1;
      } else if (template.isPublic) {
        publicCount += 1;
      } else {
        privateCount += 1;
      }
    }

    return {
      all: templates.length,
      private: privateCount,
      public: publicCount,
      default: defaultCount,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matching = templates.filter((template) => {
      if (filterBy === 'default' && !isDefaultTemplate(template)) return false;
      if (filterBy === 'public' && (isDefaultTemplate(template) || !template.isPublic)) {
        return false;
      }
      if (filterBy === 'private' && (isDefaultTemplate(template) || template.isPublic)) {
        return false;
      }

      if (!query) return true;
      return (
        template.name.toLowerCase().includes(query) ||
        (template.description || '').toLowerCase().includes(query) ||
        (template.subject || '').toLowerCase().includes(query)
      );
    });

    return [...matching].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      const timeA = getTemplateTimestamp(a);
      const timeB = getTemplateTimestamp(b);
      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [templates, searchQuery, filterBy, sortBy]);

  const privateTemplates = useMemo(
    () =>
      filteredTemplates.filter(
        (template) => !isDefaultTemplate(template) && !template.isPublic
      ),
    [filteredTemplates]
  );
  const publicTemplates = useMemo(
    () =>
      filteredTemplates.filter(
        (template) => !isDefaultTemplate(template) && Boolean(template.isPublic)
      ),
    [filteredTemplates]
  );
  const defaultTemplates = useMemo(
    () => filteredTemplates.filter((template) => isDefaultTemplate(template)),
    [filteredTemplates]
  );

  const renderTemplateSection = (
    templateList: EmailTemplate[],
    title: string,
    icon: React.ReactNode
  ) => {
    if (templateList.length === 0) return null;
    const visibleCount = visibleCounts[title] ?? TEMPLATES_PAGE_SIZE;

    return (
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2.5">
          {icon}
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {templateList.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templateList.slice(0, visibleCount).map((template, index) => {
            const templateId = getTemplateId(template);
            const variables = Array.isArray(template.variables) ? template.variables : [];
            const isDefault = isDefaultTemplate(template);
            const canEdit = !isDefault && template.isOwner !== false;
            const canDelete = canEdit;
            const isDuplicating = duplicatingIds.has(templateId);
            const kindLabel = getTemplateKindLabel(template);
            const rawHtml = template.html || template.content || '';

            return (
              <motion.article
                key={templateId || `${template.name}-${index}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
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
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-[#4F46E5]/40 hover:shadow-md"
              >
                <div>
                  {/* Live Miniature Visual Thumbnail */}
                  <button
                    type="button"
                    onClick={() => openPreview(template)}
                    aria-label={`Preview ${template.name}`}
                    className="relative block h-40 w-full cursor-pointer overflow-hidden border-b border-border/60 bg-muted/40 text-left transition-transform duration-75 active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4F46E5]"
                  >
                    <LazyTemplateThumbnail
                      name={template.name}
                      rawHtml={rawHtml}
                      origin={origin}
                    />

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/90 via-card/40 to-transparent"
                    />

                    <span className="pointer-events-none absolute bottom-2.5 left-3 inline-flex items-center rounded-full border border-border/70 bg-background/85 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-xs backdrop-blur-md">
                      {kindLabel}
                    </span>

                    <span className="pointer-events-none absolute bottom-2.5 right-3 inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/85 px-2.5 py-0.5 text-xs font-medium text-muted-foreground opacity-0 shadow-xs backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                      <Eye className="h-3 w-3" />
                      Preview
                    </span>
                  </button>

                  <div className="p-5 pb-0">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {template.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1">
                        {isDefault ? (
                          <Badge className="border-[#4F46E5]/20 bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#818CF8]">
                            Default
                          </Badge>
                        ) : template.isPublic ? (
                          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            <Globe className="mr-1 h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Lock className="mr-1 h-3 w-3" />
                            Private
                          </Badge>
                        )}
                        {!isDefault && template.isOwner === false && (
                          <Badge variant="secondary">Shared</Badge>
                        )}
                      </div>
                    </div>

                    {template.subject && (
                      <p className="mb-1.5 truncate font-mono text-xs text-[#4F46E5] dark:text-[#818CF8]">
                        Subject: {template.subject}
                      </p>
                    )}

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.description || 'No description provided.'}
                    </p>

                    {variables.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {variables.slice(0, 4).map((variable) => (
                          <span
                            key={variable}
                            className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-foreground"
                          >
                            {variable}
                          </span>
                        ))}
                        {variables.length > 4 && (
                          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            +{variables.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3.5">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatTemplateDate(template)}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {canEdit && (
                      <Link
                        href={`/dashboard/templates/${templateId}`}
                        aria-label={`Edit ${template.name} in Email Studio`}
                        title="Open in Email Studio"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-[color,border-color,transform] duration-75 hover:border-[#4F46E5]/50 hover:text-[#4F46E5] active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] sm:min-h-8 dark:hover:text-[#818CF8]"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Edit in Studio
                      </Link>
                    )}

                    {!canEdit && (
                      <button
                        type="button"
                        onClick={() => openPreview(template)}
                        aria-label={`Preview ${template.name}`}
                        title="Preview template"
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-[color,border-color,transform] duration-75 hover:border-[#4F46E5]/50 hover:text-foreground active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] sm:min-h-8"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      disabled={!templateId || isDuplicating}
                      aria-busy={isDuplicating}
                      aria-label={`Duplicate ${template.name}`}
                      title="Duplicate template"
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-[color,border-color,transform] duration-75 hover:border-[#4F46E5]/50 hover:text-[#4F46E5] active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] disabled:pointer-events-none disabled:opacity-50 sm:min-h-8 dark:hover:text-[#818CF8]"
                    >
                      {isDuplicating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{isDuplicating ? 'Copying...' : 'Duplicate'}</span>
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setTemplateToDelete(template)}
                        disabled={isDeleting || isDuplicating}
                        aria-label={`Delete ${template.name}`}
                        title="Delete template"
                        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-transparent text-muted-foreground transition-[color,background-color,transform] duration-75 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:pointer-events-none disabled:opacity-50 sm:h-8 sm:min-h-8 sm:w-8 sm:min-w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
        {templateList.length > visibleCount && (
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 motion-reduce:transform-none sm:min-h-9"
              onClick={() =>
                setVisibleCounts((prev) => ({ ...prev, [title]: visibleCount + TEMPLATES_PAGE_SIZE }))
              }
            >
              Load more ({templateList.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </section>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-44 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Email Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, organize, and customize reusable visual or HTML email templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/templates/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white shadow-xs transition-[background-color,transform] duration-75 hover:bg-[#4338CA] active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 sm:min-h-10"
          >
            <Sparkles className="h-4 w-4" />
            New Email Template
          </Link>
        </div>
      </div>

      {templates.length > 0 && !fetchError && (
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <label htmlFor="templates-search" className="sr-only">
              Search templates
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="templates-search"
                name="templateSearch"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name, subject, or description..."
                className="min-h-11 pl-9 sm:min-h-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Filter templates by category"
              className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
            >
              {(
                [
                  { id: 'all', label: 'All', count: filterCounts.all },
                  { id: 'private', label: 'Private', count: filterCounts.private },
                  { id: 'public', label: 'Public', count: filterCounts.public },
                  { id: 'default', label: 'Default', count: filterCounts.default },
                ] as const
              ).map((option) => {
                const active = filterBy === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilterBy(option.id)}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-75 active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] sm:min-h-8 ${
                      active
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger
                aria-label="Sort templates"
                className="min-h-11 w-full active:scale-[0.97] transition-transform duration-75 motion-reduce:transform-none sm:min-h-10 sm:w-44"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="min-h-11 sm:min-h-9">
                  Newest First
                </SelectItem>
                <SelectItem value="oldest" className="min-h-11 sm:min-h-9">
                  Oldest First
                </SelectItem>
                <SelectItem value="name-asc" className="min-h-11 sm:min-h-9">
                  Name (A–Z)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {fetchError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <h3 className="text-lg font-semibold text-destructive">Error loading templates</h3>
          <p className="mt-2 text-sm text-muted-foreground">{fetchError}</p>
          <Button
            type="button"
            onClick={() => fetchTemplates()}
            className="mt-4 min-h-11 bg-[#4F46E5] text-white hover:bg-[#4338CA] motion-reduce:transform-none sm:min-h-9"
          >
            Retry
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No templates yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Get started by designing a drag-and-drop visual layout or writing a custom HTML email template.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard/templates/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white shadow-xs transition-[background-color,transform] duration-75 hover:bg-[#4338CA] active:scale-[0.97] motion-reduce:transform-none sm:min-h-10"
            >
              <Sparkles className="h-4 w-4" />
              New Email Template
            </Link>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {searchQuery.trim()
              ? `No templates match “${searchQuery.trim()}”`
              : `No ${filterBy} templates yet`}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {searchQuery.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 motion-reduce:transform-none sm:min-h-8"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
            {filterBy !== 'all' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 motion-reduce:transform-none sm:min-h-8"
                onClick={() => setFilterBy('all')}
              >
                Show all templates
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {renderTemplateSection(
            privateTemplates,
            'My Private Templates',
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
          {renderTemplateSection(
            publicTemplates,
            'Public Templates',
            <Globe className="h-5 w-5 text-[#4F46E5] dark:text-[#818CF8]" />
          )}
          {renderTemplateSection(
            defaultTemplates,
            'Default Templates',
            <LayoutTemplate className="h-5 w-5 text-[#4F46E5] dark:text-[#818CF8]" />
          )}
        </div>
      )}

      {/* Template Live Preview Dialog */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-4 overflow-hidden">
          {previewTemplate && (
            <>
              <DialogHeader className="pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{previewTemplate.name}</DialogTitle>
                  <Badge variant="outline">{getTemplateKindLabel(previewTemplate)}</Badge>
                </div>
                <DialogDescription>
                  {previewTemplate.subject
                    ? `Subject: ${previewTemplate.subject}`
                    : previewTemplate.description || 'Live sandboxed template preview.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/70 py-2.5">
                <p className="text-xs text-muted-foreground">
                  {previewTemplate.description || 'Sandboxed preview (scripts & forms disabled).'}
                </p>
                <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    aria-pressed={previewViewport === 'desktop'}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-[background-color,color,transform] duration-75 active:scale-[0.97] motion-reduce:transform-none sm:min-h-8 ${
                      previewViewport === 'desktop'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    aria-pressed={previewViewport === 'mobile'}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-[background-color,color,transform] duration-75 active:scale-[0.97] motion-reduce:transform-none sm:min-h-8 ${
                      previewViewport === 'mobile'
                        ? 'bg-[#4F46E5] text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
                <div
                  className={`mx-auto overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-[max-width] duration-200 motion-reduce:transition-none ${
                    previewViewport === 'mobile' ? 'max-w-[375px]' : 'w-full'
                  }`}
                >
                  <iframe
                    sandbox=""
                    title={`${previewTemplate.name} full preview`}
                    srcDoc={getPreviewSrcDoc(previewTemplate)}
                    className="h-[440px] w-full border-0 bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 motion-reduce:transform-none sm:min-h-9"
                  disabled={duplicatingIds.has(getTemplateId(previewTemplate))}
                  onClick={() => handleDuplicate(previewTemplate)}
                >
                  {duplicatingIds.has(getTemplateId(previewTemplate)) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {duplicatingIds.has(getTemplateId(previewTemplate))
                    ? 'Copying...'
                    : 'Duplicate'}
                </Button>

                {!isDefaultTemplate(previewTemplate) && previewTemplate.isOwner !== false && (
                  <Link
                    href={`/dashboard/templates/${getTemplateId(previewTemplate)}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white shadow-xs transition-[background-color,transform] duration-75 hover:bg-[#4338CA] active:scale-[0.97] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] sm:min-h-9"
                  >
                    <Sparkles className="h-4 w-4" />
                    Edit in Studio
                  </Link>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Accessible Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(templateToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setTemplateToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">
                {templateToDelete?.name || 'this template'}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="min-h-11 motion-reduce:transform-none sm:min-h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90 motion-reduce:transform-none sm:min-h-9"
            >
              {isDeleting ? 'Deleting...' : 'Delete Template'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
