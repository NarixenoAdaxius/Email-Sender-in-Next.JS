"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { BlockContent, BlockType, TemplateBlock } from '../types';
import { Type, AlignLeft, Link, Image as ImageIcon, Square, MinusIcon, Pencil, Palette, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { getDefaultContentForType, getDefaultStylesForType } from '../utils';
import { ContentEditor } from './ContentEditor';
import { StyleEditor } from '../StyleEditor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface GridContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
  onUpdateStyle?: (id: string, styles: Record<string, string>) => void;
}

export function GridContentEditor({ block, onUpdateContent }: GridContentEditorProps) {
  const [activeColumn, setActiveColumn] = useState<number>(0);
  const [selectedColumnBlockId, setSelectedColumnBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  const columnCount =
    block.type === 'grid-1-column' ? 1 : block.type === 'grid-2-column' ? 2 : 3;

  // Initialize columns if missing or preserve existing columns when resizing
  useEffect(() => {
    const currentCols = block.content.columns;
    if (!Array.isArray(currentCols) || currentCols.length !== columnCount) {
      const existing = Array.isArray(currentCols) ? currentCols : [];
      const nextColumns: TemplateBlock[][] = Array.from({ length: columnCount }, (_, i) =>
        Array.isArray(existing[i]) ? existing[i] : []
      );
      onUpdateContent(block.id, { columns: nextColumns });
    }
  }, [block.id, columnCount, block.content.columns, onUpdateContent]);

  const columns: TemplateBlock[][] = useMemo(
    () =>
      Array.isArray(block.content.columns) && block.content.columns.length > 0
        ? block.content.columns
        : Array(columnCount)
            .fill(0)
            .map(() => []),
    [block.content.columns, columnCount]
  );

  // Derive selected column block directly from columns so edits stay reactive
  const selectedColumnBlock = useMemo(() => {
    if (!selectedColumnBlockId) return null;
    for (const col of columns) {
      const found = col.find((b) => b.id === selectedColumnBlockId);
      if (found) return found;
    }
    return null;
  }, [columns, selectedColumnBlockId]);

  const addBlockToColumn = (columnIndex: number, blockType: BlockType) => {
    const safeColumnIndex = columnIndex >= 0 && columnIndex < columns.length ? columnIndex : 0;

    const newBlock: TemplateBlock = {
      id: nanoid(),
      type: blockType,
      content: getDefaultContentForType(blockType),
      styles: getDefaultStylesForType(blockType),
    };

    const newColumns = [...columns];
    newColumns[safeColumnIndex] = [...(newColumns[safeColumnIndex] || []), newBlock];

    onUpdateContent(block.id, { columns: newColumns });
    setSelectedColumnBlockId(newBlock.id);
    setActiveTab('content');
  };

  const removeBlockFromColumn = (columnIndex: number, blockIndex: number) => {
    if (columnIndex < 0 || columnIndex >= columns.length) return;
    if (!Array.isArray(columns[columnIndex])) return;
    if (blockIndex < 0 || blockIndex >= columns[columnIndex].length) return;

    const removedId = columns[columnIndex][blockIndex]?.id;
    const newColumns = [...columns];
    newColumns[columnIndex] = newColumns[columnIndex].filter((_, i) => i !== blockIndex);

    onUpdateContent(block.id, { columns: newColumns });

    if (removedId && removedId === selectedColumnBlockId) {
      setSelectedColumnBlockId(null);
    }
  };

  const updateColumnBlockContent = (targetBlockId: string, content: Partial<BlockContent>) => {
    const newColumns = columns.map((column) =>
      column.map((colBlock) =>
        colBlock.id === targetBlockId
          ? { ...colBlock, content: { ...colBlock.content, ...content } }
          : colBlock
      )
    );
    onUpdateContent(block.id, { columns: newColumns });
  };

  const updateColumnBlockStyle = (targetBlockId: string, styles: Record<string, string>) => {
    const newColumns = columns.map((column) =>
      column.map((colBlock) =>
        colBlock.id === targetBlockId
          ? { ...colBlock, styles: { ...colBlock.styles, ...styles } }
          : colBlock
      )
    );
    onUpdateContent(block.id, { columns: newColumns });
  };

  const componentTypes: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <AlignLeft className="h-4 w-4" /> },
    { type: 'button', label: 'Button', icon: <Link className="h-4 w-4" /> },
    { type: 'image', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
    { type: 'spacer', label: 'Spacer', icon: <MinusIcon className="h-4 w-4" /> },
    { type: 'card', label: 'Card', icon: <Square className="h-4 w-4" /> },
    { type: 'header', label: 'Header', icon: <Type className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <span className="block text-sm font-medium text-foreground">Grid Settings</span>
        <p className="text-xs text-muted-foreground">
          {columnCount}-column grid. Select a column below to add or edit components.
        </p>
        <p className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8]">
          Column {activeColumn + 1} selected
        </p>
      </div>

      {/* Grid Column Selector */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid divide-x divide-border" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
          {Array(columnCount)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveColumn(i);
                  setSelectedColumnBlockId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveColumn(i);
                    setSelectedColumnBlockId(null);
                  }
                }}
                className={`min-h-[100px] cursor-pointer p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${
                  activeColumn === i
                    ? 'bg-[#4F46E5]/8 dark:bg-[#4F46E5]/15'
                    : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div className="mb-2 text-center text-xs font-medium text-foreground">
                  Col {i + 1}{' '}
                  <span className="text-muted-foreground">
                    ({columns[i]?.length || 0})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {columns[i]?.map((columnBlock, blockIndex) => (
                    <div
                      key={columnBlock.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveColumn(i);
                        setSelectedColumnBlockId(columnBlock.id);
                        setActiveTab('content');
                      }}
                      className={`flex items-center justify-between rounded-md border bg-background p-1.5 text-xs transition-colors ${
                        selectedColumnBlock?.id === columnBlock.id
                          ? 'border-[#4F46E5] ring-1 ring-[#4F46E5]'
                          : 'border-border hover:border-foreground/30'
                      }`}
                    >
                      <span className="flex items-center gap-1 truncate capitalize text-foreground">
                        <span className="text-[#4F46E5] dark:text-[#818CF8]">
                          {columnBlock.type === 'text' && <AlignLeft className="h-3 w-3" />}
                          {columnBlock.type === 'button' && <Link className="h-3 w-3" />}
                          {columnBlock.type === 'image' && <ImageIcon className="h-3 w-3" />}
                          {columnBlock.type === 'header' && <Type className="h-3 w-3" />}
                          {columnBlock.type === 'spacer' && <MinusIcon className="h-3 w-3" />}
                          {columnBlock.type === 'card' && <Square className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{columnBlock.type}</span>
                      </span>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`Edit ${columnBlock.type} content`}
                          title="Edit Content"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-[#4F46E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColumn(i);
                            setSelectedColumnBlockId(columnBlock.id);
                            setActiveTab('content');
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${columnBlock.type} style`}
                          title="Edit Style"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-[#4F46E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColumn(i);
                            setSelectedColumnBlockId(columnBlock.id);
                            setActiveTab('style');
                          }}
                        >
                          <Palette className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${columnBlock.type} from column ${i + 1}`}
                          title="Remove"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlockFromColumn(i, blockIndex);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add or Edit Column Component */}
      <div className="w-full overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 border-b border-border">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              !selectedColumnBlock
                ? 'bg-muted text-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
            onClick={() => setSelectedColumnBlockId(null)}
          >
            Add Components
          </button>
          <button
            type="button"
            disabled={!selectedColumnBlock}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              selectedColumnBlock
                ? 'bg-muted text-foreground'
                : 'cursor-not-allowed bg-card text-muted-foreground/50'
            }`}
            onClick={() => {}}
          >
            Edit Component
          </button>
        </div>

        {!selectedColumnBlock ? (
          <div className="p-4">
            <span className="block text-xs font-medium text-muted-foreground">
              Add to Column {activeColumn + 1}
            </span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {componentTypes.map((componentType) => (
                <Button
                  key={componentType.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBlockToColumn(activeColumn, componentType.type)}
                  className="gap-1.5 text-xs"
                >
                  {componentType.icon}
                  <span>{componentType.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'content' | 'style')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>
            </Tabs>

            <div>
              {activeTab === 'content' ? (
                <ContentEditor
                  block={selectedColumnBlock}
                  onUpdateContent={(id, content) => updateColumnBlockContent(id, content)}
                />
              ) : (
                <StyleEditor
                  block={selectedColumnBlock}
                  onUpdateStyle={(id, styles) => updateColumnBlockStyle(id, styles)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
