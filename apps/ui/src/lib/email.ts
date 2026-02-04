/**
 * Email service using Nodemailer with Gmail SMTP
 * Supports custom "from" domain via Gmail
 */

import nodemailer from 'nodemailer';
import type { Transporter} from 'nodemailer';

// Email configuration from environment
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASSWORD, // App-specific password
  },
};

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'COGUMI AI Protect';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      throw new Error('Email not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.');
    }

    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter!;
}

// Email templates
export const EmailTemplates = {
  verification: (verificationUrl: string, email: string) => ({
    subject: 'Verify your email - COGUMI AI Protect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                    <h1 style="margin: 0; font-size: 28px; color: #1a1a1a; font-weight: 600;">
                      🛡️ COGUMI AI Protect
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; font-size: 24px; color: #1a1a1a; font-weight: 600;">
                      Verify your email address
                    </h2>
                    
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                      Thanks for signing up! Please verify your email address to complete your registration and start securing your AI agents.
                    </p>
                    
                    <p style="margin: 0 0 30px; font-size: 14px; color: #6a6a6a;">
                      Email: <strong>${email}</strong>
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 10px 0 0; font-size: 13px; color: #3b82f6; word-break: break-all;">
                      ${verificationUrl}
                    </p>
                    
                    <p style="margin: 30px 0 0; font-size: 13px; color: #8a8a8a; border-top: 1px solid #e5e5e5; padding-top: 20px;">
                      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a; text-align: center;">
                      © ${new Date().getFullYear()} COGUMI AI Protect. Universal Agent Red Team Platform.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Verify Your Email - COGUMI AI Protect

Thanks for signing up!

Please verify your email address to complete your registration:
${verificationUrl}

Email: ${email}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
© ${new Date().getFullYear()} COGUMI AI Protect
    `.trim(),
  }),

  passwordReset: (resetUrl: string, email: string) => ({
    subject: 'Reset your password - COGUMI AI Protect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                    <h1 style="margin: 0; font-size: 28px; color: #1a1a1a; font-weight: 600;">
                      🛡️ COGUMI AI Protect
                    </h1>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; font-size: 24px; color: #1a1a1a; font-weight: 600;">
                      Reset your password
                    </h2>
                    
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                      We received a request to reset your password. Click the button below to choose a new password.
                    </p>
                    
                    <p style="margin: 0 0 30px; font-size: 14px; color: #6a6a6a;">
                      Account: <strong>${email}</strong>
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #6a6a6a;">
                      Or copy and paste this link:
                    </p>
                    <p style="margin: 10px 0 0; font-size: 13px; color: #3b82f6; word-break: break-all;">
                      ${resetUrl}
                    </p>
                    
                    <p style="margin: 30px 0 0; font-size: 13px; color: #8a8a8a; border-top: 1px solid #e5e5e5; padding-top: 20px;">
                      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a; text-align: center;">
                      © ${new Date().getFullYear()} COGUMI AI Protect
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Reset Your Password - COGUMI AI Protect

We received a request to reset your password.

Click the link below to reset your password:
${resetUrl}

Account: ${email}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

---
© ${new Date().getFullYear()} COGUMI AI Protect
    `.trim(),
  }),
};

// Send email function
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const transport = getTransporter();

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('[Email] Sent successfully:', info.messageId);
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    throw new Error('Failed to send email');
  }
}

// Helper functions
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  const template = EmailTemplates.verification(verificationUrl, email);
  
  await sendEmail({
    to: email,
    ...template,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const template = EmailTemplates.passwordReset(resetUrl, email);
  
  await sendEmail({
    to: email,
    ...template,
  });
}

// Test email configuration
export async function testEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] Configuration verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] Configuration error:', error);
    return false;
  }
}
