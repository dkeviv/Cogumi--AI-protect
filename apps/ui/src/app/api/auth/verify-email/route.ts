import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { randomBytes, createHash } from 'crypto';
import { sendVerificationEmail } from '@/lib/email';
import { checkAuthRateLimit, createRateLimitHeaders } from '@/lib/auth-rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Check rate limit (3 resend attempts per hour per IP+email)
    const rateLimit = checkAuthRateLimit(req, 'emailResend', email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification email requests. Please try again later.' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit.remaining, rateLimit.resetAt, rateLimit.retryAfter)
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // Generate verification token (same logic as register)
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenHash = createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (security best practice)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email using shared email service
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log(`✅ Verification email resent to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    // Redirect to login with error
    return NextResponse.redirect(new URL('/login?error=missing_token', req.url));
  }

  try {
    // Hash the token to compare with stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpires: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      // Redirect to login with error (invalid or expired)
      return NextResponse.redirect(new URL('/login?error=invalid_or_expired_token', req.url));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch (error) {
    console.error('Verify email error:', error);
    // Redirect to login with error
    return NextResponse.redirect(new URL('/login?error=verification_failed', req.url));
  }
}
