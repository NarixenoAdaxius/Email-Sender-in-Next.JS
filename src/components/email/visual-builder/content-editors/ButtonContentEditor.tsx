"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ButtonContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function ButtonContentEditor({ block, onUpdateContent }: ButtonContentEditorProps) {
  const textId = `button-text-${block.id}`;
  const urlId = `button-url-${block.id}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={textId} className="text-foreground">
          Button Text
        </Label>
        <Input
          id={textId}
          name="buttonText"
          type="text"
          value={block.content.text || ''}
          onChange={(e) => onUpdateContent(block.id, { text: e.target.value })}
          placeholder="e.g., Get Started"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={urlId} className="text-foreground">
          Button URL
        </Label>
        <Input
          id={urlId}
          name="buttonUrl"
          type="text"
          value={block.content.url || ''}
          onChange={(e) => onUpdateContent(block.id, { url: e.target.value })}
          placeholder="https://example.com or {{actionLink}}"
        />
        <p className="text-xs text-muted-foreground">
          You can use variables like <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{'{{variableName}}'}</code> in the URL.
        </p>
      </div>
    </div>
  );
}
