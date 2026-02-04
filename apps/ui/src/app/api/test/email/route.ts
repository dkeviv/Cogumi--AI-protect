import { NextResponse } from "next/server";
import { testEmailConfig, sendVerificationEmail } from "@/lib/email";

/**
 * GET /api/test/email
 * 
 * Test email configuration
 * Only available in development
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    console.log('Testing email configuration...');
    
    // Test email config
    const configWorks = await testEmailConfig();
    
    if (!configWorks) {
      return NextResponse.json({
        success: false,
        error: 'Email configuration test failed',
        config: {
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT,
          smtpUser: process.env.SMTP_USER ? '✓ Set' : '✗ Missing',
          smtpPassword: process.env.SMTP_PASSWORD ? '✓ Set' : '✗ Missing',
          fromEmail: process.env.SMTP_FROM_EMAIL,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email configuration is valid',
      config: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        fromName: process.env.SMTP_FROM_NAME,
      }
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/test/email
 * 
 * Send a test verification email
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log(`Sending test verification email to: ${email}`);
    
    // Generate a test token
    const testToken = 'test-token-' + Date.now();
    
    await sendVerificationEmail(email, testToken);
    
    return NextResponse.json({
      success: true,
      message: `Test verification email sent to ${email}`,
      verificationUrl: `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${testToken}`,
    });
  } catch (error) {
    console.error('Test email send error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
