"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { TemplateSettings } from './TemplateSettings';
import { BlockToolbar } from './BlockToolbar';
import { EmailPreview } from './EmailPreview';
import { BlockEditor } from './BlockEditor';
import { 
  defaultBlocks, 
  getDefaultContentForType, 
  getDefaultStylesForType,
  extractVariables,
  generateHtml
} from './utils';
import { 
  BlockContent,
  BlockType,
  TemplateBlock, 
  VisualTemplate, 
  VisualTemplateBuilderProps 
} from './types';

export function VisualTemplateBuilder({ templateId, onSave }: VisualTemplateBuilderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  const [template, setTemplate] = useState<VisualTemplate>({
    name: '',
    description: '',
    subject: '',
    blocks: defaultBlocks,
    variables: ['name', 'actionLink', 'senderName'],
    isPublic: false
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate(templateId);
    }
  }, [templateId]);

  // Fetch existing template if editing
  const fetchTemplate = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/templates/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const data = await response.json();
      
      // Convert HTML template to blocks if it's a regular template
      if (data.template.html && !data.template.blocks) {
        // For now, just use default blocks when converting from HTML
        setTemplate({
          ...data.template,
          blocks: defaultBlocks
        });
      } else {
        setTemplate(data.template);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error loading template');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for template settings changes
  const handleTemplateChange = (changes: Partial<VisualTemplate>) => {
    setTemplate(prev => ({ ...prev, ...changes }));
  };

  // Add a new block
  const addBlock = (type: BlockType) => {
    const newBlock: TemplateBlock = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContentForType(type),
      styles: getDefaultStylesForType(type)
    };
    
    setTemplate(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
    
    setActiveBlock(newBlock.id);
  };

  // Remove a block
  const removeBlock = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== id)
    }));
    
    if (activeBlock === id) {
      setActiveBlock(null);
    }
  };

  // Move a block up or down
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = template.blocks.findIndex(block => block.id === id);
    if (index === -1) return;
    
    const newBlocks = [...template.blocks];
    
    if (direction === 'up' && index > 0) {
      // Swap with previous block
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      // Swap with next block
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    
    setTemplate(prev => ({
      ...prev,
      blocks: newBlocks
    }));
  };

  // Update block content
  const updateBlockContent = (id: string, content: Partial<BlockContent>) => {
    const updatedBlocks = template.blocks.map(block => 
      block.id === id ? { ...block, content: { ...block.content, ...content } } : block
    );
    
    setTemplate(prev => ({
      ...prev,
      blocks: updatedBlocks,
      variables: extractVariables(updatedBlocks)
    }));
  };

  // Update block style
  const updateBlockStyle = (id: string, styles: Record<string, string>) => {
    setTemplate(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === id ? { ...block, styles: { ...block.styles, ...styles } } : block
      )
    }));
  };

  // Get the active block
  const getActiveBlock = () => {
    if (!activeBlock) return null;
    return template.blocks.find(block => block.id === activeBlock) || null;
  };

  // Save the template
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Generate HTML from blocks
      const html = generateHtml(template.blocks);
      
      // Create the template data with HTML
      const templateData = {
        ...template,
        html,
        blocks: template.blocks
      };
      
      // Ensure senderName is always included
      if (!templateData.variables.includes('senderName')) {
        templateData.variables.push('senderName');
      }
      
      const url = templateId 
        ? `/api/templates/${templateId}` 
        : '/api/templates';
      
      const method = templateId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
      
      const data = await response.json();
      
      toast.success(templateId ? 'Template updated successfully' : 'Template created successfully');
      
      if (onSave) {
        onSave(data.template);
      } else {
        router.push('/dashboard/templates');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading template...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Template Settings */}
      <TemplateSettings 
        template={template} 
        onChange={handleTemplateChange} 
      />
      
      {/* Template Builder */}
      <div className="rounded-lg border border-gray-200 p-4">
        {/* Block Toolbar */}
        <BlockToolbar onAddBlock={addBlock} />
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Email preview */}
          <div className="col-span-3">
            <EmailPreview 
              blocks={template.blocks} 
              activeBlock={activeBlock}
              onSelectBlock={setActiveBlock}
              onMoveBlock={moveBlock}
              onRemoveBlock={removeBlock}
            />
          </div>
          
          {/* Block editor panel */}
          <div className="col-span-2">
            <BlockEditor 
              block={getActiveBlock()} 
              onUpdateContent={updateBlockContent}
              onUpdateStyle={updateBlockStyle}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {isSaving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}

export default VisualTemplateBuilder; 