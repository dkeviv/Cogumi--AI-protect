import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';

// POST /api/projects/[projectId]/validate-agent - Test agent endpoint connectivity
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId } = params;

    // Verify project belongs to org
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (!project.agentTestUrl) {
      return NextResponse.json(
        { error: 'No agent test URL configured' },
        { status: 400 }
      );
    }

    // Try to connect to the agent endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(project.agentTestUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Cogumi-AI-Protect/1.0',
        },
      });

      clearTimeout(timeoutId);

      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        reachable: true,
        responseTime: Date.now(),
      });
    } catch (fetchError: any) {
      // Handle different types of errors
      let errorMessage = 'Unknown error';
      let errorType = 'unknown';

      if (fetchError.name === 'AbortError') {
        errorMessage = 'Request timed out after 10 seconds';
        errorType = 'timeout';
      } else if (fetchError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - is the agent running?';
        errorType = 'connection_refused';
      } else if (fetchError.code === 'ENOTFOUND') {
        errorMessage = 'Host not found - check the URL';
        errorType = 'not_found';
      } else if (fetchError.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out';
        errorType = 'timeout';
      } else {
        errorMessage = fetchError.message || 'Failed to connect';
        errorType = 'error';
      }

      return NextResponse.json({
        success: false,
        reachable: false,
        error: errorMessage,
        errorType,
      });
    }
  } catch (error) {
    console.error('Error validating agent endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to validate agent endpoint' },
      { status: 500 }
    );
  }
}
