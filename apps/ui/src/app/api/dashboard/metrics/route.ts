import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';

/**
 * GET /api/dashboard/metrics
 * 
 * Returns dashboard metrics for the current organization:
 * - Total projects
 * - Runs this week
 * - Open findings
 * - Worst risk score
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    // Calculate metrics
    const [totalProjects, runsThisWeek, openFindings, worstRiskScoreRun] = await Promise.all([
      // Total projects
      prisma.project.count({
        where: { orgId },
      }),

      // Runs this week
      prisma.run.count({
        where: {
          orgId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Open findings (confirmed findings count)
      prisma.finding.count({
        where: {
          orgId,
          status: 'confirmed',
        },
      }),

      // Worst risk score (get highest risk score from runs)
      prisma.run.findFirst({
        where: {
          orgId,
          riskScore: {
            not: null,
          },
        },
        orderBy: {
          riskScore: 'desc',
        },
        select: {
          riskScore: true,
        },
      }),
    ]);

    const metrics = {
      totalProjects,
      runsThisWeek,
      openFindings,
      worstRiskScore: worstRiskScoreRun?.riskScore ?? null,
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
