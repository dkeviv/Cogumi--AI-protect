/**
 * Quota Service
 * Enforces org-level quotas for projects, runs, events, and storage
 */

import { prisma as db } from '@cogumi/db';

export interface QuotaUsage {
  projects: { current: number; limit: number };
  runsThisMonth: { current: number; limit: number };
  events: { current: number; limit: number };
  storageMB: { current: number; limit: number };
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: QuotaUsage;
}

/**
 * Get current quota usage for an organization
 */
export async function getQuotaUsage(orgId: string): Promise<QuotaUsage> {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      maxProjects: true,
      maxRunsPerMonth: true,
      maxEventsPerRun: true,
      maxStorageMB: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  // Count projects
  const projectCount = await db.project.count({
    where: { orgId },
  });

  // Count runs this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const runsThisMonth = await db.run.count({
    where: {
      orgId,
      createdAt: { gte: startOfMonth },
    },
  });

  // Count total events
  const eventCount = await db.event.count({
    where: { orgId },
  });

  // Calculate storage (approximate based on events + reports)
  const reportCount = await db.report.count({
    where: { orgId },
  });

  // Rough estimate: 1KB per event + 50KB per report
  const storageMB = Math.ceil((eventCount + reportCount * 50) / 1024);

  return {
    projects: { current: projectCount, limit: org.maxProjects },
    runsThisMonth: { current: runsThisMonth, limit: org.maxRunsPerMonth },
    events: { current: eventCount, limit: org.maxEventsPerRun * org.maxRunsPerMonth },
    storageMB: { current: storageMB, limit: org.maxStorageMB },
  };
}

/**
 * Check if org can create a new project
 */
export async function canCreateProject(orgId: string): Promise<QuotaCheckResult> {
  const usage = await getQuotaUsage(orgId);

  if (usage.projects.current >= usage.projects.limit) {
    return {
      allowed: false,
      reason: `Project limit reached (${usage.projects.limit} max). Upgrade your plan to create more projects.`,
      usage,
    };
  }

  return { allowed: true, usage };
}

/**
 * Check if org can create a new run
 */
export async function canCreateRun(orgId: string): Promise<QuotaCheckResult> {
  const usage = await getQuotaUsage(orgId);

  if (usage.runsThisMonth.current >= usage.runsThisMonth.limit) {
    return {
      allowed: false,
      reason: `Monthly run limit reached (${usage.runsThisMonth.limit} max). Limit resets on the 1st of each month.`,
      usage,
    };
  }

  if (usage.storageMB.current >= usage.storageMB.limit) {
    return {
      allowed: false,
      reason: `Storage limit reached (${usage.storageMB.limit}MB max). Delete old runs or upgrade your plan.`,
      usage,
    };
  }

  return { allowed: true, usage };
}

/**
 * Check if run can accept more events
 */
export async function canIngestEvents(
  runId: string,
  eventCount: number
): Promise<QuotaCheckResult> {
  const run = await db.run.findUnique({
    where: { id: runId },
    include: {
      project: {
        include: {
          org: {
            select: {
              maxEventsPerRun: true,
            },
          },
        },
      },
    },
  });

  if (!run) {
    return { allowed: false, reason: 'Run not found' };
  }

  const currentEventCount = await db.event.count({
    where: { runId },
  });

  const limit = run.project.org.maxEventsPerRun;

  if (currentEventCount + eventCount > limit) {
    return {
      allowed: false,
      reason: `Event limit per run reached (${limit} max). Run will be stopped.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if org is over storage limit
 */
export async function isOverStorageLimit(orgId: string): Promise<boolean> {
  const usage = await getQuotaUsage(orgId);
  return usage.storageMB.current >= usage.storageMB.limit;
}

/**
 * Get quota limits for an organization
 */
export async function getQuotaLimits(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      maxProjects: true,
      maxRunsPerMonth: true,
      maxEventsPerRun: true,
      maxStorageMB: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  return org;
}
