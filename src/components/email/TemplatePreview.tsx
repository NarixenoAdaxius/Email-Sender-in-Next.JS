"use client";

import { useEffect, useState } from 'react';
import { EmailTemplate } from '@/lib/email-templates';

interface TemplatePreviewProps {
  template: EmailTemplate;
  variables: Record<string, string>;
}

export default function TemplatePreview({ template, variables }: TemplatePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');

  useEffect(() => {
    // Function to replace variables in the template
    const replaceVariables = (text: string) => {
      let result = text;
      
      // Replace each variable placeholder with its value
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || `[${key}]`);
      });
      
      // Replace any remaining variables with placeholders
      template.variables.forEach(variable => {
        const regex = new RegExp(`{{${variable}}}`, 'g');
        result = result.replace(regex, `[${variable}]`);
      });
      
      return result;
    };
    
    // Generate preview subject and HTML
    setPreviewSubject(replaceVariables(template.subject));
    setPreviewHtml(replaceVariables(template.html));
  }, [template, variables]);
  
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200 p-4">
        <h3 className="font-medium text-gray-700">Subject Preview</h3>
        <p className="mt-1 text-sm">{previewSubject}</p>
      </div>
      
      <div className="rounded-md border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 p-2">
          <h3 className="font-medium text-gray-700">Email Preview</h3>
        </div>
        <div className="p-4">
          <iframe
            title="Email Preview"
            srcDoc={previewHtml}
            className="min-h-[400px] w-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
} 