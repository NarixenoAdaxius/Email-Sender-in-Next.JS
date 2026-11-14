"use client";

import React, { useEffect, useState } from 'react';

interface TemplateEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  id?: string;
}

export default function TemplateEditor({
  initialContent,
  onChange,
  id = 'template-html-editor',
}: TemplateEditorProps) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange(newContent);
  };

  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          HTML Editor
        </label>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{lineCount} lines</span>
      </div>
      <textarea
        id={id}
        name="html"
        spellCheck={false}
        className="h-[420px] w-full resize-y bg-background p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-inset"
        value={content}
        onChange={handleChange}
        placeholder="<!DOCTYPE html>..."
      />
    </div>
  );
}
