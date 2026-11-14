"use client";

import React from 'react';
import { Code2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BlockContent, TemplateBlock } from '../types';

interface CustomHtmlContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function CustomHtmlContentEditor({
  block,
  onUpdateContent,
}: CustomHtmlContentEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Code2 className="h-3.5 w-3.5 shrink-0 text-[#4F46E5] dark:text-[#818CF8]" />
        <span>
          Raw HTML block. Edit inline below or switch to <strong>Split</strong> /{' '}
          <strong>Code</strong> mode for full CodeMirror editing.
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`custom-html-${block.id}`} className="text-foreground">
          HTML Markup
        </Label>
        <Textarea
          id={`custom-html-${block.id}`}
          rows={10}
          spellCheck={false}
          className="font-mono text-xs leading-relaxed"
          value={block.content.html || ''}
          onChange={(e) => onUpdateContent(block.id, { html: e.target.value })}
          placeholder="<table><tr><td>Custom HTML...</td></tr></table>"
        />
      </div>
    </div>
  );
}
