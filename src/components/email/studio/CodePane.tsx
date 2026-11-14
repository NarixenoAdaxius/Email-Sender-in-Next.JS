"use client";

import React, { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { AlertTriangle, Check, CheckCircle2, Code2, Copy, Download, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodePaneProps {
  htmlValue: string;
  cssValue: string;
  onHtmlChange: (nextHtml: string) => void;
  onCssChange: (nextCss: string) => void;
  onFormatHtml?: () => void;
  fileName?: string;
}

const GMAIL_CLIP_LIMIT_KB = 102;
const GMAIL_WARN_LIMIT_KB = 85;
const textEncoder = new TextEncoder();
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const variableMatcher = new MatchDecorator({
  regexp: /\{\{[^{}]+\}\}/g,
  decoration: () =>
    Decoration.mark({
      class: 'cm-pm-variable',
    }),
});

const variableHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = variableMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = variableMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

const variableTheme = EditorView.baseTheme({
  '.cm-pm-variable': {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    color: '#a5b4fc',
    borderRadius: '3px',
    padding: '0 2px',
    fontWeight: '600',
  },
});

export const CodePane = memo(function CodePane({
  htmlValue,
  cssValue,
  onHtmlChange,
  onCssChange,
  onFormatHtml,
  fileName,
}: CodePaneProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const htmlExtensions = useMemo(
    () => [html(), variableHighlightPlugin, variableTheme, EditorView.lineWrapping],
    []
  );

  const cssExtensions = useMemo(
    () => [css(), variableHighlightPlugin, variableTheme, EditorView.lineWrapping],
    []
  );

  const deferredHtml = useDeferredValue(htmlValue);

  const byteSize = useMemo(
    () => textEncoder.encode(deferredHtml).length,
    [deferredHtml]
  );

  const sizeKb = byteSize / 1024;
  const clipStatus =
    sizeKb > GMAIL_CLIP_LIMIT_KB
      ? 'clip'
      : sizeKb > GMAIL_WARN_LIMIT_KB
        ? 'warn'
        : 'safe';

  const handleCopyHtml = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(htmlValue);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
      toast.success('Copied HTML to clipboard', { autoClose: 1500 });
    } catch {
      toast.error('Unable to copy HTML to clipboard');
    }
  };

  const handleDownloadHtml = () => {
    let safeSlug = (fileName || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
    if (!safeSlug || WINDOWS_RESERVED_NAMES.test(safeSlug)) {
      safeSlug = safeSlug ? `${safeSlug}-template` : 'email-template';
    }
    const downloadName = `${safeSlug}.html`;
    const blob = new Blob([htmlValue], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Downloaded ${downloadName}`, { autoClose: 1500 });
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden bg-[#1e1e2e] text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/90 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Code language" className="flex items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'html'}
              onClick={() => setActiveTab('html')}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors active:scale-[0.97] motion-reduce:transform-none lg:min-h-0',
                activeTab === 'html'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Code2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>HTML</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'css'}
              onClick={() => setActiveTab('css')}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors active:scale-[0.97] motion-reduce:transform-none lg:min-h-0',
                activeTab === 'css'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <span>CSS</span>
            </button>
          </div>

          <span
            role="status"
            title="Gmail clips HTML emails larger than 102 KB"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums',
              clipStatus === 'safe' &&
                'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
              clipStatus === 'warn' &&
                'border-amber-500/35 bg-amber-500/15 text-amber-300',
              clipStatus === 'clip' &&
                'border-red-500/40 bg-red-500/15 text-red-300'
            )}
          >
            {clipStatus === 'safe' ? (
              <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            <span>
              {sizeKb.toFixed(1)} KB / {GMAIL_CLIP_LIMIT_KB} KB ·{' '}
              {clipStatus === 'clip'
                ? 'Gmail will clip > 102 KB'
                : clipStatus === 'warn'
                  ? 'Near Gmail clip limit'
                  : 'Safe'}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyHtml}
            className="min-h-11 gap-1 px-2 text-xs text-zinc-300 transition-transform duration-75 hover:bg-zinc-800 hover:text-white active:scale-[0.97] motion-reduce:transform-none lg:min-h-0 lg:h-7"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-zinc-400" />
            )}
            <span>{copied ? 'Copied' : 'Copy HTML'}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownloadHtml}
            className="min-h-11 gap-1 px-2 text-xs text-zinc-300 transition-transform duration-75 hover:bg-zinc-800 hover:text-white active:scale-[0.97] motion-reduce:transform-none lg:min-h-0 lg:h-7"
          >
            <Download className="h-3 w-3 text-zinc-400" />
            <span>Download .html</span>
          </Button>
          {activeTab === 'html' && onFormatHtml && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFormatHtml}
              className="min-h-11 gap-1 px-2 text-xs text-zinc-300 transition-transform duration-75 hover:bg-zinc-800 hover:text-white active:scale-[0.97] motion-reduce:transform-none lg:min-h-0 lg:h-7"
            >
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>Sync &amp; Format</span>
            </Button>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className={cn('h-full', activeTab !== 'html' && 'hidden')}>
          <CodeMirror
            className="h-full"
            value={htmlValue}
            height="100%"
            theme={oneDark}
            extensions={htmlExtensions}
            onChange={onHtmlChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              closeBrackets: true,
              searchKeymap: true,
            }}
          />
        </div>
        <div className={cn('h-full', activeTab !== 'css' && 'hidden')}>
          <CodeMirror
            className="h-full"
            value={cssValue}
            height="100%"
            theme={oneDark}
            extensions={cssExtensions}
            onChange={onCssChange}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              autocompletion: true,
              closeBrackets: true,
              searchKeymap: true,
            }}
          />
        </div>
      </div>
    </div>
  );
});
