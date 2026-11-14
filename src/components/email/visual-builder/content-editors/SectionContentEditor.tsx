"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { normalizeHexColor } from '../utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SectionContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function SectionContentEditor({ block, onUpdateContent }: SectionContentEditorProps) {
  const titleId = `section-title-${block.id}`;
  const bgPickerId = `section-bg-color-picker-${block.id}`;
  const bgTextId = `section-bg-color-${block.id}`;
  const paddingId = `section-padding-${block.id}`;

  const bgValue = block.content.backgroundColor ?? '#f9fafb';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={titleId} className="text-foreground">
          Section Title
        </Label>
        <Input
          id={titleId}
          name="sectionTitle"
          value={block.content.title || ''}
          onChange={(e) => onUpdateContent(block.id, { title: e.target.value })}
          placeholder="Section Title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={bgTextId} className="text-foreground">
          Background Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            id={bgPickerId}
            name="sectionBackgroundColorPicker"
            type="color"
            aria-label="Section background color picker"
            value={normalizeHexColor(bgValue, '#f9fafb')}
            onChange={(e) => onUpdateContent(block.id, { backgroundColor: e.target.value })}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <Input
            id={bgTextId}
            name="sectionBackgroundColor"
            value={bgValue}
            onChange={(e) => onUpdateContent(block.id, { backgroundColor: e.target.value })}
            placeholder="#f9fafb"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={paddingId} className="text-foreground">
          Padding
        </Label>
        <Input
          id={paddingId}
          name="sectionPadding"
          value={block.content.padding ?? ''}
          onChange={(e) => onUpdateContent(block.id, { padding: e.target.value })}
          placeholder="24px"
        />
      </div>
    </div>
  );
}
