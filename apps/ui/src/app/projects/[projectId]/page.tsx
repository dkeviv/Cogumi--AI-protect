import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ProjectHeader } from '@/components/project/ProjectHeaderNew';
import { ProjectActions } from '@/components/project/ProjectActions';
import { OnboardingCard } from '@/components/project/OnboardingCard';
import { ConnectStatusCardNew } from '@/components/project/ConnectStatusCardNew';
import { TlsInfoBadge } from '@/components/project/TlsInfoBadge';
import { RunsTableNew } from '@/components/project/RunsTableNew';
import { SetupWizard } from '@/components/project/SetupWizard';
import { ProjectSettings } from '@/components/project/ProjectSettings';
import { RunPicker } from '@/components/project/RunPicker';

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams?: { tab?: string; step?: string };
}) {
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

  const hasToken = activeTokenCount > 0;
  const isSidecarConnected = Boolean(latestToken?.lastSeenAt);
  const hasAgentEndpoint = Boolean(project.agentTestUrl);
  const hasCompletedRun = project._count.runs > 0;

  // Onboarding steps (4 required steps per UX_DESIGN.md)
  const onboardingSteps = [
    { id: 'token', label: 'Sidecar token generated', completed: hasToken },
    { id: 'deploy', label: 'Sidecar connected', completed: isSidecarConnected },
    { id: 'endpoint', label: 'Agent endpoint configured', completed: hasAgentEndpoint },
    { id: 'run', label: 'First run completed', completed: hasCompletedRun },
  ];

  // Setup is complete when first 3 steps are done (before first run)
  const setupComplete = hasToken && isSidecarConnected && hasAgentEndpoint;
  
  // All onboarding complete when all 4 steps are done
  const allOnboardingComplete = onboardingSteps.every(step => step.completed);

  const activeTab: 'runs' | 'setup' =
    searchParams?.tab === 'setup'
      ? 'setup'
      : searchParams?.tab === 'runs'
      ? 'runs'
      : setupComplete
      ? 'runs'
      : 'setup';

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: project.name },
  ];

  return (
    <AppShell>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <ProjectHeader
              name={project.name}
              environment={project.environment}
              lastSeenAt={latestToken?.lastSeenAt?.toISOString() ?? null}
              totalRuns={project._count.runs}
            />
            <ProjectActions projectId={params.projectId} setupComplete={setupComplete} />
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-[var(--border-default)]">
            <div className="flex gap-6">
              <Link
                href={`/projects/${params.projectId}?tab=runs`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'runs'
                    ? 'border-[var(--brand-from)] text-[var(--brand-from)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Runs
              </Link>
              <Link
                href={`/projects/${params.projectId}?tab=setup`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'setup'
                    ? 'border-[var(--brand-from)] text-[var(--brand-from)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Setup & Settings
                {!setupComplete && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    action needed
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'runs' ? (
              <>
                <RunPicker projectId={params.projectId} />
                <RunsTableNew projectId={params.projectId} canStartRun={setupComplete} />
              </>
            ) : (
              <>
                {/* Onboarding Card (shown until all steps complete) */}
                {!allOnboardingComplete && (
                  <OnboardingCard
                    projectId={params.projectId}
                    steps={onboardingSteps}
                    allComplete={allOnboardingComplete}
                  />
                )}

                <SetupWizard
                  projectId={params.projectId}
                  baseHref={`/projects/${params.projectId}?tab=setup`}
                  embedded
                />

                <ProjectSettings projectId={params.projectId} embedded />
              </>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            <ConnectStatusCardNew
              tokenCount={activeTokenCount}
              lastSeenAt={latestToken?.lastSeenAt?.toISOString() ?? null}
              agentTestUrl={project.agentTestUrl}
            />
            <TlsInfoBadge />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
