import { NextRequest, NextResponse } from 'next/server';
import { cleanupAll } from '@/lib/retention-cleanup';

/**
 * POST /api/cron/cleanup
 * 
 * Runs retention cleanup for all organizations.
 * Should be called by a cron job (e.g., daily at midnight).
 * 
 * In production, protect this endpoint with a secret token.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting retention cleanup...');
    const result = await cleanupAll();
    console.log('[CRON] Cleanup complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup (for manual testing)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger cleanup',
    info: 'Set X-Cron-Secret header if CRON_SECRET env var is configured',
  });
}
