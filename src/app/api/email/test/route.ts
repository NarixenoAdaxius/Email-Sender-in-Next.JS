import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/utils/email';
import { getTemplateById } from '@/lib/email-templates';
import { getBaseUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Environment check
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return NextResponse.json(
        { 
          error: 'SMTP configuration is incomplete',
          missingEnvVars: {
            SMTP_HOST: !smtpHost,
            SMTP_PORT: !smtpPort,
            SMTP_USER: !smtpUser,
            SMTP_PASSWORD: !smtpPass,
          }
        },
        { status: 500 }
      );
    }

    // Use the welcome template as a test email
    const baseUrl = getBaseUrl();
    const welcomeTemplate = getTemplateById('welcome-email');
    
    if (!welcomeTemplate) {
      return NextResponse.json(
        { error: 'Welcome email template not found' },
        { status: 500 }
      );
    }

    const variables = {
      name: 'Test User',
      email: email,
      loginLink: `${baseUrl}/login`,
      senderName: 'PaletteMail Test',
      baseUrl,
    };

    // Send the test email
    const result = await sendTestEmail({
      to: email,
      subject: 'PaletteMail Test Email',
      html: welcomeTemplate.html,
      variables,
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailInfo: {
        to: email,
        subject: 'PaletteMail Test Email',
        template: welcomeTemplate.id,
      },
      result,
    });
  } catch (error: any) {
    console.error('Error sending test email:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to send test email',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
} 