import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';
import { z } from 'zod';
import { canCreateProject } from '@/lib/quota-service';

// Validation schema for creating a project
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  environment: z.enum(['sandbox', 'staging', 'prod']).default('sandbox'),
  agentTestUrl: z.string().url().optional(),
  toolDomains: z.array(z.string()).default([]),
  internalSuffixes: z.array(z.string()).default([]),
  retentionDays: z.number().int().min(1).max(365).default(7),
  prodOverrideEnabled: z.boolean().default(false),
});

// GET /api/projects - List all projects for the current organization
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    const [projects, tokenAgg, latestRuns, worstRiskAgg, findings] = await Promise.all([
      prisma.project.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          environment: true,
          agentTestUrl: true,
          prodOverrideEnabled: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              runs: true,
            },
          },
        },
      }),
      prisma.sidecarToken.groupBy({
        by: ['projectId'],
        where: { orgId, status: 'active' },
        _count: { _all: true },
        _max: { lastSeenAt: true },
      }),
      prisma.run.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        distinct: ['projectId'],
        select: {
          projectId: true,
          createdAt: true,
          status: true,
          riskScore: true,
        },
      }),
      prisma.run.groupBy({
        by: ['projectId'],
        where: { orgId, riskScore: { not: null } },
        _max: { riskScore: true },
      }),
      prisma.finding.findMany({
        where: {
          orgId,
          status: 'confirmed',
        },
        select: {
          severity: true,
          run: { select: { projectId: true } },
        },
        take: 1000,
      }),
    ]);

    const tokenByProject = new Map(
      tokenAgg.map((row) => [
        row.projectId,
        { activeTokenCount: row._count._all, lastSeenAt: row._max.lastSeenAt ?? null },
      ])
    );

    const latestRunByProject = new Map(
      latestRuns.map((r) => [
        r.projectId,
        { lastRunAt: r.createdAt, lastRunStatus: r.status, lastRunRiskScore: r.riskScore ?? null },
      ])
    );

    const worstRiskByProject = new Map(
      worstRiskAgg.map((row) => [row.projectId, row._max.riskScore ?? null])
    );

    const confirmedFindingsByProject = new Map<string, { confirmedCount: number; criticalHighCount: number }>();
    for (const f of findings) {
      const pid = f.run.projectId;
      const prev = confirmedFindingsByProject.get(pid) || { confirmedCount: 0, criticalHighCount: 0 };
      prev.confirmedCount += 1;
      if (f.severity === 'critical' || f.severity === 'high') prev.criticalHighCount += 1;
      confirmedFindingsByProject.set(pid, prev);
    }

    const enriched = projects.map((p) => {
      const token = tokenByProject.get(p.id) || { activeTokenCount: 0, lastSeenAt: null };
      const run = latestRunByProject.get(p.id) || { lastRunAt: null, lastRunStatus: null, lastRunRiskScore: null };
      const worstRiskScore = worstRiskByProject.get(p.id) ?? null;
      const findingAgg = confirmedFindingsByProject.get(p.id) || { confirmedCount: 0, criticalHighCount: 0 };

      const setupComplete = token.activeTokenCount > 0 && Boolean(token.lastSeenAt) && Boolean(p.agentTestUrl);

      return {
        ...p,
        activeTokenCount: token.activeTokenCount,
        lastSeenAt: token.lastSeenAt,
        setupComplete,
        lastRunAt: run.lastRunAt,
        lastRunStatus: run.lastRunStatus,
        lastRunRiskScore: run.lastRunRiskScore,
        openFindingsCount: findingAgg.confirmedCount,
        criticalHighCount: findingAgg.criticalHighCount,
        worstRiskScore,
      };
    });

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    // Check project quota
    const quotaCheck = await canCreateProject(orgId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: quotaCheck.reason,
          usage: quotaCheck.usage,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    // Prevent production projects without explicit override
    if (validated.environment === 'prod' && !validated.prodOverrideEnabled) {
      return NextResponse.json(
        { error: 'Production environment requires explicit override confirmation' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        name: validated.name,
        environment: validated.environment,
        agentTestUrl: validated.agentTestUrl,
        toolDomains: validated.toolDomains,
        internalSuffixes: validated.internalSuffixes,
        retentionDays: validated.retentionDays,
        prodOverrideEnabled: validated.prodOverrideEnabled,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
