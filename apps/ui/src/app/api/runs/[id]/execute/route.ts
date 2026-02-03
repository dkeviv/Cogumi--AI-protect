import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";
import { enqueueRunExecution } from "@/lib/queue";

/**
 * POST /api/runs/[id]/execute
 * 
 * Trigger run execution via BullMQ worker queue.
 * Jobs are processed asynchronously with automatic retries.
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

    // Enqueue run execution to BullMQ
    const job = await enqueueRunExecution(runId);

    console.log(`Enqueued run ${runId} for execution (job ${job.id})`);

    return NextResponse.json({
      ok: true,
      message: "Run enqueued for execution",
      run: {
        id: run.id,
        status: "queued",
      },
      job: {
        id: job.id,
        queueName: "run-execution",
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
