"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { TemplateSettings } from './TemplateSettings';
import { BlockToolbar } from './BlockToolbar';
import { EmailPreview } from './EmailPreview';
import { BlockEditor } from './BlockEditor';
import { Button } from '@/components/ui/button';
import {
  defaultBlocks,
  getDefaultContentForType,
  getDefaultStylesForType,
  extractVariables,
  generateHtml,
} from './utils';
import {
  BlockContent,
  BlockType,
  TemplateBlock,
  VisualTemplate,
  VisualTemplateBuilderProps,
} from './types';

export function VisualTemplateBuilder({ templateId, onSave }: VisualTemplateBuilderProps) {
  const router = useRouter();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = useState<{ block: TemplateBlock; index: number } | null>(
    null
  );

  const [template, setTemplate] = useState<VisualTemplate>({
    name: '',
    description: '',
    subject: '',
    blocks: defaultBlocks,
    variables: ['senderName', 'name', 'actionLink'],
    isPublic: false,
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate(templateId);
    }
  }, [templateId]);

  const fetchTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/templates/${id}`);

      if (!response.ok) {
        let errorMessage = 'Failed to fetch template';
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const loaded = data.template;

      if (loaded?.blocks && Array.isArray(loaded.blocks) && loaded.blocks.length > 0) {
        setTemplate({
          name: loaded.name || '',
          description: loaded.description || '',
          subject: loaded.subject || '',
          blocks: loaded.blocks,
          variables: extractVariables(loaded.blocks, loaded.subject || ''),
          isPublic: Boolean(loaded.isPublic),
          html: loaded.html,
        });
      } else if (loaded?.html) {
        const convertedBlocks: TemplateBlock[] = [
          {
            id: `header-${Date.now()}`,
            type: 'header',
            content: { text: 'Template Header' },
            styles: getDefaultStylesForType('header'),
          },
          {
            id: `text-${Date.now() + 1}`,
            type: 'text',
            content: {
              text: 'This template was imported from HTML code. You can edit it below using visual blocks.',
            },
            styles: getDefaultStylesForType('text'),
          },
          {
            id: `text-html-${Date.now() + 2}`,
            type: 'text',
            content: {
              text: 'Note: To preserve custom raw HTML structure, you can also open this template in the HTML editor.',
            },
            styles: getDefaultStylesForType('text'),
          },
        ];

        setTemplate({
          name: loaded.name || '',
          description: loaded.description || '',
          subject: loaded.subject || '',
          blocks: convertedBlocks,
          variables: extractVariables(convertedBlocks, loaded.subject || ''),
          isPublic: Boolean(loaded.isPublic),
          html: loaded.html,
        });

        toast.info('Template was originally created in HTML editor. Basic conversion applied.', {
          autoClose: 5000,
        });
      } else {
        setTemplate({
          name: loaded?.name || '',
          description: loaded?.description || '',
          subject: loaded?.subject || '',
          blocks: defaultBlocks,
          variables: extractVariables(defaultBlocks, loaded?.subject || ''),
          isPublic: Boolean(loaded?.isPublic),
        });
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error loading template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (changes: Partial<VisualTemplate>) => {
    setTemplate((prev) => {
      const nextSubject = changes.subject !== undefined ? changes.subject : prev.subject;
      const nextVariables =
        changes.subject !== undefined
          ? extractVariables(prev.blocks, nextSubject)
          : prev.variables;
      return { ...prev, ...changes, variables: nextVariables };
    });
  };

  const addBlock = (type: BlockType) => {
    const newBlock: TemplateBlock = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContentForType(type),
      styles: getDefaultStylesForType(type),
    };

    setTemplate((prev) => {
      const updatedBlocks = [...prev.blocks, newBlock];
      return {
        ...prev,
        blocks: updatedBlocks,
        variables: extractVariables(updatedBlocks, prev.subject),
      };
    });

    setActiveBlock(newBlock.id);
  };

  const undoRemoveBlock = useCallback((blockToRestore: TemplateBlock, index: number) => {
    setTemplate((prev) => {
      if (prev.blocks.some((b) => b.id === blockToRestore.id)) {
        return prev;
      }
      const nextBlocks = [...prev.blocks];
      const insertAt = Math.min(Math.max(index, 0), nextBlocks.length);
      nextBlocks.splice(insertAt, 0, blockToRestore);
      return {
        ...prev,
        blocks: nextBlocks,
        variables: extractVariables(nextBlocks, prev.subject),
      };
    });
    setActiveBlock(blockToRestore.id);
    setLastRemoved(null);
  }, []);

  const removeBlock = (id: string) => {
    const removedIndex = template.blocks.findIndex((block) => block.id === id);
    if (removedIndex === -1) return;
    const removedBlock = template.blocks[removedIndex];

    setTemplate((prev) => {
      const updatedBlocks = prev.blocks.filter((block) => block.id !== id);
      return {
        ...prev,
        blocks: updatedBlocks,
        variables: extractVariables(updatedBlocks, prev.subject),
      };
    });

    if (activeBlock === id) {
      setActiveBlock(null);
    }

    setLastRemoved({ block: removedBlock, index: removedIndex });
  };

  const duplicateBlock = (id: string) => {
    setTemplate((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const original = prev.blocks[idx];
      const clonedContent = JSON.parse(JSON.stringify(original.content)) as BlockContent;
      if (Array.isArray(clonedContent.columns)) {
        clonedContent.columns = clonedContent.columns.map((col) =>
          col.map((nested) => ({
            ...nested,
            id: nanoid(),
            content: { ...nested.content },
            styles: { ...nested.styles },
          }))
        );
      }

      const clone: TemplateBlock = {
        ...original,
        id: `${original.type}-${nanoid(8)}`,
        content: clonedContent,
        styles: { ...original.styles },
      };
      const updatedBlocks = [
        ...prev.blocks.slice(0, idx + 1),
        clone,
        ...prev.blocks.slice(idx + 1),
      ];
      setActiveBlock(clone.id);
      return {
        ...prev,
        blocks: updatedBlocks,
        variables: extractVariables(updatedBlocks, prev.subject),
      };
    });
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setTemplate((prev) => {
      const index = prev.blocks.findIndex((block) => block.id === id);
      if (index === -1) return prev;

      const newBlocks = [...prev.blocks];
      if (direction === 'up' && index > 0) {
        [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      } else if (direction === 'down' && index < newBlocks.length - 1) {
        [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      }

      return { ...prev, blocks: newBlocks };
    });
  };

  const reorderBlocks = (reorderedBlocks: TemplateBlock[]) => {
    setTemplate((prev) => ({
      ...prev,
      blocks: reorderedBlocks,
    }));
  };

  const updateBlockContent = useCallback((id: string, content: Partial<BlockContent>) => {
    setTemplate((prev) => {
      const updatedBlocks = prev.blocks.map((block) =>
        block.id === id ? { ...block, content: { ...block.content, ...content } } : block
      );
      return {
        ...prev,
        blocks: updatedBlocks,
        variables: extractVariables(updatedBlocks, prev.subject),
      };
    });
  }, []);

  const updateBlockStyle = useCallback((id: string, styles: Record<string, string>) => {
    setTemplate((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) =>
        block.id === id ? { ...block, styles: { ...block.styles, ...styles } } : block
      ),
    }));
  }, []);

  const getActiveBlock = () => {
    if (!activeBlock) return null;
    return template.blocks.find((block) => block.id === activeBlock) || null;
  };

  const isFormValid = () =>
    template.name.trim() !== '' &&
    template.subject.trim() !== '' &&
    template.blocks.length > 0;

  const handleSave = async () => {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('Template Name is required');
    }

    if (!template.subject.trim()) {
      errors.push('Email Subject is required');
    }

    if (template.blocks.length === 0) {
      errors.push('At least one content block is required');
    }

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    try {
      setIsSaving(true);

      const generatedHtml = generateHtml(template.blocks);
      const variables = Array.from(
        new Set([...extractVariables(template.blocks, template.subject), 'senderName'])
      );

      const templateData = {
        name: template.name.trim(),
        description:
          template.description?.trim() || template.subject.trim() || template.name.trim(),
        subject: template.subject.trim(),
        content: generatedHtml,
        html: generatedHtml,
        blocks: template.blocks,
        variables,
        isPublic: Boolean(template.isPublic),
      };

      const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
      const method = templateId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore non-JSON error responses
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      toast.success(templateId ? 'Template updated successfully' : 'Template created successfully');

      if (onSave) {
        onSave(data.template);
      } else {
        router.push('/dashboard/templates');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="h-48 animate-pulse motion-reduce:animate-none rounded-xl border border-border bg-card" />
        <div className="h-96 animate-pulse motion-reduce:animate-none rounded-xl border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <TemplateSettings template={template} onChange={handleTemplateChange} />

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <BlockToolbar onAddBlock={addBlock} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <EmailPreview
              blocks={template.blocks}
              activeBlock={activeBlock}
              onSelectBlock={setActiveBlock}
              onMoveBlock={moveBlock}
              onRemoveBlock={removeBlock}
              onReorderBlocks={reorderBlocks}
              onDuplicateBlock={duplicateBlock}
            />

            <AnimatePresence initial={false}>
              {lastRemoved && (
                <motion.div
                  key={lastRemoved.block.id}
                  role="status"
                  aria-live="polite"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.12 }
                      : { type: 'spring', bounce: 0, duration: 0.25 }
                  }
                  className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/60 px-3.5 py-2 text-xs text-foreground"
                >
                  <span>
                    Removed <strong className="font-medium">{lastRemoved.block.type}</strong> block.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => undoRemoveBlock(lastRemoved.block, lastRemoved.index)}
                      className="h-7 px-2.5 text-xs"
                    >
                      Undo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setLastRemoved(null)}
                      className="h-7 px-2 text-xs text-muted-foreground"
                    >
                      Dismiss
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {template.blocks.length === 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">No content blocks added</p>
                <p className="mt-1 text-xs">
                  Use the block toolbar above to add elements to your template.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <BlockEditor
              block={getActiveBlock()}
              onUpdateContent={updateBlockContent}
              onUpdateStyle={updateBlockStyle}
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar with clear separation from viewport edge & DevTools badge */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          {!isFormValid() ? (
            <div className="text-sm text-destructive" role="status" aria-live="polite">
              <span className="font-medium">Please fix the following:</span>
              <ul className="mt-1 list-inside list-disc text-xs">
                {template.name.trim() === '' && <li>Template name is required</li>}
                {template.subject.trim() === '' && <li>Email subject is required</li>}
                {template.blocks.length === 0 && <li>Add at least one content block</li>}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ready to save ({template.blocks.length}{' '}
              {template.blocks.length === 1 ? 'block' : 'blocks'})
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isFormValid()}
            className="h-10 bg-[#4F46E5] px-5 text-white hover:bg-[#4338CA] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VisualTemplateBuilder;
