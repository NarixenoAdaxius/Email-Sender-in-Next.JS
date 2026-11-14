"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { normalizeHexColor } from '../utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface SpacerContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function SpacerContentEditor({ block, onUpdateContent }: SpacerContentEditorProps) {
  if (block.type === 'divider') {
    const colorPickerId = `divider-color-picker-${block.id}`;
    const colorTextId = `divider-color-${block.id}`;
    const thicknessId = `divider-thickness-${block.id}`;
    const dividerColor = block.content.color ?? '#e5e7eb';

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={colorTextId} className="text-foreground">
            Divider Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              id={colorPickerId}
              name="dividerColorPicker"
              type="color"
              aria-label="Divider color picker"
              value={normalizeHexColor(dividerColor, '#e5e7eb')}
              onChange={(e) => onUpdateContent(block.id, { color: e.target.value })}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <Input
              id={colorTextId}
              name="dividerColor"
              type="text"
              value={dividerColor}
              onChange={(e) => onUpdateContent(block.id, { color: e.target.value })}
              placeholder="#e5e7eb"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={thicknessId} className="text-foreground">
            Thickness
          </Label>
          <Input
            id={thicknessId}
            name="dividerThickness"
            type="text"
            value={block.content.thickness ?? ''}
            onChange={(e) => onUpdateContent(block.id, { thickness: e.target.value })}
            placeholder="e.g., 1px or 2px"
          />
        </div>
      </div>
    );
  }

  const heightId = `spacer-height-${block.id}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={heightId} className="text-foreground">
        Height
      </Label>
      <Input
        id={heightId}
        name="spacerHeight"
        type="text"
        value={block.content.height ?? ''}
        onChange={(e) => onUpdateContent(block.id, { height: e.target.value })}
        placeholder="e.g., 20px"
      />
    </div>
  );
}
