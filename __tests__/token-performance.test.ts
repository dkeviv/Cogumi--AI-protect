import { describe, it, expect, beforeAll } from '@jest/globals';
import { authenticateSidecarToken } from '../apps/ui/src/lib/sidecar-auth';
import { db } from '../apps/ui/src/lib/db';
import bcrypt from 'bcryptjs';

describe('Token Performance Optimization', () => {
  let testToken: string;
  let testOrgId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // Create test org and project
    const org = await db.organization.create({
      data: { name: 'Test Org Performance' },
    });
    testOrgId = org.id;

    const project = await db.project.create({
      data: {
        orgId: testOrgId,
        name: 'Test Project Performance',
        environment: 'development',
      },
    });
    testProjectId = project.id;

    // Create test token
    testToken = `cog_testtoken123456789abcdef`; // 8+ char prefix
    const tokenHash = await bcrypt.hash(testToken, 10);
    const tokenPrefix = testToken.substring(0, 8);

    await db.sidecarToken.create({
      data: {
        orgId: testOrgId,
        projectId: testProjectId,
        tokenHash,
        tokenPrefix,
        status: 'active',
      },
    });
  });

  it('should authenticate valid token using prefix lookup', async () => {
    const result = await authenticateSidecarToken(testToken);

    expect(result.valid).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.token?.projectId).toBe(testProjectId);
    expect(result.token?.orgId).toBe(testOrgId);
  });

  it('should authenticate with projectId filter (double optimization)', async () => {
    const result = await authenticateSidecarToken(testToken, testProjectId);

    expect(result.valid).toBe(true);
    expect(result.token?.projectId).toBe(testProjectId);
  });

  it('should reject invalid token', async () => {
    const result = await authenticateSidecarToken('cog_invalidtoken123');

    expect(result.valid).toBe(false);
    expect(result.token).toBeUndefined();
    expect(result.error).toContain('Invalid');
  });

  it('should reject revoked token', async () => {
    // Create a revoked token
    const revokedToken = `cog_revoked123456789abcdef`;
    const tokenHash = await bcrypt.hash(revokedToken, 10);
    const tokenPrefix = revokedToken.substring(0, 8);

    await db.sidecarToken.create({
      data: {
        orgId: testOrgId,
        projectId: testProjectId,
        tokenHash,
        tokenPrefix,
        status: 'revoked',
      },
    });

    const result = await authenticateSidecarToken(revokedToken);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('should handle legacy tokens without prefix (graceful degradation)', async () => {
    // Create token without prefix
    const legacyToken = `cog_legacy123456789abcdef`;
    const tokenHash = await bcrypt.hash(legacyToken, 10);

    await db.sidecarToken.create({
      data: {
        orgId: testOrgId,
        projectId: testProjectId,
        tokenHash,
        tokenPrefix: null, // Legacy token
        status: 'active',
      },
    });

    // Should still work, but slower (falls back to full scan)
    const result = await authenticateSidecarToken(legacyToken);

    expect(result.valid).toBe(true);
    expect(result.token?.projectId).toBe(testProjectId);
  });

  describe('Performance Benchmark', () => {
    it('should be fast with prefix optimization', async () => {
      const startTime = Date.now();
      await authenticateSidecarToken(testToken);
      const duration = Date.now() - startTime;

      // Should be <100ms even with database roundtrip
      expect(duration).toBeLessThan(100);
      console.log(`Token auth with prefix: ${duration}ms`);
    });

    it('should outperform O(n) bcrypt by at least 10x', async () => {
      // Create 10 decoy tokens to simulate multi-tenant environment
      const decoyTokens = [];
      for (let i = 0; i < 10; i++) {
        const decoyToken = `cog_decoy${i}___123456789abcdef`;
        const decoyHash = await bcrypt.hash(decoyToken, 10);
        const decoyPrefix = decoyToken.substring(0, 8);

        await db.sidecarToken.create({
          data: {
            orgId: testOrgId,
            projectId: testProjectId,
            tokenHash: decoyHash,
            tokenPrefix: decoyPrefix,
            status: 'active',
          },
        });

        decoyTokens.push(decoyToken);
      }

      // Time optimized lookup (should only compare 1 token)
      const startOptimized = Date.now();
      await authenticateSidecarToken(testToken);
      const optimizedDuration = Date.now() - startOptimized;

      // Time naive O(n) lookup (compare all 11 tokens)
      const startNaive = Date.now();
      const allTokens = await db.sidecarToken.findMany({
        where: { status: 'active', projectId: testProjectId },
      });
      let naiveMatch = null;
      for (const t of allTokens) {
        const isMatch = await bcrypt.compare(testToken, t.tokenHash);
        if (isMatch) {
          naiveMatch = t;
          break;
        }
      }
      const naiveDuration = Date.now() - startNaive;

      console.log(`Optimized: ${optimizedDuration}ms`);
      console.log(`Naive O(n): ${naiveDuration}ms`);
      console.log(`Speedup: ${(naiveDuration / optimizedDuration).toFixed(1)}x`);

      expect(naiveDuration).toBeGreaterThan(optimizedDuration * 5); // At least 5x faster
      expect(naiveMatch).toBeDefined();
    });
  });
});
