import nodemailer from 'nodemailer';
import { EmailTemplate } from '@/lib/email-templates';
import User from '@/models/User';
import EmailHistory from '@/models/EmailHistory';
import { compileTemplate, getTemplateByIdWithDb } from '@/lib/email-templates';
import mongoose from 'mongoose';

// Get email configuration from environment variables
const EMAIL_USER = process.env.SMTP_USER;
const EMAIL_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

// Create reusable transporter
const createTransporter = () => {
  console.log('SMTP Configuration:', {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    user: EMAIL_USER ? 'SET' : 'NOT SET',
    password: EMAIL_PASSWORD ? 'SET' : 'NOT SET'
  });

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error(`Email configuration missing. Please set SMTP_USER and SMTP_PASSWORD in your .env file.
    Current values:
    - SMTP_HOST: ${EMAIL_HOST || 'not set'}
    - SMTP_PORT: ${EMAIL_PORT || 'not set'}
    - SMTP_USER: ${EMAIL_USER ? 'set' : 'not set'}
    - SMTP_PASSWORD: ${EMAIL_PASSWORD ? 'set' : 'not set'}`);
  }

  // For Gmail, a different configuration often works better
  if (EMAIL_HOST === 'smtp.gmail.com') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
  }

  // Standard configuration for other SMTP servers
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for port 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
};

interface SendEmailParams {
  userId: string;
  templateId: string;
  variables: Record<string, string>;
  recipients: string[];
  template?: EmailTemplate; // Optional template object to avoid fetching again
}

/**
 * Send an email using a template and save to email history
 */
export async function sendEmail({ userId, templateId, variables, recipients, template }: SendEmailParams): Promise<{ success: boolean; message: string }> {
  try {
    // Add the baseUrl for email template assets
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const variablesWithBaseUrl = { ...variables, baseUrl };
    
    // Log email sending attempt
    console.log('Attempting to send email:', {
      templateId,
      recipients: recipients.join(', '),
      baseUrl,
      hasTemplate: !!template
    });
    
    // Get the email template
    let compiledTemplate: { subject: string; html: string };
    try {
      if (template) {
        // If we have a complete template object, compile it
        const html = compileTemplate(template.html, variablesWithBaseUrl);
        const subject = compileTemplate(template.subject, variablesWithBaseUrl);
        compiledTemplate = { subject, html };
      } else {
        // Otherwise fetch and compile the template
        compiledTemplate = await getCompiledTemplate(templateId, variablesWithBaseUrl);
      }
    } catch (templateError: any) {
      console.error('Template compilation error:', templateError);
      return {
        success: false,
        message: `Template error: ${templateError.message}`
      };
    }
    
    const { subject, html } = compiledTemplate;
    
    // Create transporter
    let transporter;
    try {
      transporter = createTransporter();
    } catch (transporterError: any) {
      console.error('SMTP transporter creation error:', transporterError);
      return {
        success: false,
        message: `SMTP configuration error: ${transporterError.message}`
      };
    }
    
    // Use senderName in the From field if available
    const senderName = variables.senderName || 'Email Sender';
    
    // Log before sending
    console.log('Sending email with:', {
      from: `"${senderName}" <${EMAIL_USER}>`,
      to: recipients.join(', '),
      subject
    });
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"${senderName}" <${EMAIL_USER}>`,
      to: recipients.join(', '),
      subject,
      html,
    });

    console.log('Email sent successfully:', info.messageId);

    // Save to email history
    try {
      await saveEmailHistory({
        userId: new mongoose.Types.ObjectId(userId),
        templateId,
        subject,
        recipients,
        content: html,
        status: 'success',
      });
    } catch (historyError: any) {
      console.warn('Failed to save email history for successful email:', historyError.message);
    }

    return {
      success: true,
      message: `Email sent: ${info.messageId}`,
    };
  } catch (error: any) {
    console.error('Email sending error:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command
    });
    
    // Save failed email to history
    if (userId) {
      try {
        await saveEmailHistory({
          userId: new mongoose.Types.ObjectId(userId),
          templateId,
          subject: 'Failed Email',
          recipients,
          content: JSON.stringify(variables),
          status: 'failed',
          errorMessage: error.message,
        });
      } catch (historyError) {
        // Silently handle history saving errors
        console.warn('Failed to save email history for failed email');
      }
    }

    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
    };
  }
}

/**
 * Simplified email sending function for testing and direct usage
 * Does not require a userId and does not save to history
 */
export async function sendTestEmail({ 
  to, 
  subject, 
  html, 
  variables = {} 
}: { 
  to: string | string[]; 
  subject: string; 
  html: string; 
  variables?: Record<string, string>; 
}): Promise<{ success: boolean; message: string }> {
  try {
    // Add the baseUrl for email template assets
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const allVariables = { ...variables, baseUrl };
    
    // Compile the template with variables
    const compiledHtml = compileTemplate(html, allVariables);
    
    // Create transporter
    const transporter = createTransporter();
    
    // Convert to array if string
    const recipients = Array.isArray(to) ? to : [to];
    
    // Use senderName in the From field if available
    const senderName = variables.senderName || 'PaletteMail';
    
    // Log before sending
    console.log('Sending test email to:', recipients.join(', '));
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"${senderName}" <${EMAIL_USER}>`,
      to: recipients.join(', '),
      subject,
      html: compiledHtml,
    });

    console.log('Test email sent successfully:', info.messageId);

    return {
      success: true,
      message: `Email sent: ${info.messageId}`,
    };
  } catch (error: any) {
    console.error('Test email sending error:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
    });

    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
    };
  }
}

/**
 * Get a compiled template with variables replaced
 */
async function getCompiledTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; html: string }> {
  const template = await getTemplateByIdWithDb(templateId);
  
  if (!template) {
    throw new Error(`Template with ID ${templateId} not found`);
  }
  
  // Add the baseUrl for email template assets
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const variablesWithBaseUrl = { ...variables, baseUrl };
  
  const html = compileTemplate(template.html, variablesWithBaseUrl);
  const subject = compileTemplate(template.subject, variablesWithBaseUrl);
  
  return { subject, html };
}

/**
 * Save email to history
 */
async function saveEmailHistory(emailData: {
  userId: mongoose.Types.ObjectId;
  templateId: string;
  subject: string;
  recipients: string[];
  content: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}) {
  try {
    await EmailHistory.create(emailData);
  } catch (error) {
    // Silently fail if history can't be saved
  }
} 