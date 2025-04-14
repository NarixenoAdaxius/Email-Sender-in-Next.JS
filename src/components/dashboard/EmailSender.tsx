"use client";

import { useState } from 'react';
import { toast } from 'react-toastify';
import TemplateSelector from '@/components/email/TemplateSelector';
import ContentEditor from '@/components/email/ContentEditor';
import TemplatePreview from '@/components/email/TemplatePreview';
import { EmailTemplate } from '@/lib/email-templates';

export default function EmailSender() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setError(null);
    // Reset variables when template changes
    const defaultVariables: Record<string, string> = {};
    template.variables.forEach(v => defaultVariables[v] = template.defaultValues?.[v] || '');
    setVariables(defaultVariables);
  };

  const handleVariablesChange = (newVariables: Record<string, string>) => {
    // Update variables state as user types in the form
    setVariables(prev => ({
      ...prev,
      ...newVariables
    }));
  };

  const handleSendEmail = async (
    templateId: string, 
    contentVariables: Record<string, string>, 
    recipients: string[]
  ) => {
    setError(null);
    try {
      setIsLoading(true);
      
      console.log('Sending email with:', {
        templateId,
        variables: contentVariables,
        recipients
      });
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          variables: contentVariables,
          recipients,
        }),
      });
      
      // Parse the response JSON
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        throw new Error('Failed to parse server response');
      }
      
      // Check if the request was successful
      if (!response.ok) {
        console.error('Email sending failed:', result);
        
        // Show detailed validation errors if available
        if (result.issues && Array.isArray(result.issues)) {
          const errorMessages = result.issues.map((issue: any) => issue.message).join(', ');
          throw new Error(`Validation errors: ${errorMessages}`);
        }
        
        // Show missing variables if available
        if (result.missingVariables && Array.isArray(result.missingVariables)) {
          throw new Error(`Missing variables: ${result.missingVariables.join(', ')}`);
        }
        
        throw new Error(result.error || 'Failed to send email');
      }
      
      toast.success('Email sent successfully!');
      setVariables(contentVariables);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send email';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Send email error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">Email Sender</h1>
      
      {error && (
        <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-300 text-red-700">
          <h3 className="font-semibold mb-1">Error sending email:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {!selectedTemplate ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Select a Template</h2>
          <p className="text-gray-600">
            Choose a template to get started with your email
          </p>
          <TemplateSelector onSelect={handleTemplateSelect} />
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Customize Email</h2>
            <ContentEditor
              template={selectedTemplate}
              onSend={handleSendEmail}
              onVariablesChange={handleVariablesChange}
            />
            <button
              className="mt-4 text-sm text-blue-500 hover:underline"
              onClick={() => setSelectedTemplate(null)}
              disabled={isLoading}
            >
              ← Back to template selection
            </button>
          </div>
          
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Preview</h2>
            <TemplatePreview 
              template={selectedTemplate} 
              variables={variables}
            />
          </div>
        </div>
      )}
    </div>
  );
} 