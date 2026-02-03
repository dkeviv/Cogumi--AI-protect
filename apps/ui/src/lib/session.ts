import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getServerSession() {
  const session = await auth();
  return session;
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function getOrgId() {
  const session = await requireAuth();
  if (!session.org_id) {
    throw new Error('No organization found for user');
  }
  return session.org_id;
}

export async function getSessionWithOrg() {
  const session = await requireAuth();
  if (!session.org_id) {
    throw new Error('No organization found for user');
  }
  return {
    ...session,
    org_id: session.org_id,
    role: session.role,
  };
}
