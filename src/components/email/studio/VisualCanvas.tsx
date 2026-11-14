"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Reorder,
  useDragControls,
  useReducedMotion,
} from 'motion/react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Code2,
  Copy,
  GripVertical,
  Play,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSafeImageSrc } from '../visual-builder/utils';
import { EmailTheme, TemplateBlock, ViewportMode } from './types';

interface VisualCanvasProps {
  blocks: TemplateBlock[];
  theme: EmailTheme;
  viewport: ViewportMode;
  darkModePreview: boolean;
  useSampleData: boolean;
  sampleData: Record<string, string>;
  activeBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onReorderBlocks: (blocks: TemplateBlock[]) => void;
  onDuplicateBlock: (id: string) => void;
  onRemoveBlock: (id: string) => void;
  onInspectCodeForBlock?: (id: string) => void;
}

const substituteSample = (
  text: string | undefined,
  sampleData: Record<string, string>,
  enabled: boolean
): string => {
  const raw = text || '';
  if (!enabled) return raw;
  return raw.replace(/\{\{([^{}]+)\}\}/g, (full, key: string) => {
    const trimmed = key.trim();
    const val = sampleData[trimmed];
    return val !== undefined && val !== '' ? val : full;
  });
};

interface CanvasBlockItemProps {
  block: TemplateBlock;
  index: number;
  total: number;
  isActive: boolean;
  theme: EmailTheme;
  darkModePreview: boolean;
  useSampleData: boolean;
  sampleData: Record<string, string>;
  prefersReducedMotion: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onInspectCode?: (id: string) => void;
}

