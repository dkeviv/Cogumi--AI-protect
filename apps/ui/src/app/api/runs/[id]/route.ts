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
    const orgId = await getOrgId();
    const runId = params.id;

    const run = await db.run.findFirst({
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
          },
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
