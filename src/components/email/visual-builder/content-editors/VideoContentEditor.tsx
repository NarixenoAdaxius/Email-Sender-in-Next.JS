"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface VideoContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function VideoContentEditor({ block, onUpdateContent }: VideoContentEditorProps) {
  const titleId = `video-title-${block.id}`;
  const urlId = `video-url-${block.id}`;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={titleId} className="text-foreground">
          Video Title
        </Label>
        <Input
          id={titleId}
          name="videoTitle"
          type="text"
          value={block.content.title || ''}
          onChange={(e) => onUpdateContent(block.id, { title: e.target.value })}
          placeholder="Watch our latest video"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={urlId} className="text-foreground">
          Video URL
        </Label>
        <Input
          id={urlId}
          name="videoUrl"
          type="text"
          value={block.content.videoUrl || ''}
          onChange={(e) => onUpdateContent(block.id, { videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=videoId"
        />
        <p className="text-xs text-muted-foreground">
          Exported emails render an email-client-safe clickable Play CTA card linking directly to your video.
        </p>
      </div>
    </div>
  );
}
