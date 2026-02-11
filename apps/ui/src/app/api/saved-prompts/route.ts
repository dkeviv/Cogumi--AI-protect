import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getOrgId } from '@/lib/session';

const CreateSavedPromptSchema = z.object({
  projectId: z.string().optional(),
  kind: z.enum(['adversary', 'agent']),
  title: z.string().min(1).max(120),
  promptText: z.string().min(1).max(20000),
  tags: z.array(z.string().min(1).max(32)).optional(),
  scriptId: z.string().optional(),
  scriptStepId: z.string().optional(),
  sourceRunId: z.string().optional(),
  sourceEventId: z.string().optional(),
});

export async function GET() {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();

    const prompts = await anyDb.savedPrompt.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Saved prompts list error:', error);
    return NextResponse.json({ error: 'Failed to load saved prompts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();
    const body = await req.json();
    const parsed = CreateSavedPromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.errors }, { status: 400 });
    }

    const created = await anyDb.savedPrompt.create({
      data: {
        orgId,
        projectId: parsed.data.projectId ?? null,
        kind: parsed.data.kind,
        title: parsed.data.title,
        promptText: parsed.data.promptText,
        tags: parsed.data.tags ?? [],
        scriptId: parsed.data.scriptId ?? null,
        scriptStepId: parsed.data.scriptStepId ?? null,
        sourceRunId: parsed.data.sourceRunId ?? null,
        sourceEventId: parsed.data.sourceEventId ?? null,
      },
    });

    return NextResponse.json({ prompt: created });
  } catch (error) {
    console.error('Saved prompt create error:', error);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}

