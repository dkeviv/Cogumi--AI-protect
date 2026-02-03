import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";

/**
 * GET /api/runs/[id]/findings
 * 
 * Returns security findings for a run.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId();
    const runId = params.id;

    // Get findings for this run
    const findings = await db.finding.findMany({
      where: {
        runId,
        orgId,
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      runId,
      findings,
    });
  } catch (error) {
    console.error("Findings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch findings" },
      { status: 500 }
    );
  }
}
