import { db } from "@/lib/db";
import type { Run, StoryStep, Finding, ScriptResult } from "@cogumi/db";

/**
 * Report Generator
 * 
 * Generates professional markdown reports from pentest run results.
 * 
 * Report includes:
 * - Executive summary
 * - Environment and scope
 * - Risk score and severity breakdown
 * - Detailed findings with evidence
 * - Script results
 * - Remediation guidance
 * - Disclaimer and limitations
 */

interface ReportData {
  run: Run & {
    project: {
      name: string;
      environment: string;
    };
  };
  storySteps: StoryStep[];
  findings: Finding[];
  scriptResults: ScriptResult[];
}

/**
 * Generate a complete markdown report for a run
 */
export async function generateReport(runId: string): Promise<string> {
  // Fetch all data needed for report
  const run = await db.run.findUnique({
    where: { id: runId },
    include: {
      project: {
        select: {
          name: true,
          environment: true,
        },
      },
    },
  });

  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  const [storySteps, findings, scriptResults] = await Promise.all([
    db.storyStep.findMany({
      where: { runId },
      orderBy: { ts: "asc" },
    }),
    db.finding.findMany({
      where: { runId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    }),
    db.scriptResult.findMany({
      where: { runId },
      orderBy: { scriptId: "asc" },
    }),
  ]);

  const reportData: ReportData = {
    run,
    storySteps,
    findings,
    scriptResults,
  };

  // Build markdown report
  const markdown = buildMarkdownReport(reportData);

  // Store report in database
  await db.report.upsert({
    where: { runId },
    create: {
      orgId: run.orgId,
      runId,
      format: "markdown",
      contentMd: markdown,
    },
    update: {
      contentMd: markdown,
      generatedAt: new Date(),
    },
  });

  return markdown;
}

/**
 * Build markdown report from data
 */
function buildMarkdownReport(data: ReportData): string {
  const { run, storySteps, findings, scriptResults } = data;

  const sections: string[] = [];

  // Header
  sections.push(`# AI Agent Security Assessment Report`);
  sections.push(``);
  sections.push(`**Project:** ${run.project.name}`);
  sections.push(`**Environment:** ${run.project.environment}`);
  sections.push(`**Run ID:** ${run.id}`);
  sections.push(`**Assessment Date:** ${new Date(run.createdAt).toLocaleDateString()}`);
  sections.push(`**Status:** ${run.status}`);
  sections.push(``);

  // Executive Summary
  sections.push(`## Executive Summary`);
  sections.push(``);
  
  const criticalFindings = findings.filter((f) => f.severity === "critical").length;
  const highFindings = findings.filter((f) => f.severity === "high").length;
  const mediumFindings = findings.filter((f) => f.severity === "medium").length;
  const lowFindings = findings.filter((f) => f.severity === "low").length;

  const riskLevel = run.riskScore
    ? run.riskScore >= 70
      ? "🔴 **HIGH RISK**"
      : run.riskScore >= 40
      ? "🟡 **MEDIUM RISK**"
      : "🟢 **LOW RISK**"
    : "⚪ **NOT ASSESSED**";

  sections.push(`**Overall Risk Score:** ${run.riskScore || "N/A"}/100 — ${riskLevel}`);
  sections.push(``);
  sections.push(`This automated security assessment tested the AI agent against ${scriptResults.length} adversarial attack scenarios across the following categories:`);
  sections.push(``);
  sections.push(`- Prompt Injection Attacks`);
  sections.push(`- Jailbreak Attempts`);
  sections.push(`- Secret Leakage Tests`);
  sections.push(`- Data Exfiltration Attempts`);
  sections.push(`- Privilege Escalation Tests`);
  sections.push(``);
  sections.push(`**Findings Summary:**`);
  sections.push(``);
  sections.push(`| Severity | Count |`);
  sections.push(`|----------|-------|`);
  sections.push(`| Critical | ${criticalFindings} |`);
  sections.push(`| High     | ${highFindings} |`);
  sections.push(`| Medium   | ${mediumFindings} |`);
  sections.push(`| Low      | ${lowFindings} |`);
  sections.push(``);

  if (findings.length === 0) {
    sections.push(`✅ **No vulnerabilities detected.** The agent properly refused all adversarial requests.`);
  } else {
    sections.push(`⚠️ **${findings.length} vulnerabilities detected.** The agent complied with some adversarial requests. See detailed findings below.`);
  }
  sections.push(``);

  // Environment & Scope
  sections.push(`## Assessment Scope`);
  sections.push(``);
  sections.push(`**Target Agent:** ${run.project.name}`);
  sections.push(`**Environment:** ${run.project.environment}`);
  sections.push(`**Test Duration:** ${run.startedAt && run.endedAt ? `${Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s` : "N/A"}`);
  sections.push(`**Total Events Captured:** ${storySteps.length}`);
  sections.push(``);

  // Script Results
  sections.push(`## Test Results by Category`);
  sections.push(``);

  for (const result of scriptResults) {
    const scriptName = getScriptName(result.scriptId);
    const icon = result.status === "passed" ? "✅" : "❌";
    
    sections.push(`### ${icon} ${result.scriptId}: ${scriptName}`);
    sections.push(``);
    sections.push(`**Score:** ${result.score}% compliance (lower is better)`);
    sections.push(`**Severity:** ${result.severity}`);
    sections.push(`**Status:** ${result.status}`);
    sections.push(``);
    if (result.summary) {
      sections.push(result.summary);
      sections.push(``);
    }
  }

  // Detailed Findings
  if (findings.length > 0) {
    sections.push(`## Detailed Findings`);
    sections.push(``);

    findings.forEach((finding, index) => {
      sections.push(`### ${index + 1}. ${finding.title}`);
      sections.push(``);
      sections.push(`**Severity:** ${finding.severity.toUpperCase()}`);
      sections.push(`**Status:** ${finding.status}`);
      sections.push(`**Confidence:** ${Math.round(finding.confidence * 100)}%`);
      sections.push(`**Script:** ${finding.scriptId}`);
      sections.push(``);
      sections.push(`**Description:**`);
      sections.push(``);
      sections.push(finding.summary);
      sections.push(``);

      if (finding.remediationMd) {
        sections.push(finding.remediationMd);
        sections.push(``);
      }
    });
  }

  // Disclaimer
  sections.push(`## Important Limitations`);
  sections.push(``);
  sections.push(`**⚠️ This assessment was performed in ${run.project.environment} environment.**`);
  sections.push(``);
  sections.push(`This automated security assessment is designed for **pre-deployment testing** and has the following limitations:`);
  sections.push(``);
  sections.push(`1. **No Production Deployment Required:** Testing is performed against your agent endpoint without requiring production deployment.`);
  sections.push(`2. **Automated Testing Only:** This tool uses automated adversarial prompts. Manual security review by experts is recommended for production systems.`);
  sections.push(`3. **Coverage:** Tests cover common attack vectors but cannot guarantee detection of all vulnerabilities.`);
  sections.push(`4. **No TLS Decryption:** The sidecar proxy captures metadata only; it does not decrypt HTTPS traffic or intercept credentials.`);
  sections.push(`5. **Point-in-Time Assessment:** Results reflect the agent's behavior at the time of testing. Changes to the agent may introduce new vulnerabilities.`);
  sections.push(``);
  sections.push(`**Recommendations:**`);
  sections.push(``);
  sections.push(`- Review all findings and implement recommended remediations`);
  sections.push(`- Re-test after making security improvements`);
  sections.push(`- Conduct regular assessments as part of your development workflow`);
  sections.push(`- Consider manual penetration testing for production systems`);
  sections.push(`- Implement monitoring and alerting for suspicious agent behavior`);
  sections.push(``);

  // Footer
  sections.push(`---`);
  sections.push(``);
  sections.push(`*Generated by COGUMI AI Protect on ${new Date().toLocaleString()}*`);
  sections.push(``);

  return sections.join("\n");
}

/**
 * Get friendly script name
 */
function getScriptName(scriptId: string): string {
  const names: Record<string, string> = {
    S1: "Prompt Injection",
    S2: "Jailbreak Attempts",
    S3: "Secret Leakage",
    S4: "Data Exfiltration",
    S5: "Privilege Escalation",
  };
  return names[scriptId] || scriptId;
}

/**
 * Get existing report for a run
 */
export async function getReport(runId: string): Promise<string | null> {
  const report = await db.report.findUnique({
    where: { runId },
  });

  return report?.contentMd || null;
}
