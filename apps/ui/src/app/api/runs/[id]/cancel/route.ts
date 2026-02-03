import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";

/**
 * POST /api/runs/[id]/cancel
 * 
 * Cancels a running or queued run.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId();
    const runId = params.id;

    // Get run
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

    // Check if run can be canceled
    if (!["queued", "running"].includes(run.status)) {
      return NextResponse.json(
        { error: "Run cannot be canceled", message: `Run is already ${run.status}` },
        { status: 400 }
      );
    }

    // Update run status
    const updatedRun = await db.run.update({
      where: { id: runId },
      data: {
        status: "canceled",
        endedAt: new Date(),
      },
    });

    // TODO: Signal worker to stop execution
    // await runQueue.add('cancel-run', { runId });

    return NextResponse.json({
      ok: true,
      run: {
        id: updatedRun.id,
        status: updatedRun.status,
      },
    });
  } catch (error) {
    console.error("Run cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
