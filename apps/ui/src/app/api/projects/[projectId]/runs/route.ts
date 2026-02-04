import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/session";
import { z } from "zod";
import { canCreateRun } from "@/lib/quota-service";

const CreateRunSchema = z.object({
  mode: z.enum(["campaign"]).optional().default("campaign"),
});

/**
 * POST /api/projects/[projectId]/runs
 * 
 * Creates a new pentest run for a project.
 * 
 * Checks:
 * - Environment guardrails (prod requires override)
 * - Quota limits (runs/day)
 * 
 * Returns: { run: { id, status: "queued" } }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const orgId = await getOrgId();
    const projectId = params.projectId;

    // Validate request body
    const body = await req.json();
    const validation = CreateRunSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Get project
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        orgId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check environment guardrails
    if (project.environment === "prod" && !project.prodOverrideEnabled) {
      return NextResponse.json(
        {
          error: "Production runs disabled",
          message: "Enable production override in project settings to run tests in production",
        },
        { status: 403 }
      );
    }

    // Check all quotas (monthly runs, storage)
    const quotaCheck = await canCreateRun(orgId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: "Quota exceeded",
          message: quotaCheck.reason,
          usage: quotaCheck.usage,
        },
        { status: 429 }
      );
    }

    // Create run
    const run = await db.run.create({
      data: {
        orgId,
        projectId,
        status: "queued",
        createdBy: "user", // TODO: get actual user ID from session
      },
    });

    // TODO: Enqueue run job for worker to pick up
    // await runQueue.add('execute-run', { runId: run.id });

    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        createdAt: run.createdAt,
      },
    });
  } catch (error) {
    console.error("Run creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/runs
 * 
 * Lists all runs for a project.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const orgId = await getOrgId();
    const projectId = params.projectId;

    // Verify project belongs to org
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        orgId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get runs
    const runs = await db.run.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent 50 runs
    });

    return NextResponse.json({
      runs,
    });
  } catch (error) {
    console.error("Runs list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
