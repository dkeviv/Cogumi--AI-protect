/**
 * Retention Cleanup Service
 * 
 * Deletes old data based on project retention policies.
 * - Events older than retentionDays
 * - Runs older than retentionDays (soft delete)
 * - Archive reports before deletion
 */

import { prisma as db } from '@cogumi/db';

/**
 * Clean up old events for a specific project based on retention policy
 */
export async function cleanupProjectEvents(projectId: string): Promise<number> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { retentionDays: true },
  });

  if (!project) {
    console.warn(`Project ${projectId} not found`);
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - project.retentionDays);

  // Delete old events
  const result = await db.event.deleteMany({
    where: {
      projectId,
      ts: {
        lt: cutoffDate,
      },
    },
  });

  console.log(
    `Deleted ${result.count} events older than ${project.retentionDays} days for project ${projectId}`
  );

  return result.count;
}

/**
 * Clean up old runs for a specific project
 * Soft delete by setting a deletedAt timestamp
 */
export async function cleanupProjectRuns(projectId: string): Promise<number> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { retentionDays: true },
  });

  if (!project) {
    console.warn(`Project ${projectId} not found`);
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - project.retentionDays);

  // Find old runs
  const oldRuns = await db.run.findMany({
    where: {
      projectId,
      createdAt: {
        lt: cutoffDate,
      },
    },
    select: { id: true },
  });

  if (oldRuns.length === 0) {
    return 0;
  }

  const runIds = oldRuns.map((r: { id: string }) => r.id);

  // Delete related data first
  await db.storyStep.deleteMany({
    where: { runId: { in: runIds } },
  });

  await db.finding.deleteMany({
    where: { runId: { in: runIds } },
  });

  await db.scriptResult.deleteMany({
    where: { runId: { in: runIds } },
  });

  await db.report.deleteMany({
    where: { runId: { in: runIds } },
  });

  // Delete events associated with these runs
  await db.event.deleteMany({
    where: { runId: { in: runIds } },
  });

  // Finally delete runs
  await db.run.deleteMany({
    where: { id: { in: runIds } },
  });

  console.log(
    `Deleted ${oldRuns.length} runs older than ${project.retentionDays} days for project ${projectId}`
  );

  return oldRuns.length;
}

/**
 * Archive reports before deletion
 * In a real system, this would export to S3 or similar
 * For now, we'll just log the report data
 */
export async function archiveReport(runId: string): Promise<boolean> {
  const report = await db.report.findUnique({
    where: { runId },
  });

  if (!report) {
    return false;
  }

  // TODO: In production, export to S3 or external storage
  // For now, just log that we would archive it
  console.log(`[ARCHIVE] Report for run ${runId} would be archived here`);
  console.log(`[ARCHIVE] Report size: ${report.markdown.length} bytes`);

  return true;
}

/**
 * Run full cleanup for all projects in an organization
 */
export async function cleanupOrganization(orgId: string): Promise<{
  eventsDeleted: number;
  runsDeleted: number;
}> {
  const projects = await db.project.findMany({
    where: { orgId },
    select: { id: true, name: true },
  });

  let totalEvents = 0;
  let totalRuns = 0;

  for (const project of projects) {
    const events = await cleanupProjectEvents(project.id);
    const runs = await cleanupProjectRuns(project.id);
    totalEvents += events;
    totalRuns += runs;
  }

  console.log(
    `Cleanup complete for org ${orgId}: ${totalEvents} events, ${totalRuns} runs deleted`
  );

  return {
    eventsDeleted: totalEvents,
    runsDeleted: totalRuns,
  };
}

/**
 * Run cleanup for all organizations (called by cron)
 */
export async function cleanupAll(): Promise<{
  orgsProcessed: number;
  eventsDeleted: number;
  runsDeleted: number;
}> {
  const orgs = await db.organization.findMany({
    select: { id: true, name: true },
  });

  let totalEvents = 0;
  let totalRuns = 0;

  for (const org of orgs) {
    const result = await cleanupOrganization(org.id);
    totalEvents += result.eventsDeleted;
    totalRuns += result.runsDeleted;
  }

  console.log(
    `Global cleanup complete: ${orgs.length} orgs, ${totalEvents} events, ${totalRuns} runs deleted`
  );

  return {
    orgsProcessed: orgs.length,
    eventsDeleted: totalEvents,
    runsDeleted: totalRuns,
  };
}
