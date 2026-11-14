"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { normalizeHexColor } from '../utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CardContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function CardContentEditor({ block, onUpdateContent }: CardContentEditorProps) {
  const titleId = `card-title-${block.id}`;
  const descId = `card-description-${block.id}`;
  const bgPickerId = `card-bg-color-picker-${block.id}`;
  const bgTextId = `card-bg-color-${block.id}`;
  const borderPickerId = `card-border-color-picker-${block.id}`;
  const borderTextId = `card-border-color-${block.id}`;
  const paddingId = `card-padding-${block.id}`;

  const bgValue = block.content.backgroundColor ?? '#ffffff';
  const borderValue = block.content.borderColor ?? '#e5e7eb';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={titleId} className="text-foreground">
          Card Title
        </Label>
        <Input
          id={titleId}
          name="cardTitle"
          value={block.content.title || ''}
          onChange={(e) => onUpdateContent(block.id, { title: e.target.value })}
          placeholder="Card Title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descId} className="text-foreground">
          Card Description
        </Label>
        <Textarea
          id={descId}
          name="cardDescription"
          value={block.content.description || ''}
          onChange={(e) => onUpdateContent(block.id, { description: e.target.value })}
          placeholder="Card Description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={bgTextId} className="text-foreground">
          Background Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            id={bgPickerId}
            name="cardBackgroundColorPicker"
            type="color"
            aria-label="Card background color picker"
            value={normalizeHexColor(bgValue, '#ffffff')}
            onChange={(e) => onUpdateContent(block.id, { backgroundColor: e.target.value })}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <Input
            id={bgTextId}
            name="cardBackgroundColor"
            value={bgValue}
            onChange={(e) => onUpdateContent(block.id, { backgroundColor: e.target.value })}
            placeholder="#ffffff"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={borderTextId} className="text-foreground">
          Border Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            id={borderPickerId}
            name="cardBorderColorPicker"
            type="color"
            aria-label="Card border color picker"
            value={normalizeHexColor(borderValue, '#e5e7eb')}
            onChange={(e) => onUpdateContent(block.id, { borderColor: e.target.value })}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <Input
            id={borderTextId}
            name="cardBorderColor"
            value={borderValue}
            onChange={(e) => onUpdateContent(block.id, { borderColor: e.target.value })}
            placeholder="#e5e7eb"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={paddingId} className="text-foreground">
          Padding
        </Label>
        <Input
          id={paddingId}
          name="cardPadding"
          value={block.content.padding ?? ''}
          onChange={(e) => onUpdateContent(block.id, { padding: e.target.value })}
          placeholder="16px"
        />
      </div>
    </div>
  );
}
