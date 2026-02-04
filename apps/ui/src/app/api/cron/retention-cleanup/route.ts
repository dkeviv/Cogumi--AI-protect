import { NextRequest, NextResponse } from 'next/server';
import { cleanupAll } from '@/lib/retention-cleanup';

/**
 * POST /api/cron/retention-cleanup
 * 
 * Runs retention cleanup for all projects
 * Should be called by a cron job (e.g., daily)
 * 
 * SECURITY: Requires CRON_SECRET environment variable and matching X-Cron-Secret header.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (REQUIRED in all environments)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[Cron] CRON_SECRET environment variable not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      );
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.warn('[Cron] Unauthorized cleanup attempt');
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
    auth: 'X-Cron-Secret header REQUIRED (matching CRON_SECRET env var)',
    description: 'Runs retention cleanup for all projects based on retentionDays setting',
    security: 'This endpoint requires authentication in all environments',
  });
}
