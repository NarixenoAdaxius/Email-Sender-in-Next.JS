export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
  variables: string[];
  defaultValues?: Record<string, string>;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Send a welcome email to new users',
    subject: 'Welcome to Our Service!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Our Service</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #eee;
          }
          .header {
            background-color: #4a6cf7;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .button {
            display: inline-block;
            background-color: #4a6cf7;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome, {{name}}!</h1>
          </div>
          <div class="content">
            <p>Thank you for joining our service. We're excited to have you on board!</p>
            <p>Your account has been created successfully with the email: {{email}}</p>
            <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
            <a href="{{loginLink}}" class="button">Login to Your Account</a>
          </div>
          <div class="footer">
            <p>&copy; 2023 Our Company. All rights reserved.</p>
            <p>You're receiving this email because you signed up for our service.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    variables: ['name', 'email', 'loginLink'],
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    description: 'Send a monthly newsletter to subscribers',
    subject: '{{month}} Newsletter - Updates and News',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Monthly Newsletter</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #eee;
          }
          .header {
            background-color: #4a6cf7;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .news-item {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{month}} Newsletter</h1>
          </div>
          <div class="content">
            <p>Hello {{name}},</p>
            <p>Here are the latest updates and news for {{month}}:</p>
            
            <div class="news-item">
              <h2>{{headline1}}</h2>
              <p>{{content1}}</p>
            </div>
            
            <div class="news-item">
              <h2>{{headline2}}</h2>
              <p>{{content2}}</p>
            </div>
            
            <div class="news-item">
              <h2>{{headline3}}</h2>
              <p>{{content3}}</p>
            </div>
            
            <p>Thank you for your continued support!</p>
          </div>
          <div class="footer">
            <p>&copy; 2023 Our Company. All rights reserved.</p>
            <p>You're receiving this email because you signed up for our newsletter.</p>
            <p><a href="{{unsubscribeLink}}">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    variables: ['name', 'month', 'headline1', 'content1', 'headline2', 'content2', 'headline3', 'content3', 'unsubscribeLink'],
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    description: 'Send a password reset link to users',
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #eee;
          }
          .header {
            background-color: #4a6cf7;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .button {
            display: inline-block;
            background-color: #4a6cf7;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello {{name}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="{{resetLink}}" class="button">Reset Password</a>
            <p>If you didn't request a password reset, you can ignore this email.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
          </div>
          <div class="footer">
            <p>&copy; 2023 Our Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    variables: ['name', 'resetLink'],
  },
  {
    id: 'interview-invitation',
    name: 'Interview Invitation',
    description: 'Send an interview invitation to candidates',
    subject: 'Interview Invitation - {{position}} at {{company}}',
    html: `
      

      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Invitation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #f0f0f0;
            background-color: #121212;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #1f1f1f;
            border-radius: 8px;
            border: 1px solid #333;
          }
          .logo {
            text-align: left;
            margin-bottom: 10px;
          }
          .logo img {
            width: 50px;
            height: auto;
          }
          .header {
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #daa520;
            margin-bottom: 20px;
          }
          .candidate-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .candidate-name {
            color: #daa520;
            font-weight: bold;
            font-size: 18px;
          }
          .position-company {
            text-align: right;
          }
          .position, .company {
            color: #daa520;
            display: inline-block;
          }
          .position {
            margin-right: 5px;
          }
          .border-line {
            height: 1px;
            background-color: #333;
            margin: 15px 0 20px 0;
            width: 100%;
          }
          .interview-info {
            background-color: #252525;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .interview-row {
            display: flex;
          }
          .interview-label {
            color: #daa520;
            width: 160px;
            font-weight: bold;
          }
          .interview-value {
            color: #3b82f6;
          }
          .note {
            background-color: #252525;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .note-label {
            color: #f0f0f0;
            font-weight: bold;
          }
          .note-value {
            color: #f0f0f0;
          }
          .contact-info {
            margin: 20px 0;
          }
          .contact-row {
            display: flex;
            margin: 5px 0;
          }
          .contact-label {
            color: #daa520;
            width: 80px;
            font-weight: bold;
          }
          .contact-value {
            color: #3b82f6;
          }
          .contact-value a {
            color: #3b82f6;
            text-decoration: none;
          }
          .department {
            color: #daa520;
            font-weight: bold;
            text-transform: uppercase;
            margin: 25px 0 15px 0;
          }
          .footer {
            color: #aaa;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
          }
          .version {
            text-align: center;
            color: #666;
            font-size: 10px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <a href="{{logoLink}}">
              <img src="https://i.ibb.co/XjbYYGS/LOGO-1-removebg-preview.png" alt="{{company}} Logo">
            </a>
          </div>
          
          <div class="header">
            <h1>Interview Invitation</h1>
          </div>
          
          <div class="candidate-row">
            <div class="candidate-name">{{candidateName}}</div>
          </div>
          
          <div class="candidate-row">
             <span class="position">{{position}}</span>
          </div>
          <div class="candidate-row">
            <span class="company">{{company}}</span>
          </div>
          
          
          <div class="border-line"></div>
          
          <div class="interview-info">
            <div class="interview-row">
              <div class="interview-label">Interview Date & Time:</div>
              <div class="interview-value">{{interviewDate}} {{interviewTime}}</div>
            </div>
            <div class="interview-row">
              <div class="interview-label">Interview Location:</div>
              <div class="interview-value">{{interviewLocation}}</div>
            </div>
          </div>
          
          <div class="note">
            <span class="note-label">Note:</span>
            <span class="note-value">{{interviewNotes}}</span>
          </div>
          
          <p style="color: #f0f0f0;">Feel free to let us know if you have any inquiries such as clarifications and meeting reschedules.</p>
          <p style="color: #f0f0f0; margin-bottom: 5px;">You can reach out to us:</p>
          
          <div class="contact-info">
            <div class="contact-row">
              <div class="contact-label">Phone:</div>
              <div class="contact-value">{{contactPhone}}</div>
            </div>
            <div class="contact-row">
              <div class="contact-label">Email:</div>
              <div class="contact-value"><a href="mailto:{{contactEmail}}">{{contactEmail}}</a></div>
            </div>
            <div class="contact-row">
              <div class="contact-label">Social:</div>
              <div class="contact-value"><a href="{{contactLink}}">{{contactMethod}}</a></div>
            </div>
          </div>
          
          <p style="color: #f0f0f0;">We look forward to seeing you soon.</p>
          
          <div class="department">{{departmentName}} DEPARTMENT</div>
          
          <div class="footer">
            <p>{{companyDescription}} is a non-profit and STEM/College-Oriented academic guild that is prepared exclusively for educational purposes including mentorship programs, ICT-related collaborations for the benefit of members of this guild that wish to participate actively.</p>
            <p>Furthermore, the guild aims at encouraging communication with its alumni and members, with the purpose of generating close connections and educating one another.</p>
          </div>
          
          <div class="version">v1.0</div>
        </div>
      </body>
      </html>
    `,
    variables: [
      'candidateName',
      'position',
      'company',
      'companyDescription',
      'interviewDate',
      'interviewTime',
      'interviewLocation',
      'interviewNotes',
      'contactMethod',
      'contactLink',
      'departmentName',
      'logoLink',
      'contactPhone',
      'contactEmail'
    ],
  },
];

export function getTemplates(): EmailTemplate[] {
  return emailTemplates;
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  const template = emailTemplates.find(template => template.id === id);
  
  // Set default values for the interview invitation template
  if (template && template.id === 'interview-invitation') {
    // Pre-populate the template with default values
    template.defaultValues = {
      logoLink: 'https://www.facebook.com/stiorca.alpha',
      contactPhone: '09059443808',
      contactEmail: 'dev.alpha@gmail.com',
      contactMethod: '09059443808',
      departmentName: 'DEVELOPMENT',
      company: 'ALPHA',
      position: 'Backend Head',
      candidateName: 'Narixeno',
      interviewDate: 'April 20 2025',
      interviewTime: '9:00 AM',
      interviewLocation: 'ONSITE ROOM 402',
      interviewNotes: 'BRING CV and PORTFOLIO',
      companyDescription: 'ALPHA',
      contactLink: '#'
    };
  }
  
  return template;
}

/**
 * Replace template variables with actual values
 */
export function compileTemplate(template: EmailTemplate, variables: Record<string, string>): {
  subject: string;
  html: string;
} {
  let subject = template.subject;
  let html = template.html;

  // Replace variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
  });

  return { subject, html };
} 