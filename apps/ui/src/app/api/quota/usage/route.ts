import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getOrgId } from '@/lib/session';
import { getQuotaUsage } from '@/lib/quota-service';

/**
 * GET /api/quota/usage
 * Get current quota usage for the organization
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const orgId = await getOrgId();

    const usage = await getQuotaUsage(orgId);

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching quota usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota usage' },
      { status: 500 }
    );
  }
}
