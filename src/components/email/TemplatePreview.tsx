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
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Trigger update animation
    setIsUpdating(true);
    const timer = setTimeout(() => setIsUpdating(false), 300);
    
    // Function to replace variables in the template
    const replaceVariables = (text: string) => {
      let result = text;
      
      // Use baseUrl from variables if it exists, otherwise use window.location.origin
      const baseUrl = variables.baseUrl || window.location.origin;
      const allVariables = { 
        ...variables, 
        baseUrl,
      };
      
      // Replace each variable placeholder with its value
      Object.entries(allVariables).forEach(([key, value]) => {
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
    
    return () => clearTimeout(timer);
  }, [template, variables]);
  
  return (
    <div className="space-y-4">
      <div className={`rounded-md border border-gray-200 p-4 transition-all duration-300 ${isUpdating ? 'bg-blue-50 border-blue-200' : ''}`}>
        <h3 className="font-medium text-gray-700">Subject Preview</h3>
        <p className="mt-1 text-sm">{previewSubject}</p>
      </div>
      
      <div className={`rounded-md border border-gray-200 transition-all duration-300 ${isUpdating ? 'border-blue-300 shadow-sm' : ''}`}>
        <div className="border-b border-gray-200 bg-gray-50 p-2">
          <h3 className="font-medium text-gray-700">Email Preview</h3>
          {isUpdating && <span className="ml-2 text-xs text-blue-500">Updating...</span>}
        </div>
        <div className="p-4">
          <iframe
            title="Email Preview"
            srcDoc={previewHtml}
            className="min-h-[400px] w-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
} 