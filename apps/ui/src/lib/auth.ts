import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@cogumi/db';
import bcrypt from 'bcryptjs';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session extends DefaultSession {
    org_id: string;
    role: string;
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            members: {
              include: {
                org: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        // Skip email verification in demo mode
        const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
        if (!skipEmailVerification && !user.emailVerified) {
          throw new Error('Please verify your email before logging in');
        }

        if (!user.passwordHash) {
          throw new Error('Invalid login method');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error('Invalid email or password');
        }

        // Get primary organization (first membership)
        const primaryMembership = user.members[0];
        if (!primaryMembership) {
          throw new Error('User has no organization');
        }

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          org_id: primaryMembership.orgId,
          role: primaryMembership.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.org_id = (user as any).org_id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.org_id = token.org_id as string;
        session.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
