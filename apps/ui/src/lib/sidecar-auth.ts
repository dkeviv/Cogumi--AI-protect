/**
 * Sidecar Token Authentication Helper
 * 
 * Provides optimized token lookup using prefix matching to avoid
 * expensive bcrypt comparisons on every request.
 */

import { prisma } from '@cogumi/db';
import bcrypt from 'bcryptjs';

export interface TokenAuthResult {
  valid: boolean;
  token?: {
    id: string;
    orgId: string;
    projectId: string;
  };
  error?: string;
}

/**
 * Authenticate sidecar token with optimization
 * 
 * Performance optimization:
 * - Extract first 8 chars as prefix (not sensitive)
 * - Filter tokens by prefix before bcrypt compare
 * - Reduces O(n) bcrypt comparisons to O(1) for most cases
 * 
 * @param token - The plaintext token from request
 * @param projectId - Optional projectId to further narrow search
 * @returns Authentication result with token details if valid
 */
export async function authenticateSidecarToken(
  token: string,
  projectId?: string
): Promise<TokenAuthResult> {
  if (!token) {
    return { valid: false, error: 'Missing token' };
  }

  // Extract prefix (first 8 chars) for fast lookup
  const tokenPrefix = token.substring(0, 8);

  // Build query with prefix filter
  const where: any = {
    status: 'active',
    tokenPrefix, // Fast index lookup
  };

  if (projectId) {
    where.projectId = projectId; // Further narrow if project known
  }

  // Fetch only tokens matching the prefix
  const candidates = await prisma.sidecarToken.findMany({
    where,
    select: {
      id: true,
      orgId: true,
      projectId: true,
      tokenHash: true,
    },
  });

  // No candidates with matching prefix
  if (candidates.length === 0) {
    return { valid: false, error: 'Invalid or revoked token' };
  }

  // Verify with bcrypt (usually just 1 comparison now)
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(token, candidate.tokenHash);
    if (isMatch) {
      return {
        valid: true,
        token: {
          id: candidate.id,
          orgId: candidate.orgId,
          projectId: candidate.projectId,
        },
      };
    }
  }

  return { valid: false, error: 'Invalid or revoked token' };
}

/**
 * Extract and validate token from request headers
 * 
 * Supports both:
 * - Authorization: Bearer <token>
 * - X-Sidecar-Token: <token>
 */
export function extractSidecarToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  const sidecarHeader = request.headers.get('x-sidecar-token');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return sidecarHeader;
}
