import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';
import { checkAuthRateLimit, createRateLimitHeaders, resetAuthRateLimit } from '@/lib/auth-rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, organizationName } = await req.json();

    // Check rate limit (3 registrations per hour per IP)
    const rateLimit = checkAuthRateLimit(req, 'register', email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.resetAt, rateLimit.retryAfter)
        }
      );
    }

    // Validate input
    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token (plaintext for email)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (security best practice)
    
    // Hash token for storage
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Create organization, user, and membership in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: organizationName,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash: passwordHash,
          emailVerified: false, // Not verified yet
          emailVerificationToken: verificationTokenHash, // Store hashed token
          emailVerificationExpires: verificationExpires,
        },
      });

      // Create membership
      await tx.membership.create({
        data: {
          orgId: org.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { org, user };
    });

    // Send verification email
    try {
      console.log(`Attempting to send verification email to: ${email}`);
      await sendVerificationEmail(email, verificationToken);
      console.log(`✅ Verification email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      console.error('Email config check:', {
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPassword: !!process.env.SMTP_PASSWORD,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        fromEmail: process.env.SMTP_FROM_EMAIL,
      });
      // Don't fail registration if email sending fails
    }

    return NextResponse.json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.user.id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
