import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";

/**
 * GET /api/runs/[id]
 * 
 * Get run details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();
    const runId = params.id;

    const run = await anyDb.run.findFirst({
      where: {
        id: runId,
        orgId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            environment: true,
            agentTestUrl: true,
            toolDomains: true,
            internalSuffixes: true,
            redTeamConfig: {
              select: {
                enabledStyleIds: true,
                intensity: true,
                versionPin: true,
              },
            },
          },
        },
        results: {
          select: {
            id: true,
            scriptId: true,
            score: true,
            severity: true,
            status: true,
            summary: true,
            createdAt: true,
          },
          orderBy: { scriptId: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      run,
    });
  } catch (error) {
    console.error("Run fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
