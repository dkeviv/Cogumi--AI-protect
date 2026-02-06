import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import Link from 'next/link';
import { ProjectSettings } from '@/components/projects/ProjectSettings';
import { AppHeader } from '@/components/nav/AppHeader';
import { TokenManagement } from '@/components/projects/TokenManagement';

export default async function SettingsPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const orgId = await getOrgId();
  
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
  });

  if (!project || project.orgId !== orgId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
      <AppHeader
        title={`Settings · ${project.name}`}
        backHref={`/projects/${params.projectId}`}
        backLabel="Project"
        rightSlot={
          <Link
            href={`/projects/${params.projectId}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Back to Project
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-6">
          <ProjectSettings project={project} />
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
            <TokenManagement projectId={params.projectId} />
          </div>
        </div>
      </main>
    </div>
  );
}
