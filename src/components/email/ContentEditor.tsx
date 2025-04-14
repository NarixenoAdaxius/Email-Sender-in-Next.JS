"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { z } from 'zod';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmailTemplate } from '@/lib/email-templates';

interface ContentEditorProps {
  template: EmailTemplate;
  onSend: (templateId: string, variables: Record<string, string>, recipients: string[]) => Promise<void>;
  onVariablesChange?: (variables: Record<string, string>) => void;
}

export default function ContentEditor({ template, onSend, onVariablesChange }: ContentEditorProps) {
  // Dynamically create a schema based on the template variables
  const createFormSchema = () => {
    // Create a schema map for our form
    const schemaMap = {
      recipients: z.string()
        .min(1, { message: 'At least one recipient is required' })
        .refine((emails) => {
          const emailList = emails.split(',').map(e => e.trim());
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailList.every((email: string) => emailRegex.test(email));
        }, { message: 'Please enter valid email addresses separated by commas' }),
    } as Record<string, z.ZodType<any>>;
    
    // Add template variables to schema
    template.variables.forEach(variable => {
      schemaMap[variable] = z.string().min(1, { message: `${variable} is required` });
    });
    
    return z.object(schemaMap);
  };
  
  const formSchema = createFormSchema();
  type FormValues = z.infer<typeof formSchema>;
  
  // Create default values for the form
  const createDefaultValues = () => {
    const defaults: Record<string, string> = {
      recipients: '',
    };
    
    template.variables.forEach(variable => {
      // Use default values from template if available
      defaults[variable] = template.defaultValues?.[variable] || '';
    });
    
    return defaults;
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(),
  });
  
  // Reset form when template changes
  useEffect(() => {
    form.reset(createDefaultValues());
  }, [template.id]);
  
  // Update the parent component with current variables when values change
  useEffect(() => {
    if (onVariablesChange) {
      const subscription = form.watch((value) => {
        // Extract just the variables (exclude recipients)
        const { recipients, ...variables } = value;
        // Only send defined values
        const definedVariables = Object.fromEntries(
          Object.entries(variables).filter(([_, val]) => val !== undefined)
        ) as Record<string, string>;
        
        onVariablesChange(definedVariables);
      });
      
      return () => subscription.unsubscribe();
    }
  }, [form, onVariablesChange]);
  
  const onSubmit = async (data: FormValues) => {
    try {
      // Extract recipients and variables
      const { recipients, ...variables } = data;
      const recipientList = recipients.split(',').map((email: string) => email.trim());
      
      // Send email
      await onSend(template.id, variables as Record<string, string>, recipientList);
      
      // Reset form
      form.reset(createDefaultValues());
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{template.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="recipients"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipients</FormLabel>
                <FormControl>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-medium mb-2">Email Content</h3>
            <p className="text-sm text-gray-500">
              Fill in the variables to customize your email
            </p>
          </div>
          
          {template.variables.map((variable) => {
            // Determine if this field should be a textarea or input
            const isLongContent = variable.includes('content');
            
            return (
              <FormField
                key={variable}
                control={form.control}
                name={variable as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">
                      {variable.replace(/([A-Z])/g, ' $1')}
                      {variable === 'senderName' && (
                        <span className="ml-2 text-xs text-blue-500 font-normal">
                          (Also used in the "From" field)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      {isLongContent ? (
                        <Textarea 
                          placeholder={`Enter ${variable}`}
                          className="h-24"
                          {...field}
                        />
                      ) : (
                        <Input
                          placeholder={`Enter ${variable}`}
                          {...field}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
          
          <Button type="submit" className="w-full">
            Send Email
          </Button>
        </form>
      </Form>
    </div>
  );
} 