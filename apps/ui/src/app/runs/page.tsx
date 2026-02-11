import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Play, ChevronRight } from 'lucide-react';

export default async function RunsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const orgId = await getOrgId();

  // Fetch all runs across all projects
  const runs = await prisma.run.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to recent 50 runs
    include: {
      project: {
        select: {
          id: true,
          name: true,
          environment: true,
        },
      },
    },
  });

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Runs' },
  ];

  // Helper to format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Helper to get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'running':
        return 'running';
      case 'failed':
        return 'failed';
      case 'canceled':
        return 'canceled';
      default:
        return 'default';
    }
  };

  // Helper to get risk badge variant
  const getRiskVariant = (score: number | null) => {
    if (!score) return 'default';
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  // Helper to get environment badge variant
  const getEnvVariant = (env: string) => {
    switch (env) {
      case 'prod':
        return 'production';
      case 'staging':
        return 'staging';
      default:
        return 'sandbox';
    }
  };

  return (
    <AppShell>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            Recent Runs
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            View all security test runs across your projects
          </p>
        </div>

        {/* Runs List */}
        {runs.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Play size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No runs yet
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Start your first security test run from a project page
            </p>
            <Link href="/projects">
              <Button>View Projects</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--border-default)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--surface-elevated)] border-b border-[var(--border-default)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Run ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Environment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/runs/${run.id}`}
                          className="text-sm font-mono text-[var(--brand-from)] hover:underline"
                        >
                          {run.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/projects/${run.project.id}`}
                          className="text-sm text-[var(--text-primary)] hover:text-[var(--brand-from)] transition-colors"
                        >
                          {run.project.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getEnvVariant(run.project.environment)}>
                          {run.project.environment}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusVariant(run.status)}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {run.riskScore !== null ? (
                          <Badge variant={getRiskVariant(run.riskScore)}>
                            {run.riskScore}
                          </Badge>
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                        {run.startedAt ? formatDate(run.startedAt) : formatDate(run.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/runs/${run.id}`}
                          className="inline-flex items-center gap-1 text-sm text-[var(--brand-from)] hover:text-[var(--brand-to)] transition-colors"
                        >
                          View
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--surface-elevated)] border-t border-[var(--border-default)]">
              <p className="text-sm text-[var(--text-muted)]">
                Showing {runs.length} most recent {runs.length === 1 ? 'run' : 'runs'}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
