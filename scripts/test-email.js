// Run this script with: node scripts/test-email.js <your-email-address>
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EMAIL_USER = process.env.SMTP_USER;
const EMAIL_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

async function sendTestEmail() {
  // Get recipient email from command line argument
  const recipient = process.argv[2];
  
  if (!recipient) {
    console.error('Please provide an email address as an argument.');
    console.error('Example: node scripts/test-email.js your-email@example.com');
    process.exit(1);
  }
  
  console.log('Email Configuration:');
  console.log('-----------------------');
  console.log(`SMTP_HOST: ${EMAIL_HOST}`);
  console.log(`SMTP_PORT: ${EMAIL_PORT}`);
  console.log(`SMTP_USER: ${EMAIL_USER ? '✓ Set' : '✗ Not set'}`);
  console.log(`SMTP_PASSWORD: ${EMAIL_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log('-----------------------');
  
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.error('Error: SMTP_USER or SMTP_PASSWORD is not set in your environment variables.');
    process.exit(1);
  }
  
  try {
    console.log('Creating transporter for Gmail...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
    
    console.log(`Sending test email to ${recipient}...`);
    const info = await transporter.sendMail({
      from: `"Email Test Script" <${EMAIL_USER}>`,
      to: recipient,
      subject: 'Test Email from Script',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.imgur.com/vPPRXYV.png" alt="PaletteMail Logo" style="height: 60px; width: auto;" />
          </div>
          <h1 style="color: #4F46E5; font-size: 24px; margin-bottom: 20px;">Test Email from Script</h1>
          <p style="margin-bottom: 15px;">This is a test email sent directly from a Node.js script.</p>
          <p style="margin-bottom: 15px;">If you've received this, it means your email configuration is working properly!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #777; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });
    
    console.log('Success! Email sent.');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.log('\nAuthentication Tips:');
      console.log('1. Make sure your email and password are correct');
      console.log('2. For Gmail accounts with 2FA, use an App Password instead of your regular password');
      console.log('3. Make sure "Less secure app access" is turned on in your Gmail account (if applicable)');
    }
    
    process.exit(1);
  }
}

sendTestEmail().catch(console.error); 