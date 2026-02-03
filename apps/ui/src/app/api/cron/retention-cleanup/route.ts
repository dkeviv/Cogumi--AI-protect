import { NextRequest, NextResponse } from 'next/server';
import { cleanupAll } from '@/lib/retention-cleanup';

/**
 * POST /api/cron/retention-cleanup
 * 
 * Runs retention cleanup for all projects
 * Should be called by a cron job (e.g., daily)
 * 
 * Auth: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (in production, use a proper secret)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET || 'dev-secret-change-in-prod';

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting retention cleanup...');

    // Run cleanup for all organizations
    const result = await cleanupAll();

    console.log('[Cron] Retention cleanup complete');

    return NextResponse.json({
      success: true,
      stats: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Retention cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/retention-cleanup
 * Health check for the cron endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/cron/retention-cleanup',
    method: 'POST',
    auth: 'x-cron-secret header required',
    description: 'Runs retention cleanup for all projects based on retentionDays setting',
  });
}
