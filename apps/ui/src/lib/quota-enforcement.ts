/**
 * Quota Enforcement Service
 * 
 * Enforces org-level and project-level quotas:
 * - Runs per day (project-level)
 * - Runs per month (org-level)
 * - Events per run (org-level)
 * - Storage per org (org-level)
 * - Projects per org (org-level)
 */

import { prisma as db } from '@cogumi/db';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

/**
 * Check if org can create a new project
 */
export async function checkProjectQuota(orgId: string): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      projects: {
        select: { id: true },
      },
    },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const currentProjects = org.projects.length;
  const limit = org.maxProjects;

  if (currentProjects >= limit) {
    return {
      allowed: false,
      reason: `Maximum ${limit} projects exceeded`,
      current: currentProjects,
      limit,
    };
  }

  return { allowed: true };
}

/**
 * Check if project can create a new run (daily limit)
 */
export async function checkDailyRunQuota(projectId: string): Promise<QuotaCheckResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const runsToday = await db.run.count({
    where: {
      projectId,
      createdAt: {
        gte: today,
      },
    },
  });

  const MAX_RUNS_PER_DAY = 10;

  if (runsToday >= MAX_RUNS_PER_DAY) {
    return {
      allowed: false,
      reason: `Maximum ${MAX_RUNS_PER_DAY} runs per day exceeded`,
      current: runsToday,
      limit: MAX_RUNS_PER_DAY,
    };
  }

  return { allowed: true };
}

/**
 * Check if org can create a new run (monthly limit)
 */
export async function checkMonthlyRunQuota(orgId: string): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const runsThisMonth = await db.run.count({
    where: {
      orgId,
      createdAt: {
        gte: firstDayOfMonth,
      },
    },
  });

  const limit = org.maxRunsPerMonth;

  if (runsThisMonth >= limit) {
    return {
      allowed: false,
      reason: `Maximum ${limit} runs per month exceeded`,
      current: runsThisMonth,
      limit,
    };
  }

  return { allowed: true };
}

/**
 * Check if run can accept more events
 */
export async function checkEventQuota(
  runId: string,
  orgId: string,
  additionalEvents: number = 1
): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const currentEvents = await db.event.count({
    where: { runId },
  });

  const limit = org.maxEventsPerRun;

  if (currentEvents + additionalEvents > limit) {
    return {
      allowed: false,
      reason: `Maximum ${limit} events per run exceeded`,
      current: currentEvents,
      limit,
    };
  }

  return { allowed: true };
}

/**
 * Check org storage usage
 * Approximation: count events + findings + story steps
 */
export async function checkStorageQuota(orgId: string): Promise<QuotaCheckResult> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  // Rough estimate: count all data rows
  const [eventCount, findingCount, storyStepCount] = await Promise.all([
    db.event.count({
      where: { orgId },
    }),
    db.finding.count({
      where: { orgId },
    }),
    db.storyStep.count({
      where: { orgId },
    }),
  ]);

  // Estimate: ~1KB per event, ~500B per finding, ~300B per story step
  const estimatedMB = Math.ceil(
    (eventCount * 1024 + findingCount * 512 + storyStepCount * 300) / (1024 * 1024)
  );

  const limit = org.maxStorageMB;

  if (estimatedMB >= limit) {
    return {
      allowed: false,
      reason: `Maximum ${limit}MB storage exceeded`,
      current: estimatedMB,
      limit,
    };
  }

  return { allowed: true };
}

/**
 * Run all quota checks for creating a new run
 */
export async function checkRunCreationQuotas(
  orgId: string,
  projectId: string
): Promise<QuotaCheckResult> {
  // Check daily project quota
  const dailyCheck = await checkDailyRunQuota(projectId);
  if (!dailyCheck.allowed) return dailyCheck;

  // Check monthly org quota
  const monthlyCheck = await checkMonthlyRunQuota(orgId);
  if (!monthlyCheck.allowed) return monthlyCheck;

  // Check storage quota
  const storageCheck = await checkStorageQuota(orgId);
  if (!storageCheck.allowed) return storageCheck;

  return { allowed: true };
}

/**
 * Get quota usage summary for an org
 */
export async function getQuotaUsage(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      projects: {
        select: { id: true },
      },
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const [runsThisMonth, eventCount, findingCount, storyStepCount] = await Promise.all([
    db.run.count({
      where: {
        orgId,
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
    }),
    db.event.count({ where: { orgId } }),
    db.finding.count({ where: { orgId } }),
    db.storyStep.count({ where: { orgId } }),
  ]);

  const estimatedMB = Math.ceil(
    (eventCount * 1024 + findingCount * 512 + storyStepCount * 300) / (1024 * 1024)
  );

  return {
    projects: {
      current: org.projects.length,
      limit: org.maxProjects,
      percentage: Math.round((org.projects.length / org.maxProjects) * 100),
    },
    runsPerMonth: {
      current: runsThisMonth,
      limit: org.maxRunsPerMonth,
      percentage: Math.round((runsThisMonth / org.maxRunsPerMonth) * 100),
    },
    storage: {
      current: estimatedMB,
      limit: org.maxStorageMB,
      percentage: Math.round((estimatedMB / org.maxStorageMB) * 100),
    },
  };
}
