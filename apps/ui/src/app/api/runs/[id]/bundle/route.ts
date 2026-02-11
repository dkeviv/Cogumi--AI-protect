import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrgId } from '@/lib/session';

/**
 * GET /api/runs/[id]/bundle
 *
 * Enterprise-friendly evidence export (JSON). This is intentionally human-usable:
 * run metadata + story steps + findings + events.
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
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
            agentTestUrl: true,
            toolDomains: true,
            internalSuffixes: true,
            prodOverrideEnabled: true,
            redTeamConfig: true,
          },
        },
        results: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const [storySteps, findings, events] = await Promise.all([
      anyDb.storyStep.findMany({ where: { runId, orgId }, orderBy: [{ seqStart: 'asc' }, { ts: 'asc' }] }),
      anyDb.finding.findMany({ where: { runId, orgId }, orderBy: [{ severity: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }] }),
      anyDb.event.findMany({ where: { runId, orgId }, orderBy: [{ seq: 'asc' }, { ts: 'asc' }] }),
    ]);

    const bundle = {
      version: 'v1',
      exportedAt: new Date().toISOString(),
      run,
      storySteps,
      findings,
      events,
    };

    const body = JSON.stringify(bundle, null, 2);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="run-${runId.slice(0, 8)}-evidence.json"`,
      },
    });
  } catch (error) {
    console.error('Evidence bundle export error:', error);
    return NextResponse.json({ error: 'Failed to export evidence bundle' }, { status: 500 });
  }
}

