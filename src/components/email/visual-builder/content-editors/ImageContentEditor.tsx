"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import EmailImageUploader from '@/components/ui/EmailImageUploader';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ImageContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function ImageContentEditor({ block, onUpdateContent }: ImageContentEditorProps) {
  const srcId = `image-src-${block.id}`;
  const altId = `image-alt-${block.id}`;

  const imageUrl =
    block.content.src && block.content.src.includes('placeholder.com')
      ? ''
      : block.content.src || '';

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">Upload Image</span>
        <EmailImageUploader
          initialImage={imageUrl}
          folder="email-images"
          onImageSelected={(selectedUrl) => onUpdateContent(block.id, { src: selectedUrl })}
          className="mt-1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={srcId} className="text-foreground">
          Image URL
        </Label>
        <Input
          id={srcId}
          name="imageSrc"
          type="text"
          value={imageUrl}
          onChange={(e) => onUpdateContent(block.id, { src: e.target.value })}
          placeholder="https://example.com/banner.png or {{imageUrl}}"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={altId} className="text-foreground">
          Alt Text
        </Label>
        <Input
          id={altId}
          name="imageAlt"
          type="text"
          value={block.content.alt || ''}
          onChange={(e) => onUpdateContent(block.id, { alt: e.target.value })}
          placeholder="Describe the image for accessibility"
        />
        <p className="text-xs text-muted-foreground">
          Describes the image for screen readers and when email clients block images.
        </p>
      </div>
    </div>
  );
}
