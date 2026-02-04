import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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
    // Extract token from headers
    const authHeader = req.headers.get("authorization");
    const sidecarHeader = req.headers.get("x-sidecar-token");
    
    const token = authHeader?.replace("Bearer ", "") || sidecarHeader;
    
    if (!token) {
      return NextResponse.json(
        { error: "Missing sidecar token" },
        { status: 401 }
      );
    }

    // Find active token by comparing hash
    // Note: This is O(n) but for config endpoint (called once on startup), it's acceptable
    const allTokens = await db.sidecarToken.findMany({
      where: { status: "active" },
      select: {
        id: true,
        orgId: true,
        projectId: true,
        tokenHash: true,
      },
    });

    let matchedToken = null;
    for (const t of allTokens) {
      const isMatch = await bcrypt.compare(token, t.tokenHash);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: "Invalid or revoked token" },
        { status: 401 }
      );
    }

    // Fetch project configuration
    const project = await db.project.findUnique({
      where: { id: matchedToken.projectId },
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
