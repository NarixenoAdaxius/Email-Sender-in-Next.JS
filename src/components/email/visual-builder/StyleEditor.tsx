"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { TemplateBlock } from './types';
import { normalizeHexColor } from './utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StyleEditorProps {
  block: TemplateBlock;
  onUpdateStyle: (id: string, styles: Record<string, string>) => void;
}

const selectClasses =
  'flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function StyleEditor({ block, onUpdateStyle }: StyleEditorProps) {
  const supportsTypography =
    block.type === 'header' ||
    block.type === 'text' ||
    block.type === 'button' ||
    block.type === 'quote' ||
    block.type === 'list';

  const supportsBackground =
    block.type === 'header' ||
    block.type === 'button' ||
    block.type === 'text' ||
    block.type === 'quote';

  const supportsBorderRadius =
    block.type === 'button' || block.type === 'header' || block.type === 'card';

  const textColorPickerId = `style-color-picker-${block.id}`;
  const textColorInputId = `style-color-${block.id}`;
  const fontSizeId = `style-font-size-${block.id}`;
  const fontFamilyId = `style-font-family-${block.id}`;
  const fontWeightId = `style-font-weight-${block.id}`;
  const textDecorationId = `style-text-decoration-${block.id}`;
  const textAlignId = `style-text-align-${block.id}`;
  const bgColorPickerId = `style-bg-color-picker-${block.id}`;
  const bgColorInputId = `style-bg-color-${block.id}`;
  const paddingId = `style-padding-${block.id}`;
  const borderRadiusId = `style-border-radius-${block.id}`;

  return (
    <div className="space-y-4">
      {supportsTypography && (
        <>
          <div className="space-y-2">
            <Label htmlFor={textColorInputId} className="text-foreground">
              Text Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                id={textColorPickerId}
                name="colorPicker"
                type="color"
                aria-label="Text color picker"
                value={normalizeHexColor(block.styles.color, '#000000')}
                onChange={(e) => onUpdateStyle(block.id, { color: e.target.value })}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <Input
                id={textColorInputId}
                name="color"
                type="text"
                value={block.styles.color || ''}
                onChange={(e) => onUpdateStyle(block.id, { color: e.target.value })}
                placeholder="#000000 or rgb(...)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={fontSizeId} className="text-foreground">
              Font Size
            </Label>
            <Input
              id={fontSizeId}
              name="fontSize"
              type="text"
              value={block.styles.fontSize || ''}
              onChange={(e) => onUpdateStyle(block.id, { fontSize: e.target.value })}
              placeholder="e.g., 16px"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={fontFamilyId} className="text-foreground">
              Font Family
            </Label>
            <div className="relative">
              <select
                id={fontFamilyId}
                name="fontFamily"
                value={block.styles.fontFamily || 'Arial, sans-serif'}
                onChange={(e) => onUpdateStyle(block.id, { fontFamily: e.target.value })}
                className={selectClasses}
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</option>
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', Courier, monospace">Courier New</option>
                <option value="Verdana, Geneva, sans-serif">Verdana</option>
                <option value="Tahoma, Geneva, sans-serif">Tahoma</option>
                <option value="'Trebuchet MS', Helvetica, sans-serif">Trebuchet MS</option>
                <option value="Impact, Charcoal, sans-serif">Impact</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
                <option value="'Roboto', sans-serif">Roboto</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={fontWeightId} className="text-foreground">
              Font Weight
            </Label>
            <div className="relative">
              <select
                id={fontWeightId}
                name="fontWeight"
                value={block.styles.fontWeight || 'normal'}
                onChange={(e) => onUpdateStyle(block.id, { fontWeight: e.target.value })}
                className={selectClasses}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Lighter</option>
                <option value="bolder">Bolder</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
                <option value="900">900</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={textDecorationId} className="text-foreground">
              Text Decoration
            </Label>
            <div className="relative">
              <select
                id={textDecorationId}
                name="textDecoration"
                value={block.styles.textDecoration || 'none'}
                onChange={(e) => onUpdateStyle(block.id, { textDecoration: e.target.value })}
                className={selectClasses}
              >
                <option value="none">None</option>
                <option value="underline">Underline</option>
                <option value="overline">Overline</option>
                <option value="line-through">Line Through</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={textAlignId} className="text-foreground">
              Text Align
            </Label>
            <div className="relative">
              <select
                id={textAlignId}
                name="textAlign"
                value={block.styles.textAlign || 'left'}
                onChange={(e) => onUpdateStyle(block.id, { textAlign: e.target.value })}
                className={selectClasses}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </>
      )}

      {supportsBackground && (
        <div className="space-y-2">
          <Label htmlFor={bgColorInputId} className="text-foreground">
            Background Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              id={bgColorPickerId}
              name="backgroundColorPicker"
              type="color"
              aria-label="Background color picker"
              value={normalizeHexColor(block.styles.backgroundColor, '#ffffff')}
              onChange={(e) => onUpdateStyle(block.id, { backgroundColor: e.target.value })}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <Input
              id={bgColorInputId}
              name="backgroundColor"
              type="text"
              value={block.styles.backgroundColor || ''}
              onChange={(e) => onUpdateStyle(block.id, { backgroundColor: e.target.value })}
              placeholder="#ffffff or rgb(...)"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={paddingId} className="text-foreground">
          Padding
        </Label>
        <Input
          id={paddingId}
          name="padding"
          type="text"
          value={block.styles.padding || ''}
          onChange={(e) => onUpdateStyle(block.id, { padding: e.target.value })}
          placeholder="e.g., 10px or 10px 20px"
        />
      </div>

      {supportsBorderRadius && (
        <div className="space-y-2">
          <Label htmlFor={borderRadiusId} className="text-foreground">
            Border Radius
          </Label>
          <Input
            id={borderRadiusId}
            name="borderRadius"
            type="text"
            value={block.styles.borderRadius || ''}
            onChange={(e) => onUpdateStyle(block.id, { borderRadius: e.target.value })}
            placeholder="e.g., 6px"
          />
        </div>
      )}
    </div>
  );
}
