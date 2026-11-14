"use client";

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { BlockContent, TemplateBlock } from './types';
import { ContentEditor } from './content-editors/ContentEditor';
import { StyleEditor } from './StyleEditor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BlockEditorProps {
  block: TemplateBlock | null;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
  onUpdateStyle: (id: string, styles: Record<string, string>) => void;
}

const formatBlockLabel = (type: string) =>
  type
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function BlockEditor({ block, onUpdateContent, onUpdateStyle }: BlockEditorProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  if (!block) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-muted-foreground">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
          <Layers className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No block selected</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Click any block on the canvas to edit its content and styling, or add a new block above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Block Inspector</h3>
        <span className="inline-flex items-center rounded-md border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-2 py-0.5 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8]">
          {formatBlockLabel(block.type)}
        </span>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'content' | 'style')}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
        </TabsList>
      </Tabs>

      <div>
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
    </div>
  );
}
