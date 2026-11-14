"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TextContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function TextContentEditor({ block, onUpdateContent }: TextContentEditorProps) {
  const fieldId = `block-text-${block.id}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="text-foreground">
          {block.type === 'header' ? 'Header Text' : 'Text Content'}
        </Label>
        <Textarea
          id={fieldId}
          name="text"
          value={block.content.text || ''}
          onChange={(e) => onUpdateContent(block.id, { text: e.target.value })}
          rows={5}
          placeholder="Enter your copy here..."
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{'{{variableName}}'}</code> to insert dynamic content.
        </p>
      </div>
    </div>
  );
}
