import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@cogumi/db';
import { getOrgId } from '@/lib/session';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowRight, PlugZap, ShieldAlert } from 'lucide-react';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const orgId = await getOrgId();

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleMs = 5 * 60 * 1000;
  const staleBefore = new Date(Date.now() - staleMs);

  const anyPrisma = prisma as any;

  const [projects, tokenAgg, criticalFindings, runsThisWeek, quotaStoppedRuns] = await Promise.all([
    prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        environment: true,
        agentTestUrl: true,
        prodOverrideEnabled: true,
        _count: { select: { runs: true } },
      },
    }),
    prisma.sidecarToken.groupBy({
      by: ['projectId'],
      where: { orgId, status: 'active' },
      _count: { _all: true },
      _max: { lastSeenAt: true },
    }),
    anyPrisma.finding.findMany({
      where: {
        orgId,
        status: 'confirmed',
        severity: { in: ['critical', 'high'] },
        // triageStatus is an enterprise workflow; if the column doesn't exist yet in the DB,
        // prisma will error at runtime. This is guarded by schema/migration.
        triageStatus: 'open',
      },
      orderBy: [{ severity: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }],
      take: 25,
      include: {
        run: {
          select: {
            id: true,
            project: { select: { id: true, name: true, environment: true } },
          },
        },
      },
    }),
    prisma.run.count({
      where: { orgId, createdAt: { gte: since7d } },
    }),
    prisma.run.count({
      where: { orgId, createdAt: { gte: since7d }, status: 'stopped_quota' },
    }),
  ]);

  const tokenByProject = new Map<
    string,
    { activeTokens: number; lastSeenAt: Date | null }
  >(
    tokenAgg.map((row) => [
      row.projectId,
      { activeTokens: row._count._all, lastSeenAt: row._max.lastSeenAt ?? null },
    ])
  );

  const needsAttention = projects
    .map((p) => {
      const token = tokenByProject.get(p.id) || { activeTokens: 0, lastSeenAt: null };
      const hasToken = token.activeTokens > 0;
      const hasHeartbeat = Boolean(token.lastSeenAt);
      const heartbeatStale = token.lastSeenAt ? token.lastSeenAt < staleBefore : false;
      const hasEndpoint = Boolean(p.agentTestUrl);

      const reasons: string[] = [];
      if (!hasToken) reasons.push('No sidecar token');
      if (hasToken && !hasHeartbeat) reasons.push('No heartbeat yet');
      if (heartbeatStale) reasons.push('Heartbeat stale');
      if (!hasEndpoint) reasons.push('Agent endpoint not configured');
      if (p.environment === 'prod') reasons.push('Production environment');

      const criticalCount = criticalFindings.filter((f: any) => f.run.project.id === p.id).length;
      if (criticalCount > 0) reasons.unshift(`${criticalCount} critical/high finding${criticalCount === 1 ? '' : 's'}`);

      return { project: p, token, reasons, criticalCount };
    })
    .filter((row) => row.reasons.length > 0)
    .sort((a, b) => b.criticalCount - a.criticalCount);

  const regressionByProject = new Map<
    string,
    { newSinceLastRun: number; backAgain: number; topCapability: string | null }
  >();

  await Promise.all(
    needsAttention
      .slice(0, 12)
      .map(async (row) => {
        const runs = await anyPrisma.run.findMany({
          where: { orgId, projectId: row.project.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            findings: {
              select: {
                id: true,
                scriptId: true,
                title: true,
                fingerprint: true,
                capability: true,
                severity: true,
              },
            },
          },
        });

        const keyOf = (f: any) =>
          (typeof f.fingerprint === 'string' && f.fingerprint.length > 0)
            ? f.fingerprint
            : `${f.scriptId}:${f.title}`;

        const latest = runs[0];
        const prev = runs[1];
        if (!latest) {
          regressionByProject.set(row.project.id, { newSinceLastRun: 0, backAgain: 0, topCapability: null });
          return;
        }

        const latestKeys = new Set<string>((latest.findings || []).map(keyOf));
        const prevKeys = new Set<string>((prev?.findings || []).map(keyOf));
        const olderKeys = new Set<string>(
          runs.slice(2).flatMap((r: any) => (r.findings || []).map(keyOf))
        );

        const newSinceLastRun = Array.from(latestKeys).filter((k) => !prevKeys.has(k)).length;
        const backAgain = Array.from(latestKeys).filter((k) => !prevKeys.has(k) && olderKeys.has(k)).length;

        const capCounts = new Map<string, number>();
        for (const f of latest.findings || []) {
          const cap = (f.capability || '').toString();
          if (!cap) continue;
          capCounts.set(cap, (capCounts.get(cap) || 0) + 1);
        }
        const topCapability = Array.from(capCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        regressionByProject.set(row.project.id, { newSinceLastRun, backAgain, topCapability });
      })
  );

  const recommendations = criticalFindings
    .map((f: any) => {
      const text = (f.remediationMd || f.summary || '').trim();
      const firstLine = text.split('\n').find((line: any) => String(line).trim().length > 0) || text;
      return {
        id: f.id,
        severity: f.severity,
        title: f.title,
        recommendation: firstLine,
        whyItWorks: (f.whyItWorks || '').trim(),
        verificationStep: (f.verificationStep || '').trim(),
        ownerUserId: f.ownerUserId || null,
        eta: f.eta || null,
        runId: f.run.id,
        project: f.run.project,
      };
    })
    .slice(0, 10);

  const projectsWithoutRuns = projects.filter((p) => p._count.runs === 0);

  const coverageGaps = await Promise.all(
    projects
      .filter((p) => p._count.runs > 0)
      .slice(0, 30)
      .map(async (p) => {
        const lastRun = await anyPrisma.run.findFirst({
          where: { orgId, projectId: p.id },
          orderBy: { createdAt: 'desc' },
          include: { results: { select: { scriptId: true } } },
        });

        const ran = new Set<string>((lastRun?.results || []).map((r: any) => r.scriptId).filter(Boolean));
        const expected = new Set<string>(['S1', 'S2', 'S3', 'S4', 'S5']);
        const missing = Array.from(expected).filter((id) => !ran.has(id));

        return {
          projectId: p.id,
          projectName: p.name,
          environment: p.environment,
          lastRunId: lastRun?.id || null,
          missing,
        };
      })
  );

  const coverageMissing = coverageGaps.filter((g) => g.missing.length > 0);

  const actionQueue = (() => {
    const items: Array<{
      key: string;
      priority: number;
      title: string;
      subtitle: string;
      href: string;
      badge?: { label: string; variant: any };
    }> = [];

    // 1) Confirmed critical/high findings (highest ROI actions)
    for (const f of criticalFindings.slice(0, 25)) {
      const sevWeight = f.severity === 'critical' ? 1000 : 800;
      const scoreWeight = typeof f.score === 'number' ? f.score : 50;
      const recency = typeof f.createdAt === 'string' ? new Date(f.createdAt).getTime() : (f.createdAt?.getTime?.() ?? Date.now());
      const recencyWeight = Math.min(300, Math.floor((Date.now() - recency) / (1000 * 60 * 60)) * -1);
      const exploitability = typeof f.exploitabilityScore === 'number' ? f.exploitabilityScore : 3;
      const blastRadius = typeof f.blastRadiusScore === 'number' ? f.blastRadiusScore : 3;
      const priority = sevWeight + scoreWeight * 5 + exploitability * 20 + blastRadius * 20 + recencyWeight;

      items.push({
        key: `finding:${f.id}`,
        priority,
        title: f.title,
        subtitle: `${f.run.project.name} • run ${f.run.id.slice(0, 8)}`,
        href: `/runs/${f.run.id}`,
        badge: { label: f.severity, variant: f.severity === 'critical' ? 'critical' : 'high' },
      });
    }

    // 2) Setup blockers
    for (const row of needsAttention) {
      const blocker = row.reasons.find((r) => r.includes('No sidecar token') || r.includes('No heartbeat') || r.includes('Agent endpoint'));
      if (!blocker) continue;
      const priority = 500 + row.criticalCount * 25;
      items.push({
        key: `setup:${row.project.id}:${blocker}`,
        priority,
        title: blocker,
        subtitle: `${row.project.name} • complete setup to run tests`,
        href: `/projects/${row.project.id}?tab=setup`,
        badge: { label: 'setup', variant: 'info' },
      });
    }

    items.sort((a, b) => b.priority - a.priority);
    return items.slice(0, 5);
  })();

  const breadcrumbs = [
    { label: 'Dashboard' },
  ];

  return (
    <AppShell>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Security triage across projects, runs, and confirmed issues.
          </p>
        </div>

        {/* Posture strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmed Critical/High</CardTitle>
              <CardDescription>Across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">
                {criticalFindings.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Runs (Last 7 Days)</CardTitle>
              <CardDescription>Org activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">
                {runsThisWeek}
              </div>
              {quotaStoppedRuns > 0 && (
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  <Badge variant="stopped">{quotaStoppedRuns} quota-stopped</Badge>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects Needing Attention</CardTitle>
              <CardDescription>Setup gaps or risk</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">
                {needsAttention.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Fix These 5 Things</CardTitle>
            </div>
            <CardDescription>Highest impact actions across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {actionQueue.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
                No urgent actions. Start a run to generate evidence-backed findings.
              </div>
            ) : (
              <div className="space-y-3">
                {actionQueue.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-[var(--border-default)] bg-white p-4 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.badge && <Badge variant={item.badge.variant}>{item.badge.label}</Badge>}
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</div>
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{item.subtitle}</div>
                    </div>
                    <Link href={item.href}>
                      <Button size="sm" variant="secondary">Open</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-[var(--brand-from)]" />
                <CardTitle className="text-base">Needs Attention</CardTitle>
              </div>
              <CardDescription>What to fix next, per project</CardDescription>
            </CardHeader>
            <CardContent>
              {needsAttention.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
                  No urgent actions. Start a run from a project to generate findings.
                </div>
              ) : (
                <div className="space-y-3">
                  {needsAttention.slice(0, 8).map((row) => (
                    <div
                      key={row.project.id}
                      className="rounded-lg border border-[var(--border-default)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {row.project.name}
                            </div>
                            <Badge variant={
                              row.project.environment === 'prod'
                                ? 'production'
                                : row.project.environment === 'staging'
                                ? 'staging'
                                : 'sandbox'
                            }>
                              {row.project.environment}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {row.reasons.slice(0, 3).map((reason) => (
                              <span
                                key={reason}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                              >
                                {reason}
                              </span>
                            ))}

                            {(() => {
                              const reg = regressionByProject.get(row.project.id);
                              if (!reg) return null;
                              return (
                                <>
                                  {reg.newSinceLastRun > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                      +{reg.newSinceLastRun} new since last run
                                    </span>
                                  )}
                                  {reg.backAgain > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                                      {reg.backAgain} regression
                                    </span>
                                  )}
                                  {reg.topCapability && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                      at risk: {reg.topCapability.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/projects/${row.project.id}`}>
                            <Button size="sm" variant="secondary">
                              Open
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                  {needsAttention.length > 8 && (
                    <div className="pt-2">
                      <Link href="/projects" className="text-sm text-[var(--brand-from)] hover:underline">
                        View all projects →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[var(--severity-critical)]" />
                <CardTitle className="text-base">Critical Findings</CardTitle>
              </div>
              <CardDescription>Confirmed issues requiring mitigation</CardDescription>
            </CardHeader>
            <CardContent>
              {criticalFindings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
                  No confirmed critical/high findings yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {criticalFindings.slice(0, 8).map((finding: any) => (
                    <div
                      key={finding.id}
                      className="rounded-lg border border-[var(--border-default)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={finding.severity === 'critical' ? 'critical' : 'high'}>
                              {finding.severity}
                            </Badge>
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {finding.title}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)]">
                            <span className="font-medium">{finding.run.project.name}</span>
                            <span className="text-[var(--text-muted)]"> • run {finding.run.id.slice(0, 8)}</span>
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                            {finding.remediationMd || finding.summary}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/runs/${finding.run.id}`}>
                            <Button size="sm" variant="secondary">
                              View Proof
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Mitigation workflow
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      Review proof chain, apply remediation, then re-run to confirm closure.
                    </div>
                  </div>
                </div>
                <Link href="/runs">
                  <Button size="sm" variant="ghost">All Runs →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base">Recommendations</CardTitle>
              </div>
              <CardDescription>Evidence-backed mitigations from confirmed findings</CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
                  No mitigations to surface yet. Run tests to generate findings and remediation guidance.
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.slice(0, 8).map((rec: any) => (
                    <div
                      key={rec.id}
                      className="rounded-lg border border-[var(--border-default)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={rec.severity === 'critical' ? 'critical' : 'high'}>
                              {rec.severity}
                            </Badge>
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {rec.project.name}
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">{rec.recommendation}</div>

                          <div className="mt-2 grid grid-cols-1 gap-2">
                            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-primary)]">Why it works:</span>{' '}
                              {rec.whyItWorks ? rec.whyItWorks : 'Add the mitigation rationale to help engineering implement the fix correctly.'}
                            </div>
                            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-primary)]">Verification:</span>{' '}
                              {rec.verificationStep ? rec.verificationStep : 'Re-run the script and confirm the finding is no longer reproducible with proof.'}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                            <span>Owner: {rec.ownerUserId ? rec.ownerUserId.slice(0, 8) : 'unassigned'}</span>
                            <span>ETA: {rec.eta ? new Date(rec.eta).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/runs/${rec.runId}`}>
                            <Button size="sm" variant="secondary">
                              View proof
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-[var(--brand-from)]" />
                <CardTitle className="text-base">Coverage Gaps</CardTitle>
              </div>
              <CardDescription>Projects that need their first run or setup completion</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsWithoutRuns.length === 0 && coverageMissing.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--border-default)] p-6 text-sm text-[var(--text-secondary)]">
                  No coverage gaps detected across recent runs.
                </div>
              ) : (
                <div className="space-y-3">
                  {projectsWithoutRuns.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-[var(--border-default)] bg-white p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {p.name}
                          </div>
                          <Badge variant={
                            p.environment === 'prod'
                              ? 'production'
                              : p.environment === 'staging'
                              ? 'staging'
                              : 'sandbox'
                          }>
                            {p.environment}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">
                          No runs yet. Complete setup, then launch your first run.
                        </div>
                      </div>
                      <Link href={`/projects/${p.id}?tab=setup`}>
                        <Button size="sm" variant="secondary">Setup</Button>
                      </Link>
                    </div>
                  ))}

                  {coverageMissing.slice(0, 4).map((g: any) => (
                    <div
                      key={`coverage-${g.projectId}`}
                      className="rounded-lg border border-[var(--border-default)] bg-white p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {g.projectName}
                          </div>
                          <Badge variant={
                            g.environment === 'prod'
                              ? 'production'
                              : g.environment === 'staging'
                              ? 'staging'
                              : 'sandbox'
                          }>
                            {g.environment}
                          </Badge>
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">
                          Last run missing scripts: <span className="font-mono">{g.missing.join(', ')}</span>
                        </div>
                      </div>
                      <Link href={`/projects/${g.projectId}`}>
                        <Button size="sm" variant="secondary">Run</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
