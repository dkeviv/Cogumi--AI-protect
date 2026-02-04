import { prisma } from "@cogumi/db";

/**
 * Report Generator
 * 
 * Generates professional markdown reports from pentest run results.
 * Re-exported from apps/ui until full migration is complete.
 */

/**
 * Generate a complete markdown report for a run
 */
export async function generateReport(runId: string): Promise<string> {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      project: { select: { name: true, environment: true } },
    },
  });

  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  const [storySteps, findings, scriptResults] = await Promise.all([
    prisma.storyStep.findMany({ where: { runId }, orderBy: { ts: "asc" } }),
    prisma.finding.findMany({ where: { runId }, orderBy: [{ severity: "asc" }, { createdAt: "desc" }] }),
    prisma.scriptResult.findMany({ where: { runId }, orderBy: { scriptId: "asc" } }),
  ]);

  // Build simplified report
  const sections: string[] = [];
  sections.push(`# AI Agent Security Assessment Report\n`);
  sections.push(`**Project:** ${run.project.name}`);
  sections.push(`**Environment:** ${run.project.environment}`);
  sections.push(`**Run ID:** ${run.id}\n`);
  sections.push(`**Risk Score:** ${run.riskScore || "N/A"}/100\n`);
  sections.push(`**Findings:** ${findings.length} total\n`);
  
  const markdown = sections.join("\n");

  // Store report
  await prisma.report.upsert({
    where: { runId },
    create: { orgId: run.orgId, runId, format: "markdown", contentMd: markdown },
    update: { contentMd: markdown, generatedAt: new Date() },
  });

  return markdown;
}

/**
 * Get existing report for a run
 */
export async function getReport(runId: string): Promise<string | null> {
  const report = await prisma.report.findUnique({ where: { runId } });
  return report?.contentMd || null;
}
