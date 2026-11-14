"use client";

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  Reorder,
  useDragControls,
  useReducedMotion,
} from 'motion/react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  Copy,
  GripVertical,
  Play,
  Trash2,
} from 'lucide-react';
import { TemplateBlock } from './types';
import { isSafeImageSrc } from './utils';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPinterest,
  FaTiktok,
  FaSnapchat,
  FaGithub,
  FaGlobe,
  FaDiscord,
  FaReddit,
  FaTwitch,
  FaWhatsapp,
  FaTelegram,
} from 'react-icons/fa';

interface EmailPreviewProps {
  blocks: TemplateBlock[];
  activeBlock: string | null;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onRemoveBlock: (id: string) => void;
  onReorderBlocks?: (blocks: TemplateBlock[]) => void;
  onDuplicateBlock?: (id: string) => void;
}

const getSocialIcon = (platform: string) => {
  switch (platform) {
    case 'facebook':
      return <FaFacebook size={20} color="#1877F2" />;
    case 'twitter':
      return <FaTwitter size={20} color="#1DA1F2" />;
    case 'instagram':
      return <FaInstagram size={20} color="#E1306C" />;
    case 'linkedin':
      return <FaLinkedin size={20} color="#0077B5" />;
    case 'youtube':
      return <FaYoutube size={20} color="#FF0000" />;
    case 'pinterest':
      return <FaPinterest size={20} color="#BD081C" />;
    case 'tiktok':
      return <FaTiktok size={20} color="#111827" />;
    case 'snapchat':
      return <FaSnapchat size={20} color="#D97706" />;
    case 'github':
      return <FaGithub size={20} color="#24292F" />;
    case 'discord':
      return <FaDiscord size={20} color="#5865F2" />;
    case 'reddit':
      return <FaReddit size={20} color="#FF4500" />;
    case 'twitch':
      return <FaTwitch size={20} color="#9146FF" />;
    case 'whatsapp':
      return <FaWhatsapp size={20} color="#25D366" />;
    case 'telegram':
      return <FaTelegram size={20} color="#0088CC" />;
    case 'website':
    default:
      return <FaGlobe size={20} color="#4F46E5" />;
  }
};

interface DraggableCanvasBlockProps {
  block: TemplateBlock;
  index: number;
  totalBlocks: number;
  isActive: boolean;
  prefersReducedMotion: boolean;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock?: (id: string) => void;
}

