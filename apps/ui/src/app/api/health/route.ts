/**
 * Health Check Endpoint for Docker
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@cogumi/db';

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring and container orchestration.
 * Returns 200 if the application and database are healthy.
 */
export async function GET(req: NextRequest) {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
