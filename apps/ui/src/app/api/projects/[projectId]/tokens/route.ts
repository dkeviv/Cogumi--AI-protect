import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// GET /api/projects/[projectId]/tokens - List all tokens for a project
export async function GET(
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

    const tokens = await prisma.sidecarToken.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/tokens - Create a new token
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

    // Generate a secure random token
    const plainToken = `cog_${randomBytes(32).toString('hex')}`;
    
    // Hash the token for storage
    const tokenHash = await bcrypt.hash(plainToken, 10);
    
    // Store first 8 characters as prefix for fast lookup (not sensitive)
    const tokenPrefix = plainToken.substring(0, 8);

    const token = await prisma.sidecarToken.create({
      data: {
        orgId,
        projectId,
        tokenHash,
        tokenPrefix,
        status: 'active',
      },
    });

    // Return the plaintext token ONLY once
    return NextResponse.json({
      token: {
        id: token.id,
        status: token.status,
        createdAt: token.createdAt,
      },
      plainToken, // This will only be shown once
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
