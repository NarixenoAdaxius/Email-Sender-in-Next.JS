"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import TemplateEditor from './TemplateEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface TemplateBuilderProps {
  templateId?: string;
  onSave?: (template: Record<string, unknown>) => void;
}

interface TemplateState {
  name: string;
  description: string;
  subject: string;
  html: string;
  css: string;
  variables: string[];
  isPublic: boolean;
  blocks?: Record<string, unknown>[] | null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractVarsFromTemplate = (html: string, subject: string): string[] => {
  const variableRegex = /\{\{([^{}]+)\}\}/g;
  const eachRegex = /\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}/g;
  const found = new Set<string>(['senderName']);

  const collect = (text: string) => {
    for (const eachMatch of text.matchAll(eachRegex)) {
      if (eachMatch[1]) {
        found.add(eachMatch[1].trim());
      }
    }

    const matches = text.match(variableRegex) || [];
    matches.forEach((match) => {
      const name = match.replace(/\{\{|\}\}/g, '').trim();
      if (
        name &&
        !name.startsWith('#') &&
        !name.startsWith('/') &&
        !name.startsWith('this.') &&
        name !== 'this' &&
        name !== 'else'
      ) {
        found.add(name);
      }
    });
  };

  collect(html);
  collect(subject);
  return Array.from(found);
};

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ templateId, onSave }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [template, setTemplate] = useState<TemplateState>({
    name: '',
    description: '',
    subject: '',
    html: defaultTemplate,
    css: defaultCss,
    variables: ['senderName', 'name', 'actionLink'],
    isPublic: false,
    blocks: null,
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
      const loaded = data.template || {};
      const htmlValue = loaded.html || loaded.content || defaultTemplate;
      const subjectValue = loaded.subject || '';

      setTemplate({
        name: loaded.name || '',
        description: loaded.description || '',
        subject: subjectValue,
        html: htmlValue,
        css: loaded.css || defaultCss,
        variables: extractVarsFromTemplate(htmlValue, subjectValue),
        isPublic: Boolean(loaded.isPublic),
        blocks: loaded.blocks ?? null,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error loading template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTemplate((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'subject') {
        next.variables = extractVarsFromTemplate(prev.html, value);
      }
      return next;
    });
  };

  const handleHtmlChange = (html: string) => {
    setTemplate((prev) => ({
      ...prev,
      html,
      blocks: null,
      variables: extractVarsFromTemplate(html, prev.subject),
    }));
  };

  const isFormValid =
    template.name.trim() !== '' &&
    template.subject.trim() !== '' &&
    template.html.trim() !== '';

  const handleSave = async () => {
    if (!template.name.trim() || !template.subject.trim() || !template.html.trim()) {
      toast.error('Template Name, Subject, and HTML content are required.');
      return;
    }

    try {
      setIsSaving(true);

      const variables = extractVarsFromTemplate(template.html, template.subject);

      const templateToSave = {
        name: template.name.trim(),
        description:
          template.description.trim() || template.subject.trim() || template.name.trim(),
        subject: template.subject.trim(),
        html: template.html,
        content: template.html,
        css: template.css,
        variables,
        isPublic: Boolean(template.isPublic),
        blocks: template.blocks ?? null,
      };

      const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
      const method = templateId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateToSave),
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

      toast.success(
        templateId ? 'Template updated successfully' : 'Template created successfully'
      );

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

  const [debouncedHtml, setDebouncedHtml] = useState(template.html);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedHtml(template.html), 150);
    return () => window.clearTimeout(timer);
  }, [template.html]);

  const previewHtml = useMemo(() => {
    let html = debouncedHtml;
    template.variables.forEach((variable) => {
      const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(variable)}\\s*\\}\\}`, 'g');
      html = html.replace(regex, () => `[${variable}]`);
    });
    return html;
  }, [debouncedHtml, template.variables]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="h-64 animate-pulse motion-reduce:animate-none rounded-xl border border-border bg-card" />
        <div className="h-96 animate-pulse motion-reduce:animate-none rounded-xl border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div
        role="group"
        aria-label="Builder view"
        className="inline-flex w-full rounded-lg border border-border bg-muted/40 p-0.5 lg:hidden"
      >
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
              mobileTab === tab
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className={cn('min-w-0 space-y-4', mobileTab === 'preview' && 'hidden lg:block')}>
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="space-y-1.5">
            <Label htmlFor="html-template-name" className="text-foreground">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="html-template-name"
              name="name"
              value={template.name}
              onChange={handleInputChange}
              placeholder="e.g., Welcome Email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="html-template-description" className="text-foreground">
              Description{' '}
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="html-template-description"
              name="description"
              value={template.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Brief description of this template"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="html-template-subject" className="text-foreground">
              Email Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="html-template-subject"
              name="subject"
              value={template.subject}
              onChange={handleInputChange}
              placeholder="e.g., Welcome to Our Service!"
              required
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex h-5 items-center">
              <Switch
                id="html-template-isPublic"
                checked={template.isPublic}
                onCheckedChange={(checked) =>
                  setTemplate((prev) => ({ ...prev, isPublic: checked }))
                }
              />
            </div>
            <div className="text-sm leading-tight">
              <Label htmlFor="html-template-isPublic" className="cursor-pointer font-medium text-foreground">
                Make this template public
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Public templates are available to all users of the system.
              </p>
            </div>
          </div>
        </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="block text-sm font-medium text-foreground">
              Detected Variables
            </span>
            <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
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
                  No variables detected. Add variables using {'{{variableName}}'} syntax.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">senderName</span> is automatically
                included and used as the sender display name.
              </p>
            </div>
          </div>
        <div className="space-y-2">
          <TemplateEditor
            id="html-template-editor"
            initialContent={template.html}
            onChange={handleHtmlChange}
          />
          <p className="text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{'{{variableName}}'}</code> syntax for dynamic values.{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[#4F46E5] dark:text-[#818CF8]">{'{{senderName}}'}</code> sets the &ldquo;From&rdquo; name.
          </p>
        </div>
        </div>

        <div
          className={cn(
            'min-w-0 lg:sticky lg:top-4',
            mobileTab === 'edit' && 'hidden lg:block'
          )}
        >
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Preview
              </span>
              <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
                {([
                  { id: 'desktop', label: 'Desktop', Icon: Monitor },
                  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
                ] as const).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={`${label} preview`}
                    aria-pressed={viewport === id}
                    onClick={() => setViewport(id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
                      viewport === id
                        ? 'bg-[#4F46E5] text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 p-3">
              <div
                className={cn(
                  'mx-auto overflow-hidden rounded-lg border border-border bg-white shadow-xs transition-[max-width] duration-200 motion-reduce:transition-none',
                  viewport === 'mobile' ? 'max-w-[375px]' : 'w-full'
                )}
              >
                <iframe
                  title="Email Preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[60vh] min-h-[420px] w-full border-0 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          {!isFormValid ? (
            <p className="text-xs text-destructive">
              Please provide a template name, subject, and HTML content before saving.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Ready to save HTML template</p>
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
            disabled={isSaving || !isFormValid}
            className="h-10 bg-[#4F46E5] px-5 text-white hover:bg-[#4338CA] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333333;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #4f46e5; color: #ffffff; padding: 24px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Hello, {{name}}!</h1>
    </div>
    <div style="padding: 24px 20px; border: 1px solid #e5e7eb;">
      <p>This is a sample email template. You can edit it to suit your needs.</p>
      <p>Feel free to add your content here.</p>
      <a href="{{actionLink}}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; font-weight: bold;">Click Here</a>
      <p style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        Best regards,<br>
        {{senderName}}
      </p>
    </div>
    <div style="text-align: center; padding: 16px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">&copy; 2025 PaletteMail. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

const defaultCss = `body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
}`;

export default TemplateBuilder;
