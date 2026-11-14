"use client";

import React from 'react';
import {
  Type,
  AlignLeft,
  Link,
  Image as ImageIcon,
  Minus,
  SeparatorHorizontal,
  Grid,
  Quote,
  List,
  Share2,
  Video,
  Square,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockType } from './types';

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
}

const contentBlocks: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'header', label: 'Header', icon: <Type className="h-4 w-4" /> },
  { type: 'text', label: 'Text', icon: <AlignLeft className="h-4 w-4" /> },
  { type: 'button', label: 'Button', icon: <Link className="h-4 w-4" /> },
  { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
  { type: 'spacer', label: 'Spacer', icon: <Minus className="h-4 w-4" /> },
  { type: 'divider', label: 'Divider', icon: <SeparatorHorizontal className="h-4 w-4" /> },
  { type: 'quote', label: 'Quote', icon: <Quote className="h-4 w-4" /> },
  { type: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
  { type: 'social', label: 'Social', icon: <Share2 className="h-4 w-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
  { type: 'card', label: 'Card', icon: <Square className="h-4 w-4" /> },
  { type: 'section', label: 'Section', icon: <LayoutGrid className="h-4 w-4" /> },
];

const gridBlocks: { type: BlockType; label: string }[] = [
  { type: 'grid-1-column', label: '1 Column' },
  { type: 'grid-2-column', label: '2 Columns' },
  { type: 'grid-3-column', label: '3 Columns' },
];

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  return (
    <div className="mb-6 space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content Blocks
        </h3>
        <div className="flex flex-wrap gap-2">
          {contentBlocks.map((item) => (
            <Button
              key={item.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddBlock(item.type)}
              className="gap-1.5 border-border bg-card text-foreground hover:border-[#4F46E5]/50 hover:bg-card active:scale-[0.98]"
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Grid Layouts
        </h3>
        <div className="flex flex-wrap gap-2">
          {gridBlocks.map((item) => (
            <Button
              key={item.type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddBlock(item.type)}
              className="gap-1.5 border-border bg-card text-foreground hover:border-[#4F46E5]/50 hover:bg-card active:scale-[0.98]"
            >
              <Grid className="h-4 w-4" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
