"use client";

import React from 'react';
import { VisualTemplate } from './types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface TemplateSettingsProps {
  template: VisualTemplate;
  onChange: (template: Partial<VisualTemplate>) => void;
}

export function TemplateSettings({ template, onChange }: TemplateSettingsProps) {
  const nameMissing = template.name.trim() === '';
  const subjectMissing = template.subject.trim() === '';

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="visual-template-name" className="flex items-center gap-1.5 text-foreground">
              <span>Template Name</span>
              <span className="text-destructive" aria-hidden="true">*</span>
              {nameMissing && (
                <span className="ml-auto text-xs font-normal text-destructive">Required</span>
              )}
            </Label>
            <Input
              type="text"
              id="visual-template-name"
              name="name"
              value={template.name}
              onChange={handleInputChange}
              aria-invalid={nameMissing}
              className={nameMissing ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}
              placeholder="e.g., Welcome Email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visual-template-description" className="text-foreground">
              Description <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="visual-template-description"
              name="description"
              value={template.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Brief description of this template"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visual-template-subject" className="flex items-center gap-1.5 text-foreground">
              <span>Email Subject</span>
              <span className="text-destructive" aria-hidden="true">*</span>
              {subjectMissing && (
                <span className="ml-auto text-xs font-normal text-destructive">Required</span>
              )}
            </Label>
            <Input
              type="text"
              id="visual-template-subject"
              name="subject"
              value={template.subject}
              onChange={handleInputChange}
              aria-invalid={subjectMissing}
              className={subjectMissing ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}
              placeholder="e.g., Welcome to Our Service!"
              required
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex h-5 items-center">
              <Switch
                id="visual-template-isPublic"
                checked={template.isPublic}
                onCheckedChange={(checked) => onChange({ isPublic: checked })}
              />
            </div>
            <div className="text-sm leading-tight">
              <Label htmlFor="visual-template-isPublic" className="cursor-pointer font-medium text-foreground">
                Make this template public
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Public templates are visible to other users across the workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-foreground">
              Detected Variables
            </span>
            <div className="rounded-lg border border-border bg-muted/40 p-3.5">
              {template.variables.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-xs font-medium ${
                        variable === 'senderName'
                          ? 'border-[#4F46E5]/30 bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#818CF8]'
                          : 'border-border bg-card text-foreground'
                      }`}
                    >
                      {variable}
                      {variable === 'senderName' && (
                        <span className="ml-1 opacity-80" title="Used for From field in emails">
                          *
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No variables detected. Add placeholders like{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{'{{variableName}}'}</code>{' '}
                  in your blocks.
                </p>
              )}
              <p className="mt-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">senderName</span> is included automatically and sets the sender display name.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-4">
            <h3 className="text-sm font-semibold text-foreground">Template Checklist</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>
                Fields marked with <span className="text-destructive">*</span> are required
              </li>
              <li>Include at least one content block in your email layout</li>
              <li>Drag blocks or use the arrow buttons to reorder sections cleanly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
