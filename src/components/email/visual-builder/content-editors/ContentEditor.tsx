"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { TextContentEditor } from './TextContentEditor';
import { ButtonContentEditor } from './ButtonContentEditor';
import { ImageContentEditor } from './ImageContentEditor';
import { SpacerContentEditor } from './SpacerContentEditor';
import { QuoteContentEditor } from './QuoteContentEditor';
import { ListContentEditor } from './ListContentEditor';
import { SocialContentEditor } from './SocialContentEditor';
import { VideoContentEditor } from './VideoContentEditor';
import { GridContentEditor } from './GridContentEditor';
import { CardContentEditor } from './CardContentEditor';
import { SectionContentEditor } from './SectionContentEditor';
import { CustomHtmlContentEditor } from './CustomHtmlContentEditor';

interface ContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
  onUpdateStyle?: (id: string, styles: Record<string, string>) => void;
}

export function ContentEditor({ block, onUpdateContent, onUpdateStyle }: ContentEditorProps) {
  switch (block.type) {
    case 'header':
    case 'text':
      return <TextContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'button':
      return <ButtonContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'image':
      return <ImageContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'spacer':
    case 'divider':
      return <SpacerContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'quote':
      return <QuoteContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'list':
      return <ListContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'social':
      return <SocialContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'video':
      return <VideoContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'grid-1-column':
    case 'grid-2-column':
    case 'grid-3-column':
      return (
        <GridContentEditor
          block={block}
          onUpdateContent={onUpdateContent}
          onUpdateStyle={onUpdateStyle}
        />
      );

    case 'card':
      return <CardContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'section':
      return <SectionContentEditor block={block} onUpdateContent={onUpdateContent} />;

    case 'custom-html':
      return <CustomHtmlContentEditor block={block} onUpdateContent={onUpdateContent} />;

    default:
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>Unknown block type: {block.type}</p>
        </div>
      );
  }
}
