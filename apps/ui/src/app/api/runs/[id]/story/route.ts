import { NextRequest, NextResponse } from "next/server";
import { getStorySteps } from "@/lib/story-builder";
import { getOrgId } from "@/lib/session";

/**
 * GET /api/runs/[id]/story
 * 
 * Returns story steps (narrative timeline) for a run.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = await getOrgId();
    const runId = params.id;

    // Get story steps
    const steps = await getStorySteps(runId);

    // Filter by org
    const orgSteps = steps.filter((s) => s.orgId === orgId);

    return NextResponse.json({
      runId,
      steps: orgSteps,
    });
  } catch (error) {
    console.error("Story fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}