function DraggableCanvasBlock({
  block,
  index,
  totalBlocks,
  isActive,
  prefersReducedMotion,
  onSelectBlock,
  onMoveBlock,
  onRemoveBlock,
  onDuplicateBlock,
}: DraggableCanvasBlockProps) {
  const dragControls = useDragControls();
  const itemRef = useRef<HTMLDivElement | null>(null);
  const movedRef = useRef(false);

  // Keep keyboard focus on the block after it changes position.
  useLayoutEffect(() => {
    if (movedRef.current) {
      movedRef.current = false;
      itemRef.current?.focus({ preventScroll: false });
    }
  }, [index]);

  const requestMove = (direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === totalBlocks - 1) return;
    movedRef.current = true;
    onMoveBlock(block.id, direction);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    e.stopPropagation();
    requestMove(e.key === 'ArrowUp' ? 'up' : 'down');
  };

  const controlButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-[#4F46E5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] disabled:pointer-events-none disabled:opacity-35 transition-colors motion-reduce:transition-none';

  return (
    <Reorder.Item
      as="div"
      ref={itemRef}
      tabIndex={0}
      role="group"
      aria-roledescription="reorderable block"
      aria-label={`${block.type} block, position ${index + 1} of ${totalBlocks}. Alt plus arrow keys to move.`}
      onKeyDown={handleKeyDown}
      value={block}
      dragListener={false}
      dragControls={dragControls}
      layout
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.12 }
          : { type: 'spring', bounce: 0, duration: 0.32 }
      }
      whileDrag={
        prefersReducedMotion
          ? undefined
          : {
              scale: 1.01,
              boxShadow: '0 14px 32px rgba(15, 23, 42, 0.16)',
              zIndex: 30,
            }
      }
      onClick={() => onSelectBlock(block.id)}
      className={`group relative cursor-pointer rounded-md bg-white p-2 transition-[box-shadow,outline-color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#4F46E5] ${
        isActive
          ? 'outline-2 -outline-offset-2 outline-[#4F46E5] ring-2 ring-[#4F46E5]/15'
          : 'hover:outline-1 hover:-outline-offset-1 hover:outline-gray-300'
      }`}
    >
      {/* Floating block toolbar */}
      <div
        className={`absolute right-2 top-2 z-20 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white/95 p-0.5 shadow-sm backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none ${
          isActive
            ? 'opacity-100'
            : 'opacity-85 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <button
          type="button"
          aria-label={`Drag to reorder ${block.type} block`}
          title="Drag to reorder"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragControls.start(e);
          }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${block.type} block up`}
          title="Move block up"
          className={controlButtonClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            requestMove('up');
          }}
          disabled={index === 0}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Move ${block.type} block down`}
          title="Move block down"
          className={controlButtonClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            requestMove('down');
          }}
          disabled={index === totalBlocks - 1}
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        {onDuplicateBlock && (
          <button
            type="button"
            aria-label={`Duplicate ${block.type} block`}
            title="Duplicate block"
            className={controlButtonClass}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateBlock(block.id);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Delete ${block.type} block`}
          title="Delete block"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors motion-reduce:transition-none hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemoveBlock(block.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Block content */}
      {block.type === 'header' && (
        <div style={block.styles as React.CSSProperties}>
          <h1 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
            {block.content.text || ''}
          </h1>
        </div>
      )}

      {block.type === 'text' && (
        <div style={block.styles as React.CSSProperties}>
          {(block.content.text || '').split('\n').map((line: string, i: number) => (
            <p key={i} style={{ margin: line ? '0 0 8px 0' : '0 0 12px 0' }}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      )}

      {block.type === 'button' && (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <a
            href="#"
            style={block.styles as React.CSSProperties}
            onClick={(e) => e.preventDefault()}
          >
            {block.content.text || 'Button'}
          </a>
        </div>
      )}

      {block.type === 'image' && (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          {isSafeImageSrc(block.content.src) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.content.src!.trim()}
              alt={block.content.alt || ''}
              style={{ margin: '0 auto', ...(block.styles as React.CSSProperties) }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '140px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                color: '#4b5563',
                border: '1px dashed #d1d5db',
                fontSize: '14px',
              }}
            >
              Upload or paste an image URL
            </div>
          )}
        </div>
      )}

      {block.type === 'spacer' && (
        <div
          style={{
            height: block.content.height || '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="text-[10px] font-mono text-gray-300 select-none">
            spacer ({block.content.height || '20px'})
          </span>
        </div>
      )}

      {block.type === 'divider' && (
        <div style={{ padding: '10px 0' }}>
          <hr
            style={{
              border: 'none',
              borderTop: `${block.content.thickness || '1px'} solid ${block.content.color || '#e5e7eb'}`,
              margin: 0,
            }}
          />
        </div>
      )}

      {block.type === 'quote' && (
        <blockquote style={block.styles as React.CSSProperties}>
          {block.content.text || ''}
          {(block.content.quoteAuthor ?? block.content.citation) && (
            <footer style={{ marginTop: '10px', fontStyle: 'normal', fontWeight: 'bold' }}>
              — {block.content.quoteAuthor ?? block.content.citation}
            </footer>
          )}
        </blockquote>
      )}

      {block.type === 'list' &&
        (block.content.listType === 'ordered' ? (
          <ol
            style={{
              listStyleType: 'decimal',
              paddingLeft: '24px',
              ...(block.styles as React.CSSProperties),
            }}
          >
            {(block.content.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul
            style={{
              listStyleType: 'disc',
              paddingLeft: '24px',
              ...(block.styles as React.CSSProperties),
            }}
          >
            {(block.content.items || []).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ))}

      {block.type === 'social' && (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          {(block.content.socialLinks || []).map((link, i) => (
            <span
              key={i}
              style={{
                margin: '4px 6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {getSocialIcon(link.platform)}
              <span style={{ textTransform: 'capitalize' }}>{link.platform}</span>
            </span>
          ))}
        </div>
      )}

      {block.type === 'video' && (
        <div style={{ padding: '12px' }}>
          <div
            style={{
              backgroundColor: '#111827',
              borderRadius: '8px',
              padding: '24px 16px',
              textAlign: 'center',
              color: '#f9fafb',
              border: '1px solid #1f2937',
            }}
          >
            <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600 }}>
              {block.content.title || 'Video Presentation'}
            </p>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Watch Video
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            {block.content.videoUrl && (
              <p
                style={{
                  margin: '10px 0 0 0',
                  fontSize: '11px',
                  color: '#9ca3af',
                  wordBreak: 'break-all',
                }}
              >
                {block.content.videoUrl}
              </p>
            )}
          </div>
        </div>
      )}

      {block.type === 'card' && (
        <div
          style={{
            padding: block.content.padding || '16px',
            backgroundColor: block.content.backgroundColor || '#ffffff',
            border: `1px solid ${block.content.borderColor || '#e5e7eb'}`,
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            margin: '10px 0',
            width: '100%',
            boxSizing: 'border-box',
            display: 'block',
            ...(block.styles as React.CSSProperties),
          }}
        >
          {block.content.title && (
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
              {block.content.title}
            </h3>
          )}
          {block.content.description && (
            <p style={{ color: '#4b5563', margin: 0 }}>{block.content.description}</p>
          )}
        </div>
      )}

      {block.type === 'section' && (
        <div
          style={{
            padding: block.content.padding || '24px',
            backgroundColor: block.content.backgroundColor || '#f9fafb',
            margin: '10px 0',
            width: '100%',
            boxSizing: 'border-box',
            display: 'block',
            ...(block.styles as React.CSSProperties),
          }}
        >
          {block.content.title && (
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '0 0 14px 0',
                textAlign: 'center',
              }}
            >
              {block.content.title}
            </h2>
          )}
          <div
            style={{
              minHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed #d1d5db',
              borderRadius: '6px',
              padding: '12px',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '13px' }}>Section Content</span>
          </div>
        </div>
      )}

      {block.type.startsWith('grid-') && (
        <div>
          <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            border={0}
            style={block.styles as React.CSSProperties}
          >
            <tbody>
              <tr>
                {Array(
                  block.type === 'grid-1-column'
                    ? 1
                    : block.type === 'grid-2-column'
                      ? 2
                      : 3
                )
                  .fill(0)
                  .map((_, i) => {
                    const colCount =
                      block.type === 'grid-1-column'
                        ? 1
                        : block.type === 'grid-2-column'
                          ? 2
                          : 3;

                    return (
                      <td
                        key={i}
                        width={`${100 / colCount}%`}
                        style={{
                          padding: '10px',
                          verticalAlign: 'top',
                          backgroundColor: '#f9fafb',
                          border: '1px dashed #d1d5db',
                        }}
                      >
                        {block.content.columns &&
                        block.content.columns[i] &&
                        block.content.columns[i].length > 0 ? (
                          <div className="space-y-3">
                            {block.content.columns[i].map((columnBlock) => (
                              <div key={columnBlock.id} className="relative mb-3">
                                {columnBlock.type === 'header' && (
                                  <div style={columnBlock.styles as React.CSSProperties}>
                                    <h3 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>
                                      {columnBlock.content.text || ''}
                                    </h3>
                                  </div>
                                )}

                                {columnBlock.type === 'text' && (
                                  <div style={columnBlock.styles as React.CSSProperties}>
                                    {(columnBlock.content.text || '')
                                      .split('\n')
                                      .map((line: string, lineIdx: number) => (
                                        <p key={lineIdx} style={{ margin: '0 0 6px 0' }}>
                                          {line || '\u00A0'}
                                        </p>
                                      ))}
                                  </div>
                                )}

                                {columnBlock.type === 'button' && (
                                  <div style={{ textAlign: 'center', padding: '5px' }}>
                                    <a
                                      href="#"
                                      style={columnBlock.styles as React.CSSProperties}
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      {columnBlock.content.text || 'Button'}
                                    </a>
                                  </div>
                                )}

                                {columnBlock.type === 'image' && (
                                  isSafeImageSrc(columnBlock.content.src) ? (
                                    <div style={{ textAlign: 'center', padding: '5px' }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={columnBlock.content.src!.trim()}
                                        alt={columnBlock.content.alt || ''}
                                        style={{
                                          maxWidth: '100%',
                                          ...(columnBlock.styles as React.CSSProperties),
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs text-gray-600">
                                      Image placeholder
                                    </div>
                                  )
                                )}

                                {columnBlock.type === 'spacer' && (
                                  <div style={{ height: columnBlock.content.height || '20px' }} />
                                )}

                                {columnBlock.type === 'card' && (
                                  <div
                                    style={{
                                      padding: columnBlock.content.padding || '16px',
                                      backgroundColor: columnBlock.content.backgroundColor || '#ffffff',
                                      border: `1px solid ${columnBlock.content.borderColor || '#e5e7eb'}`,
                                      borderRadius: '8px',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                      margin: '10px 0',
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      display: 'block',
                                      ...(columnBlock.styles as React.CSSProperties),
                                    }}
                                  >
                                    {columnBlock.content.title && (
                                      <h3
                                        style={{
                                          fontSize: '18px',
                                          fontWeight: 'bold',
                                          margin: '0 0 8px 0',
                                        }}
                                      >
                                        {columnBlock.content.title}
                                      </h3>
                                    )}
                                    {columnBlock.content.description && (
                                      <p style={{ color: '#4b5563', margin: 0 }}>
                                        {columnBlock.content.description}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af', fontSize: '12px' }}>
                            Column {i + 1}
                          </div>
                        )}
                      </td>
                    );
                  })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Reorder.Item>
  );
}

export function EmailPreview({
  blocks,
  activeBlock,
  onSelectBlock,
  onMoveBlock,
  onRemoveBlock,
  onReorderBlocks,
  onDuplicateBlock,
}: EmailPreviewProps) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [announcement, setAnnouncement] = useState('');

  const handleReorder = (newOrder: TemplateBlock[]) => {
    if (onReorderBlocks) {
      onReorderBlocks(newOrder);
    }
  };

  const handleMoveWithAnnouncement = (id: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? idx - 1 : idx + 1;
    const block = blocks[idx];
    onMoveBlock(id, direction);
    setAnnouncement(
      `Moved ${block.type} block ${direction} to position ${targetIndex + 1} of ${blocks.length}.`
    );
  };

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-5">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div className="mb-2.5 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>Email Canvas (600px)</span>
        <span>Click to edit, drag grip or Alt+Arrows to reorder</span>
      </div>

      <div className="mx-auto max-w-[600px] overflow-x-auto rounded-lg border border-border bg-white text-[#111827] shadow-sm">
        {blocks.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-6 text-center text-gray-500">
            <p className="text-sm font-medium text-gray-700">Your canvas is empty</p>
            <p className="mt-1 text-xs text-gray-500">
              Select any block from the toolbar above to start building your email.
            </p>
          </div>
        ) : (
          <Reorder.Group
            as="div"
            axis="y"
            values={blocks}
            onReorder={handleReorder}
            className="grid min-h-[360px] grid-cols-1 gap-1 p-2"
          >
            <AnimatePresence initial={false}>
              {blocks.map((block, index) => (
                <DraggableCanvasBlock
                  key={block.id}
                  block={block}
                  index={index}
                  totalBlocks={blocks.length}
                  isActive={activeBlock === block.id}
                  prefersReducedMotion={prefersReducedMotion}
                  onSelectBlock={onSelectBlock}
                  onMoveBlock={handleMoveWithAnnouncement}
                  onRemoveBlock={onRemoveBlock}
                  onDuplicateBlock={onDuplicateBlock}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
