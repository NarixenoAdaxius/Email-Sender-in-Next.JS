"use client";

import React, { useState } from 'react';
import { ArrowLeft, Globe, Layers, Lock, Mail, SlidersHorizontal } from 'lucide-react';
import { BlockContent, TemplateBlock } from '../visual-builder/types';
import { ContentEditor } from '../visual-builder/content-editors/ContentEditor';
import { StyleEditor } from '../visual-builder/StyleEditor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface InspectorPanelProps {
  block: TemplateBlock | null;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
  onUpdateStyle: (id: string, styles: Record<string, string>) => void;
  name: string;
  subject: string;
  preheader?: string;
  description: string;
  isPublic: boolean;
  onMetaChange: (patch: {
    name?: string;
    subject?: string;
    preheader?: string;
    description?: string;
    isPublic?: boolean;
  }) => void;
  onDeselectBlock?: () => void;
}

const formatBlockLabel = (type?: string) =>
  (type || 'block')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function InspectorPanel({
  block,
  onUpdateContent,
  onUpdateStyle,
  name,
  subject,
  preheader = '',
  description,
  isPublic,
  onMetaChange,
  onDeselectBlock,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  const preheaderLength = preheader.trim().length;
  const preheaderLengthStatus =
    preheaderLength === 0
      ? 'idle'
      : preheaderLength < 35
        ? 'short'
        : preheaderLength <= 90
          ? 'optimal'
          : 'long';

  if (!block) {
    return (
      <aside className="flex h-full w-full flex-col border-t border-border bg-card/70 p-4 lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <SlidersHorizontal className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
          <h2 className="text-sm font-semibold text-foreground">Template Settings</h2>
        </div>

        <div className="space-y-4 overflow-y-auto pb-24 lg:pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="studio-meta-name" className="text-xs text-foreground">
              Template Name
            </Label>
            <Input
              id="studio-meta-name"
              value={name ?? ''}
              onChange={(e) => onMetaChange({ name: e.target.value })}
              placeholder="e.g., Monthly Newsletter"
              className="min-h-11 text-xs lg:min-h-0 lg:h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio-meta-subject" className="text-xs text-foreground">
              Email Subject
            </Label>
            <Input
              id="studio-meta-subject"
              value={subject ?? ''}
              onChange={(e) => onMetaChange({ subject: e.target.value })}
              placeholder="e.g., Welcome, {{name}}!"
              className="min-h-11 text-xs lg:min-h-0 lg:h-8"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="studio-meta-preheader" className="text-xs text-foreground">
                Preheader Text
              </Label>
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  preheaderLengthStatus === 'optimal' && 'text-emerald-700 dark:text-emerald-400',
                  (preheaderLengthStatus === 'short' || preheaderLengthStatus === 'long') &&
                    'text-amber-700 dark:text-amber-400',
                  preheaderLengthStatus === 'idle' && 'text-muted-foreground'
                )}
              >
                {preheaderLength} / 90
              </span>
            </div>
            <Textarea
              id="studio-meta-preheader"
              rows={2}
              value={preheader ?? ''}
              onChange={(e) => onMetaChange({ preheader: e.target.value })}
              placeholder="Short preview snippet shown beside the subject line..."
              className="text-xs"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Recommended 35–90 characters.{' '}
              {preheaderLengthStatus === 'optimal' && 'Ideal length for desktop & mobile inboxes.'}
              {preheaderLengthStatus === 'short' && 'A bit short — aim for 35–90 characters.'}
              {preheaderLengthStatus === 'long' && 'May truncate on mobile inbox previews.'}
              {preheaderLengthStatus === 'idle' &&
                'Appears beside your subject in Gmail & Apple Mail.'}
            </p>
            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="h-3 w-3 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Inbox Preview</span>
              </div>
              <p className="truncate text-xs font-semibold text-foreground">
                {subject.trim() || 'Email subject line...'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {preheader.trim() || 'Preheader snippet appears right after the subject line.'}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="studio-meta-desc" className="text-xs text-foreground">
              Description
            </Label>
            <Textarea
              id="studio-meta-desc"
              rows={3}
              value={description ?? ''}
              onChange={(e) => onMetaChange({ description: e.target.value })}
              placeholder="Optional notes about when to use this template..."
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                {isPublic ? (
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>Public Template</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Allow other workspace users to view &amp; use this template.
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={(checked) => onMetaChange({ isPublic: checked })}
              aria-label="Toggle public template"
            />
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-muted-foreground">
            <Layers className="mx-auto mb-2 h-4 w-4" />
            <p className="text-xs font-medium text-foreground">Click any block to inspect</p>
            <p className="mt-1 text-xs">
              Select a block on the canvas to edit its content, typography, spacing, and colors.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full flex-col border-t border-border bg-card/70 p-4 lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {onDeselectBlock && (
            <button
              type="button"
              onClick={onDeselectBlock}
              title="Back to Template Settings"
              aria-label="Back to Template Settings"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-transform duration-75 hover:text-foreground active:scale-[0.97] motion-reduce:transform-none lg:min-h-0 lg:min-w-0 lg:h-7 lg:w-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <h2 className="truncate text-sm font-semibold text-foreground">Block Inspector</h2>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-md border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-2 py-0.5 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8]">
          {formatBlockLabel(block.type)}
        </span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'content' | 'style')}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content" className="min-h-11 lg:min-h-0">
            Content
          </TabsTrigger>
          <TabsTrigger value="style" className="min-h-11 lg:min-h-0">
            Style
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 overflow-y-auto pr-1 pb-24 lg:pb-4">
        {activeTab === 'content' ? (
          <ContentEditor
            key={block.id}
            block={block}
            onUpdateContent={onUpdateContent}
            onUpdateStyle={onUpdateStyle}
          />
        ) : (
          <StyleEditor key={block.id} block={block} onUpdateStyle={onUpdateStyle} />
        )}
      </div>
    </aside>
  );
}
