import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";

/**
 * GET /api/runs/[id]/events
 * 
 * Returns raw events for a run.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId();
    const runId = params.id;

    // Get events for this run
    const events = await db.event.findMany({
      where: {
        runId,
        orgId,
      },
      orderBy: [{ seq: "asc" }, { ts: "asc" }],
    });

    return NextResponse.json({
      runId,
      events,
    });
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
