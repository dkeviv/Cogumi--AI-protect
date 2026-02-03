import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';
import { requireAuth, getOrgId } from '@/lib/session';
import { z } from 'zod';
import { canCreateProject } from '@/lib/quota-service';

// Validation schema for creating a project
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  environment: z.enum(['sandbox', 'staging', 'prod']).default('sandbox'),
  agentTestUrl: z.string().url().optional(),
  toolDomains: z.array(z.string()).default([]),
  internalSuffixes: z.array(z.string()).default([]),
  retentionDays: z.number().int().min(1).max(365).default(7),
  prodOverrideEnabled: z.boolean().default(false),
});

// GET /api/projects - List all projects for the current organization
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    const projects = await prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        environment: true,
        agentTestUrl: true,
        prodOverrideEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            runs: true,
          },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    // Check project quota
    const quotaCheck = await canCreateProject(orgId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: quotaCheck.reason,
          usage: quotaCheck.usage,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    // Prevent production projects without explicit override
    if (validated.environment === 'prod' && !validated.prodOverrideEnabled) {
      return NextResponse.json(
        { error: 'Production environment requires explicit override confirmation' },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        name: validated.name,
        environment: validated.environment,
        agentTestUrl: validated.agentTestUrl,
        toolDomains: validated.toolDomains,
        internalSuffixes: validated.internalSuffixes,
        retentionDays: validated.retentionDays,
        prodOverrideEnabled: validated.prodOverrideEnabled,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
