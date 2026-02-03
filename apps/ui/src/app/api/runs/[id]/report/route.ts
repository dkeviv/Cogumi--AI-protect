import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import { db } from "@/lib/db";
import { generateReport, getReport } from "@/lib/report-generator";

/**
 * POST /api/runs/[id]/report
 * 
 * Generates a markdown report for the run.
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

    // Check if run is completed
    if (!["completed", "failed", "stopped_quota"].includes(run.status)) {
      return NextResponse.json(
        {
          error: "Report cannot be generated",
          message: "Run must be completed before generating a report",
        },
        { status: 400 }
      );
    }

    // Generate report
    const markdown = await generateReport(runId);

    return NextResponse.json({
      ok: true,
      report: {
        format: "markdown",
        content_md: markdown,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/runs/[id]/report
 * 
 * Retrieves the generated report for a run.
 */
export async function GET(
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

    // Get existing report
    const markdown = await getReport(runId);

    if (!markdown) {
      return NextResponse.json(
        {
          error: "Report not found",
          message: "Generate a report first using POST /api/runs/:id/report",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      report: {
        format: "markdown",
        content_md: markdown,
      },
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
