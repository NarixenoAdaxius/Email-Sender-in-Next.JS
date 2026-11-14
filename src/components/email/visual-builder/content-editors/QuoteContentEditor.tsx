"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface QuoteContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function QuoteContentEditor({ block, onUpdateContent }: QuoteContentEditorProps) {
  const quoteTextId = `quote-text-${block.id}`;
  const quoteAuthorId = `quote-author-${block.id}`;
  const authorValue = block.content.quoteAuthor ?? block.content.citation ?? '';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={quoteTextId} className="text-foreground">
          Quote Text
        </Label>
        <Textarea
          id={quoteTextId}
          name="quoteText"
          value={block.content.text || ''}
          onChange={(e) => onUpdateContent(block.id, { text: e.target.value })}
          rows={4}
          placeholder="Enter quote text here..."
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{'{{variableName}}'}</code> for dynamic content.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={quoteAuthorId} className="text-foreground">
          Author / Attribution
        </Label>
        <Input
          id={quoteAuthorId}
          name="quoteAuthor"
          type="text"
          value={authorValue}
          onChange={(e) => onUpdateContent(block.id, { quoteAuthor: e.target.value })}
          placeholder="e.g., Jane Doe"
        />
      </div>
    </div>
  );
}
