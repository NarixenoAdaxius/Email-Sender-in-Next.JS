"use client";

import React from 'react';
import { BlockContent, TemplateBlock } from '../types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash } from 'lucide-react';

interface ListContentEditorProps {
  block: TemplateBlock;
  onUpdateContent: (id: string, content: Partial<BlockContent>) => void;
}

export function ListContentEditor({ block, onUpdateContent }: ListContentEditorProps) {
  const listItems = block.content.items || [];
  const listType = block.content.listType || 'unordered';

  const handleAddItem = () => {
    const newItems = [...listItems, ''];
    onUpdateContent(block.id, { items: newItems });
  };

  const handleUpdateItem = (index: number, value: string) => {
    const newItems = [...listItems];
    newItems[index] = value;
    onUpdateContent(block.id, { items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = listItems.filter((_, i) => i !== index);
    onUpdateContent(block.id, { items: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">List Style</span>
        <Tabs
          value={listType}
          onValueChange={(value) => onUpdateContent(block.id, { listType: value })}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unordered">Bullet List</TabsTrigger>
            <TabsTrigger value="ordered">Numbered List</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-foreground">List Items</span>

        {listItems.map((item, index) => {
          const itemId = `list-item-${block.id}-${index}`;
          return (
            <div key={index} className="flex items-center gap-2">
              <Label htmlFor={itemId} className="sr-only">
                List item {index + 1}
              </Label>
              <Input
                id={itemId}
                name={`listItem_${index}`}
                type="text"
                value={item}
                onChange={(e) => handleUpdateItem(index, e.target.value)}
                placeholder={`Item ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove list item ${index + 1}`}
                onClick={() => handleRemoveItem(index)}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="mt-2 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>
    </div>
  );
}
