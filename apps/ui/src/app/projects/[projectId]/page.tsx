import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import Link from 'next/link';
import { AppHeader } from '@/components/nav/AppHeader';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ConnectStatusCard } from '@/components/project/ConnectStatusCard';
import { QuickActions } from '@/components/project/QuickActions';
import { RunsTable } from '@/components/project/RunsTable';

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const session = await auth();
  if (!session) {
    redirect('/login');
  }

  const orgId = await getOrgId();
  
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      _count: {
        select: {
          runs: true,
        },
      },
    },
  });

  if (!project || project.orgId !== orgId) {
    redirect('/dashboard');
  }

  const activeTokenCount = await prisma.sidecarToken.count({
    where: { projectId: project.id, status: 'active' },
  });

  const latestToken = await prisma.sidecarToken.findFirst({
    where: { projectId: project.id },
    orderBy: { lastSeenAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
      <AppHeader
        title="Project Overview"
        backHref="/dashboard"
        backLabel="Dashboard"
        rightSlot={
          <Link
            href={`/projects/${params.projectId}/settings`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Settings
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <ProjectHeader
          name={project.name}
          environment={project.environment}
          lastSeenAt={latestToken?.lastSeenAt?.toISOString() ?? null}
          rightSlot={
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                Total runs: <span className="font-semibold text-slate-700">{project._count.runs}</span>
              </span>
            </div>
          }
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <ConnectStatusCard
              tokenCount={activeTokenCount}
              lastSeenAt={latestToken?.lastSeenAt?.toISOString() ?? null}
              agentTestUrl={project.agentTestUrl}
            />
            <RunsTable projectId={params.projectId} />
          </div>

          <div className="space-y-6">
            <QuickActions projectId={params.projectId} agentTestUrl={project.agentTestUrl} />
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--app-shadow-card)]">
              <h3 className="text-sm font-semibold text-slate-900">Setup Checklist</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Generate sidecar token</li>
                <li>Deploy sidecar proxy</li>
                <li>Verify heartbeat</li>
                <li>Configure agent endpoint</li>
              </ul>
              <Link
                href={`/projects/${params.projectId}/connect`}
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue Setup
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
