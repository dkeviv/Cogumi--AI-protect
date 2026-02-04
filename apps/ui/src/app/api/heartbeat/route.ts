import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { authenticateSidecarToken, extractSidecarToken } from '@/lib/sidecar-auth';

// POST /api/heartbeat - Sidecar pings to update lastSeenAt
export async function POST(request: NextRequest) {
  try {
    const providedToken = extractSidecarToken(request);
    
    if (!providedToken) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const auth = await authenticateSidecarToken(providedToken);

    if (!auth.valid || !auth.token) {
      return NextResponse.json(
        { error: auth.error || 'Invalid token' },
        { status: 401 }
      );
    }

    // Update lastSeenAt
    await prisma.sidecarToken.update({
      where: { id: auth.token.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      projectId: auth.token.projectId,
      orgId: auth.token.orgId,
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}
