"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';

interface ImageContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function ImageContentEditor({ block, onUpdateContent }: ImageContentEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Image URL
        </label>
        <input
          type="text"
          value={block.content.src || ''}
          onChange={(e) => onUpdateContent(block.id, { src: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Alt Text
        </label>
        <input
          type="text"
          value={block.content.alt || ''}
          onChange={(e) => onUpdateContent(block.id, { alt: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        />
      </div>
    </div>
  );
} 