import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getOrgId } from '@/lib/session';

const PatchFindingSchema = z.object({
  triageStatus: z.enum(['open', 'fixed', 'accepted']).optional(),
  ownerUserId: z.string().nullable().optional(),
  eta: z.string().datetime().nullable().optional(),
  whyItWorks: z.string().max(4000).nullable().optional(),
  verificationStep: z.string().max(4000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();
    const id = params.id;

    const body = await req.json();
    const parsed = PatchFindingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.errors }, { status: 400 });
    }

    const existing = await anyDb.finding.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

    const updated = await anyDb.finding.update({
      where: { id },
      data: {
        triageStatus: parsed.data.triageStatus,
        ownerUserId: parsed.data.ownerUserId === undefined ? undefined : parsed.data.ownerUserId,
        eta: parsed.data.eta === undefined ? undefined : (parsed.data.eta ? new Date(parsed.data.eta) : null),
        whyItWorks: parsed.data.whyItWorks === undefined ? undefined : parsed.data.whyItWorks,
        verificationStep: parsed.data.verificationStep === undefined ? undefined : parsed.data.verificationStep,
      },
    });

    return NextResponse.json({ finding: updated });
  } catch (error) {
    console.error('Finding patch error:', error);
    return NextResponse.json({ error: 'Failed to update finding' }, { status: 500 });
  }
}

