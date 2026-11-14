"use client";

import { useMemo, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { EmailTemplate } from '@/lib/email-templates';
import { absolutizeEmailUrls } from '@/lib/utils';

interface TemplatePreviewProps {
  template: EmailTemplate;
  variables: Record<string, string>;
}

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EACH_BLOCK_REGEX = /\{\{#each\s+([a-zA-Z0-9_.-]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;
const EACH_PROP_REGEX = /\{\{\s*this\.([a-zA-Z0-9_.-]+)\s*\}\}/g;
const EACH_THIS_REGEX = /\{\{\s*this\s*\}\}/g;
const PLACEHOLDER_REGEX = /\{\{([^{}]+)\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const renderPreviewEachBlocks = (
  text: string,
  allVariables: Map<string, string>,
  shouldEscape: boolean
): string => {
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
          .map((line) => ({ title: line, content: line }));
      }
    }

    if (items.length === 0) {
      items = [{ title: `[${key} title]`, content: `[${key} content]` }];
    }

    return items
      .map((item) =>
        inner
          .replace(EACH_PROP_REGEX, (_m, prop: string) => {
            if (UNSAFE_OBJECT_KEYS.has(prop)) {
              return '';
            }
            const val = Object.prototype.hasOwnProperty.call(item, prop)
              ? item[prop]
              : '';
            return val ? formatVal(val) : formatVal(`[${prop}]`);
          })
          .replace(EACH_THIS_REGEX, () => formatVal(item.content || item.title || ''))
      )
      .join('');
  });
};

export default function TemplatePreview({ template, variables }: TemplatePreviewProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  const templateHtml = template.html || template.content || '';

  const templatePreparation = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl =
      typeof variables.baseUrl === 'string' && variables.baseUrl
        ? variables.baseUrl
        : origin;

    const variableMap = new Map<string, string>();
    for (const [key, value] of Object.entries(variables)) {
      if (!UNSAFE_OBJECT_KEYS.has(key) && typeof value === 'string') {
        variableMap.set(key, value);
      }
    }
    variableMap.set('baseUrl', baseUrl);

    const templateVarSet = new Set<string>();
    if (Array.isArray(template.variables)) {
      for (const variable of template.variables) {
        if (typeof variable === 'string' && !UNSAFE_OBJECT_KEYS.has(variable)) {
          templateVarSet.add(variable);
        }
      }
    }

    return { variableMap, templateVarSet, baseUrl };
  }, [template.variables, variables]);

  const replaceVariables = useMemo(() => {
    const { variableMap, templateVarSet, baseUrl } = templatePreparation;

    return (text: string, options?: { escapeValues?: boolean; absolutize?: boolean }) => {
      if (!text) return '';
      const shouldEscape = options?.escapeValues ?? true;
      const shouldAbsolutize = options?.absolutize ?? true;
      const formatVal = (val: string) => (shouldEscape ? escapeHtml(val) : val);

      let result = renderPreviewEachBlocks(text, variableMap, shouldEscape);

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

      if (shouldAbsolutize && baseUrl) {
        result = absolutizeEmailUrls(result, baseUrl);
      }

      return result;
    };
  }, [templatePreparation]);

  const previewSubject = useMemo(
    () => replaceVariables(template.subject || '', { escapeValues: false, absolutize: false }),
    [replaceVariables, template.subject]
  );

  const previewHtml = useMemo(
    () => replaceVariables(templateHtml, { escapeValues: true, absolutize: true }),
    [replaceVariables, templateHtml]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Subject Preview
        </span>
        <p className="mt-1.5 text-sm font-medium text-foreground">
          {previewSubject || <span className="italic text-muted-foreground">No subject</span>}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <h3 className="text-sm font-medium text-foreground">Email Preview</h3>
          <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              aria-label="Desktop preview"
              aria-pressed={viewport === 'desktop'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors motion-reduce:transition-none ${
                viewport === 'desktop'
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              aria-label="Mobile preview"
              aria-pressed={viewport === 'mobile'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors motion-reduce:transition-none ${
                viewport === 'mobile'
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>
        </div>

        <div className="bg-muted/30 p-4">
          {!previewHtml ? (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground">
              <p className="text-sm font-medium text-foreground">No content to preview</p>
              <p className="mt-1 text-xs">Template ID: {template.id}</p>
            </div>
          ) : (
            <div
              className={`mx-auto overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-[max-width] duration-200 motion-reduce:transition-none ${
                viewport === 'mobile' ? 'max-w-[375px]' : 'w-full'
              }`}
            >
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="min-h-[420px] w-full border-0 bg-white"
                sandbox=""
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
