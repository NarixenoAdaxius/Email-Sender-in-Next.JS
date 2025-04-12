"use client";

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { EmailTemplate } from '@/lib/email-templates';

interface TemplateSelectorProps {
  onSelect: (template: EmailTemplate) => void;
  selectedTemplateId?: string;
}

export default function TemplateSelector({ onSelect, selectedTemplateId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        const data = await response.json();
        setTemplates(data.templates);
      } catch (err: any) {
        setError(err.message || 'Failed to load templates');
        toast.error('Failed to load email templates');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  const handleSelectTemplate = (template: EmailTemplate) => {
    onSelect(template);
  };

  if (isLoading) {
    return <div className="flex justify-center p-6">Loading templates...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button 
          className="mt-2 text-blue-500 underline"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-primary ${
            selectedTemplateId === template.id
              ? 'border-2 border-primary bg-primary/5'
              : 'border-gray-200'
          }`}
          onClick={() => handleSelectTemplate(template)}
        >
          <h3 className="text-lg font-medium">{template.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{template.description}</p>
          
          <div className="mt-4">
            <span className="text-xs text-gray-500">Variables: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {template.variables.map((variable) => (
                <span
                  key={variable}
                  className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs"
                >
                  {variable}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 