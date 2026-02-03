import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';

// PATCH /api/projects/[projectId]/tokens/[tokenId] - Revoke a token
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; tokenId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId, tokenId } = params;

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

    // Verify token belongs to this project
    const existingToken = await prisma.sidecarToken.findUnique({
      where: { id: tokenId },
    });

    if (!existingToken || existingToken.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Update token status to revoked
    const token = await prisma.sidecarToken.update({
      where: { id: tokenId },
      data: { status: 'revoked' },
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error revoking token:', error);
    return NextResponse.json(
      { error: 'Failed to revoke token' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/tokens/[tokenId] - Delete a token
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; tokenId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId, tokenId } = params;

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

    // Verify token belongs to this project
    const existingToken = await prisma.sidecarToken.findUnique({
      where: { id: tokenId },
    });

    if (!existingToken || existingToken.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    await prisma.sidecarToken.delete({
      where: { id: tokenId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
