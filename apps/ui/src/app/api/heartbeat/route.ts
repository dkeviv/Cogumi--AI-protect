import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import bcrypt from 'bcryptjs';

// POST /api/heartbeat - Sidecar pings to update lastSeenAt
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const providedToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Find all active tokens and check against them
    const tokens = await prisma.sidecarToken.findMany({
      where: { status: 'active' },
    });

    let matchedToken = null;
    for (const token of tokens) {
      const isValid = await bcrypt.compare(providedToken, token.tokenHash);
      if (isValid) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Update lastSeenAt
    await prisma.sidecarToken.update({
      where: { id: matchedToken.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      projectId: matchedToken.projectId,
      orgId: matchedToken.orgId,
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}
