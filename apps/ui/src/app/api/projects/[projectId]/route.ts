import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';
import { z } from 'zod';

// Validation schema for updating a project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment: z.enum(['sandbox', 'staging', 'prod']).optional(),
  agentTestUrl: z.string().url().nullable().optional(),
  toolDomains: z.array(z.string()).optional(),
  internalSuffixes: z.array(z.string()).optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
  prodOverrideEnabled: z.boolean().optional(),
});

// GET /api/projects/[projectId] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            runs: true,
            tokens: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Verify the project belongs to the user's organization
    if (project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId } = params;

    // Verify project exists and belongs to org
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (existingProject.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

    // Prevent changing to production without override
    if (
      validated.environment === 'prod' &&
      !validated.prodOverrideEnabled &&
      existingProject.environment !== 'prod'
    ) {
      return NextResponse.json(
        { error: 'Production environment requires explicit override confirmation' },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: validated,
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireAuth();
    const orgId = await getOrgId();
    const { projectId } = params;

    // Verify project exists and belongs to org
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (existingProject.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
