import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";
import { executeRun } from "@/lib/run-orchestrator";

/**
 * POST /api/runs/[id]/execute
 * 
 * Manually trigger run execution.
 * 
 * In production, this would be handled by a worker queue (BullMQ).
 * For MVP, this endpoint allows triggering runs directly.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId();
    const runId = params.id;

    // Verify run belongs to org
    const run = await db.run.findFirst({
      where: {
        id: runId,
        orgId,
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 }
      );
    }

    // Check run status
    if (run.status !== "queued") {
      return NextResponse.json(
        {
          error: "Run cannot be executed",
          message: `Run is ${run.status}. Only queued runs can be executed.`,
        },
        { status: 400 }
      );
    }

    // Execute run asynchronously (don't wait for completion)
    // In production, this would enqueue to BullMQ
    executeRun(runId).catch((error) => {
      console.error(`Run ${runId} execution failed:`, error);
    });

    return NextResponse.json({
      ok: true,
      message: "Run execution started",
      run: {
        id: run.id,
        status: "running",
      },
    });
  } catch (error) {
    console.error("Run execution trigger error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