function renderBlockPreview(
  block: TemplateBlock,
  theme: EmailTheme,
  darkModePreview: boolean,
  useSampleData: boolean,
  sampleData: Record<string, string>
): React.ReactNode {
  const sub = (t?: string) => substituteSample(t, sampleData, useSampleData);
  const styles = block.styles || {};
  const content = block.content || {};

  switch (block.type) {
    case 'header':
      return (
        <div
          style={{
            fontFamily: theme.fontFamily,
            ...styles,
          }}
        >
          {sub(content.text || 'Header')}
        </div>
      );

    case 'text':
      return (
        <div
          style={{
            fontFamily: theme.fontFamily,
            color: darkModePreview ? '#e4e4e7' : theme.textColor,
            whiteSpace: 'pre-line',
            ...styles,
            ...(darkModePreview && !styles.backgroundColor ? { color: '#e4e4e7' } : {}),
          }}
        >
          {sub(content.text || '')}
        </div>
      );

    case 'button':
      return (
        <div style={{ textAlign: (styles.textAlign as 'left' | 'center' | 'right') || 'center', padding: '12px 20px' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: styles.backgroundColor || theme.primaryColor,
              color: styles.color || '#ffffff',
              padding: styles.padding || '12px 24px',
              borderRadius: styles.borderRadius || '6px',
              fontWeight: styles.fontWeight || '600',
              fontSize: styles.fontSize || '15px',
              fontFamily: styles.fontFamily || theme.fontFamily,
              textDecoration: 'none',
            }}
          >
            {sub(content.text || 'Click Here')}
          </span>
        </div>
      );

    case 'image': {
      const safeSrc = isSafeImageSrc(content.src) ? content.src!.trim() : '';
      return (
        <div style={{ padding: '8px 20px', textAlign: (styles.textAlign as 'left' | 'center' | 'right') || 'center' }}>
          {safeSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeSrc}
              alt={content.alt || 'Image'}
              style={{ maxWidth: '100%', height: 'auto', display: 'inline-block', borderRadius: styles.borderRadius || '4px' }}
            />
          ) : (
            <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100 text-xs text-zinc-600">
              Image placeholder — paste or upload an image in the Inspector
            </div>
          )}
        </div>
      );
    }

    case 'spacer':
      return (
        <div
          style={{ height: content.height || '24px' }}
          className="flex items-center justify-center border border-dashed border-transparent text-xs text-zinc-600 hover:border-zinc-300"
        >
          Spacer ({content.height || '24px'})
        </div>
      );

    case 'divider':
      return (
        <div style={{ padding: '12px 20px' }}>
          <hr
            style={{
              border: 0,
              borderTop: `${content.thickness || '1px'} solid ${content.color || '#e5e7eb'}`,
              margin: 0,
            }}
          />
        </div>
      );

    case 'quote':
      return (
        <blockquote
          style={{
            borderLeft: `4px solid ${theme.primaryColor}`,
            padding: '12px 20px',
            margin: '12px 20px',
            backgroundColor: darkModePreview ? '#27272a' : '#f9fafb',
            fontStyle: 'italic',
            fontFamily: theme.fontFamily,
            ...styles,
          }}
        >
          <p className="m-0">{sub(content.text || '')}</p>
          {(content.quoteAuthor || content.citation) && (
            <div className={cn('mt-2 text-xs font-semibold not-italic', darkModePreview ? 'text-zinc-300' : 'text-zinc-600')}>
              — {sub(content.quoteAuthor || content.citation)}
            </div>
          )}
        </blockquote>
      );

    case 'list': {
      const Tag = content.listType === 'ordered' ? 'ol' : 'ul';
      return (
        <Tag
          style={{
            padding: '12px 20px 12px 40px',
            margin: 0,
            fontFamily: theme.fontFamily,
            color: darkModePreview ? '#e4e4e7' : theme.textColor,
            ...styles,
          }}
          className={content.listType === 'ordered' ? 'list-decimal' : 'list-disc'}
        >
          {(content.items || []).map((item, idx) => (
            <li key={idx} className="mb-1">
              {sub(item)}
            </li>
          ))}
        </Tag>
      );
    }

    case 'social':
      return (
        <div style={{ padding: '16px 20px', textAlign: 'center' }}>
          {(content.socialLinks || []).map((link, idx) => (
            <span
              key={`${link.platform}-${idx}`}
              style={{ backgroundColor: theme.primaryColor }}
              className="mx-1 my-1 inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white capitalize"
            >
              {link.platform}
            </span>
          ))}
        </div>
      );

    case 'video':
      return (
        <div className="mx-5 my-3 rounded-lg bg-zinc-900 p-5 text-center text-white">
          <p className="mb-3 text-sm font-semibold">{sub(content.title || 'Watch Video')}</p>
          <span
            style={{ backgroundColor: theme.primaryColor }}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5" />
            Watch Video
          </span>
        </div>
      );

    case 'card':
      return (
        <div
          style={{
            margin: '12px 20px',
            padding: content.padding || '20px',
            backgroundColor: darkModePreview ? '#27272a' : content.backgroundColor || '#ffffff',
            border: `1px solid ${darkModePreview ? '#3f3f46' : content.borderColor || '#e5e7eb'}`,
            borderRadius: '8px',
            fontFamily: theme.fontFamily,
          }}
        >
          <h3 className="m-0 mb-2 text-base font-semibold">{sub(content.title || 'Card Title')}</h3>
          <p className="m-0 text-sm opacity-80">{sub(content.description || '')}</p>
        </div>
      );

    case 'section':
      return (
        <div
          style={{
            padding: content.padding || '24px',
            backgroundColor: darkModePreview ? '#27272a' : content.backgroundColor || '#f9fafb',
            textAlign: 'center',
            fontFamily: theme.fontFamily,
          }}
        >
          <h2 className="m-0 text-lg font-semibold">{sub(content.title || 'Section Title')}</h2>
        </div>
      );

    case 'grid-1-column':
    case 'grid-2-column':
    case 'grid-3-column': {
      const cols = content.columns || [[]];
      return (
        <div
          className={cn(
            'grid gap-2 p-2',
            cols.length === 1 && 'grid-cols-1',
            cols.length === 2 && 'grid-cols-1 sm:grid-cols-2',
            cols.length === 3 && 'grid-cols-1 sm:grid-cols-3'
          )}
        >
          {cols.map((colBlocks, colIdx) => (
            <div
              key={colIdx}
              className="min-h-[60px] rounded border border-dashed border-zinc-300/80 p-1"
            >
              {(colBlocks || []).length === 0 ? (
                <div className="flex h-full min-h-[52px] items-center justify-center text-xs text-zinc-600">
                  Col {colIdx + 1}
                </div>
              ) : (
                colBlocks.map((child) => (
                  <div key={child.id}>
                    {renderBlockPreview(child, theme, darkModePreview, useSampleData, sampleData)}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      );
    }

    case 'custom-html':
      return (
        <div className="border-y border-dashed border-indigo-400/50 bg-indigo-50/30 p-3 dark:bg-indigo-950/20">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            <Code2 className="h-3 w-3" />
            Custom HTML Block
          </div>
          <iframe
            title={`Custom HTML block ${block.id}`}
            sandbox=""
            srcDoc={content.html || ''}
            className="h-28 w-full rounded border border-border/50 bg-white"
          />
        </div>
      );

    default:
      return null;
  }
}

const CanvasBlockItem = memo(function CanvasBlockItem({
  block,
  index,
  total,
  isActive,
  theme,
  darkModePreview,
  useSampleData,
  sampleData,
  prefersReducedMotion,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
  onInspectCode,
}: CanvasBlockItemProps) {
  const dragControls = useDragControls();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (movedRef.current) {
      movedRef.current = false;
      itemRef.current?.focus({ preventScroll: false });
    }
  }, [index]);

  const requestMove = (direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === total - 1) return;
    movedRef.current = true;
    onMove(block.id, direction);
  };

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      role="listitem"
      transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', bounce: 0, duration: 0.25 }}
      className="group relative"
    >
      <div
        ref={itemRef}
        tabIndex={0}
        role="group"
        aria-label={`${block.type} block ${index + 1} of ${total}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        onKeyDown={(e) => {
          if (e.altKey && e.key === 'ArrowUp') {
            e.preventDefault();
            requestMove('up');
          } else if (e.altKey && e.key === 'ArrowDown') {
            e.preventDefault();
            requestMove('down');
          } else if (e.key === 'Enter' || e.key === ' ') {
            if (e.target === itemRef.current) {
              e.preventDefault();
              onSelect(block.id);
            }
          }
        }}
        className={cn(
          'relative cursor-pointer transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]',
          isActive
            ? 'ring-2 ring-[#4F46E5] ring-inset'
            : 'hover:ring-1 hover:ring-[#4F46E5]/50 hover:ring-inset'
        )}
      >
        {/* Floating Action Pill */}
        <div
          className={cn(
            'absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-full border border-border bg-background/90 px-1.5 py-0.5 shadow-sm backdrop-blur-md transition-opacity',
            isActive
              ? 'opacity-100'
              : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-compact="true"
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-compact="true"
            disabled={index === 0}
            onClick={() => requestMove('up')}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            title="Move up (Alt + Up)"
            aria-label="Move block up"
          >
            <ArrowUpIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-compact="true"
            disabled={index === total - 1}
            onClick={() => requestMove('down')}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            title="Move down (Alt + Down)"
            aria-label="Move block down"
          >
            <ArrowDownIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-compact="true"
            onClick={() => onDuplicate(block.id)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Duplicate block"
            aria-label="Duplicate block"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {onInspectCode && (
            <button
              type="button"
              data-compact="true"
              onClick={() => onInspectCode(block.id)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Open in Split Code view"
              aria-label="Open in Split Code view"
            >
              <Code2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            data-compact="true"
            onClick={() => onRemove(block.id)}
            className="rounded p-1 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            title="Delete block"
            aria-label="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {renderBlockPreview(block, theme, darkModePreview, useSampleData, sampleData)}
      </div>
    </Reorder.Item>
  );
});

export const VisualCanvas = memo(function VisualCanvas({
  blocks,
  theme,
  viewport,
  darkModePreview,
  useSampleData,
  sampleData,
  activeBlockId,
  onSelectBlock,
  onMoveBlock,
  onReorderBlocks,
  onDuplicateBlock,
  onRemoveBlock,
  onInspectCodeForBlock,
}: VisualCanvasProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [liveMessage, setLiveMessage] = useState('');

  const handleMove = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= blocks.length) return;
      setLiveMessage(`Moved ${blocks[idx].type} block to position ${targetIdx + 1} of ${blocks.length}.`);
      onMoveBlock(id, direction);
    },
    [blocks, onMoveBlock]
  );

  const containerWidth = viewport === 'mobile' ? 375 : theme.contentWidth;

  return (
    <div
      onClick={() => onSelectBlock(null)}
      style={{ backgroundColor: darkModePreview ? '#09090b' : theme.canvasBg }}
      className="flex min-h-full flex-1 justify-center overflow-y-auto px-4 py-8 pb-24 transition-colors motion-reduce:transition-none lg:pb-8"
    >
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: `${containerWidth}px`,
          backgroundColor: darkModePreview ? '#18181b' : theme.contentBg,
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          color: darkModePreview ? '#f4f4f5' : theme.textColor,
        }}
        className="h-fit overflow-hidden shadow-md ring-1 ring-black/5 transition-all motion-reduce:transition-none"
      >
        {blocks.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground">Your email canvas is empty</p>
            <p className="mt-1 max-w-xs text-xs">
              Pick a block or section from the left rail, or choose a Starter Template to begin.
            </p>
          </div>
        ) : (
          <Reorder.Group
            as="div"
            role="list"
            aria-label="Email blocks"
            axis="y"
            values={blocks}
            onReorder={onReorderBlocks}
            className="flex flex-col"
          >
            {blocks.map((block, index) => (
              <CanvasBlockItem
                key={block.id}
                block={block}
                index={index}
                total={blocks.length}
                isActive={activeBlockId === block.id}
                theme={theme}
                darkModePreview={darkModePreview}
                useSampleData={useSampleData}
                sampleData={sampleData}
                prefersReducedMotion={prefersReducedMotion}
                onSelect={onSelectBlock}
                onMove={handleMove}
                onDuplicate={onDuplicateBlock}
                onRemove={onRemoveBlock}
                onInspectCode={onInspectCodeForBlock}
              />
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
});
