import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, organizationName } = await req.json();

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

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
          password_hash: passwordHash,
          email_verified: false,
          verification_token: verificationToken,
          verification_token_expires: verificationExpires,
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
      await fetch(`${process.env.NEXTAUTH_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
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
