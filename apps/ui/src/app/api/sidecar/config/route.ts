import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateSidecarToken, extractSidecarToken } from "@/lib/sidecar-auth";

/**
 * GET /api/sidecar/config
 * 
 * Returns project configuration for sidecar (tool domains, internal suffixes).
 * Authenticated with sidecar token.
 * 
 * This allows sidecar to dynamically classify destinations based on
 * customer-configured tool domains and internal network patterns.
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractSidecarToken(req);
    
    if (!token) {
      return NextResponse.json(
        { error: "Missing sidecar token" },
        { status: 401 }
      );
    }

    const auth = await authenticateSidecarToken(token);

    if (!auth.valid || !auth.token) {
      return NextResponse.json(
        { error: auth.error || "Invalid or revoked token" },
        { status: 401 }
      );
    }

    // Fetch project configuration
    const project = await db.project.findUnique({
      where: { id: auth.token.projectId },
      select: {
        id: true,
        name: true,
        toolDomains: true,
        internalSuffixes: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Return config
    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      toolDomains: project.toolDomains || [],
      internalSuffixes: project.internalSuffixes || [],
    });
  } catch (error) {
    console.error("Error fetching sidecar config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
