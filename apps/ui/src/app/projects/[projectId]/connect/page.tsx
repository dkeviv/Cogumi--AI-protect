import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import Link from 'next/link';
import { ConnectWizard } from '@/components/projects/ConnectWizard';
import { AppHeader } from '@/components/nav/AppHeader';

export default async function ConnectPage({ params }: { params: { projectId: string } }) {
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
        title={`Connect Wizard · ${project.name}`}
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

      <main className="mx-auto max-w-4xl px-6 py-8">
        <ConnectWizard projectId={params.projectId} projectName={project.name} />
      </main>
    </div>
  );
}
