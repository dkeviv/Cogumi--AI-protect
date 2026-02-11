import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrgId } from '@/lib/session';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const anyDb = db as any;
    const orgId = await getOrgId();
    const id = params.id;

    const existing = await anyDb.savedPrompt.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await anyDb.savedPrompt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Saved prompt delete error:', error);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}

