import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrgId } from '@/lib/session';

function findingKey(f: any): string {
  if (typeof f?.fingerprint === 'string' && f.fingerprint.length > 0) return f.fingerprint;
  const scriptId = typeof f?.scriptId === 'string' ? f.scriptId : 'S?';
  const title = typeof f?.title === 'string' ? f.title : '';
  return `${scriptId}:${title}`;
}

/**
 * GET /api/runs/[id]/compare
 *
 * Compare this run to the previous run in the same project.
 * This is intentionally shallow (diff findings + policy events + risk score) for MVP.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();
    const runId = params.id;

    const run = await anyDb.run.findFirst({
      where: { id: runId, orgId },
      select: { id: true, projectId: true, createdAt: true, riskScore: true },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const baseline = await anyDb.run.findFirst({
      where: { orgId, projectId: run.projectId, createdAt: { lt: run.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, riskScore: true },
    });

    if (!baseline) {
      return NextResponse.json({
        runId,
        baselineRunId: null,
        message: 'No previous run found for this project',
      });
    }

    const [currentFindings, baselineFindings, currentPolicyCount, baselinePolicyCount] =
      await Promise.all([
        anyDb.finding.findMany({ where: { orgId, runId }, select: { id: true, title: true, severity: true, scriptId: true, fingerprint: true, createdAt: true } }),
        anyDb.finding.findMany({ where: { orgId, runId: baseline.id }, select: { id: true, title: true, severity: true, scriptId: true, fingerprint: true, createdAt: true } }),
        anyDb.event.count({ where: { orgId, runId, channel: 'policy' } }),
        anyDb.event.count({ where: { orgId, runId: baseline.id, channel: 'policy' } }),
      ]);

    const currentKeys = new Map<string, any>();
    for (const f of currentFindings) currentKeys.set(findingKey(f), f);
    const baselineKeys = new Map<string, any>();
    for (const f of baselineFindings) baselineKeys.set(findingKey(f), f);

    const newFindings = Array.from(currentKeys.entries())
      .filter(([k]) => !baselineKeys.has(k))
      .map(([, f]) => f);

    const resolvedFindings = Array.from(baselineKeys.entries())
      .filter(([k]) => !currentKeys.has(k))
      .map(([, f]) => f);

    const riskScoreDelta =
      (run.riskScore ?? 0) - (baseline.riskScore ?? 0);

    return NextResponse.json({
      runId,
      baselineRunId: baseline.id,
      riskScore: run.riskScore,
      baselineRiskScore: baseline.riskScore,
      riskScoreDelta,
      policyViolations: currentPolicyCount,
      baselinePolicyViolations: baselinePolicyCount,
      policyViolationsDelta: currentPolicyCount - baselinePolicyCount,
      newFindings,
      resolvedFindings,
    });
  } catch (error) {
    console.error('Run compare error:', error);
    return NextResponse.json({ error: 'Failed to compare runs' }, { status: 500 });
  }
}

