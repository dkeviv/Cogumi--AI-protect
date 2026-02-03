import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/session';
import { getQuotaUsage } from '@/lib/quota-enforcement';

/**
 * GET /api/quotas
 * 
 * Returns current quota usage for the organization
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usage = await getQuotaUsage(orgId);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Failed to get quota usage:', error);
    return NextResponse.json(
      { error: 'Failed to get quota usage' },
      { status: 500 }
    );
  }
}
