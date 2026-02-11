import { prisma } from "@cogumi/db";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type StoryStep = any;
type Event = any;

/**
 * Story Builder Service
 * 
 * Transforms raw events into narrative StorySteps for the Exploit Feed.
 * 
 * Story types:
 * - attempt: Script attempted an action (e.g., "Attempted exfiltration")
 * - confirmed: Action succeeded with evidence (e.g., "Secret leaked to attacker sink")
 * - blocked: Action was blocked by policy
 * - quota: Run stopped due to quota limits
 * - info: Informational step (e.g., "Run started")
 */

export interface StoryStepInput {
  runId: string;
  orgId: string;
  ts: Date;
  seqStart?: number;
  seqEnd?: number;
  scriptId?: string;
  stepKind: "attempt" | "confirmed" | "blocked" | "quota" | "info";
  severity: Severity;
  claimTitle: string;
  claimSummary: string;
  attackStyle?: string;
  evidenceEventIds: string[];
}

/**
 * Create a story step from events
 */
export async function createStoryStep(input: StoryStepInput): Promise<StoryStep> {
  return await prisma.storyStep.create({
    data: {
      ...input,
    },
  });
}

/**
 * Build story steps from events for a run
 * 
 * This analyzes events and creates narrative steps:
 * 1. Script markers (system events with type="marker")
 * 2. Secret detections (confirmed exploits)
 * 3. Policy violations (blocked actions, quota exceeded)
 * 4. Exfiltration attempts (requests to external sinks)
 */
export async function buildStoryForRun(runId: string): Promise<StoryStep[]> {
  // Get all events for this run, ordered by sequence
  const events = await prisma.event.findMany({
    where: { runId },
    orderBy: [{ seq: "asc" }, { ts: "asc" }],
  });

  if (events.length === 0) {
    return [];
  }

  const steps: StoryStepInput[] = [];
  const run = await prisma.run.findUnique({ where: { id: runId } });
  
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  // Group events for analysis
  const markers = events.filter((e) => e.type === "marker");
  const secretDetections = events.filter((e) => e.type === "secret.detected");
  const policyViolations = events.filter((e) => e.type === "policy.violation");
  const externalRequests = events.filter(
    (e) =>
      e.channel === "http" &&
      e.classification &&
      ["attacker_sink", "public_internet"].includes(e.classification)
  );

  // 1. Process script markers (e.g., "S1: Starting prompt injection tests")
  for (const marker of markers) {
    const payload = marker.payloadRedacted as any;
    steps.push({
      runId,
      orgId: run.orgId,
      ts: marker.ts,
      seqStart: marker.seq || 0,
      seqEnd: marker.seq || 0,
      scriptId: payload?.scriptId || payload?.script_id || null,
      stepKind: "info",
      severity: "info",
      claimTitle: payload?.title || "Script checkpoint",
      claimSummary: payload?.summary || "Pentest script checkpoint",
      evidenceEventIds: [marker.id],
    });
  }

  // 2. Process secret detections (confirmed exploits)
  for (const detection of secretDetections) {
    const matches = detection.matches as any[];
    const matchCount = matches?.length || 0;
    const matchTypes = matches?.map((m) => m.kind).join(", ") || "secrets";

    steps.push({
      runId,
      orgId: run.orgId,
      ts: detection.ts,
      seqStart: detection.seq || 0,
      seqEnd: detection.seq || 0,
      stepKind: "confirmed",
      severity: "critical",
      claimTitle: `🚨 Secret leaked: ${matchTypes}`,
      claimSummary: `Agent exposed ${matchCount} secret(s) in ${detection.method} request to ${detection.host}${detection.path || ""}`,
      evidenceEventIds: [detection.id],
    });
  }

  // 3. Process policy violations
  for (const violation of policyViolations) {
    const payload = violation.payloadRedacted as any;
    const originalType = payload?.original_event_type || violation.type;
    
    steps.push({
      runId,
      orgId: run.orgId,
      ts: violation.ts,
      seqStart: violation.seq || 0,
      seqEnd: violation.seq || 0,
      stepKind: originalType === "ingest_throttled" ? "quota" : "blocked",
      severity: "medium",
      claimTitle: payload?.title || "Policy violation",
      claimSummary: payload?.summary || "Action blocked by policy",
      evidenceEventIds: [violation.id],
    });
  }

  // 4. Process potential exfiltration attempts
  const exfilGroups = groupConsecutiveRequests(externalRequests);
  
  for (const group of exfilGroups) {
    const firstEvent = group[0];
    const lastEvent = group[group.length - 1];
    
    // Check if any event in group has secrets
    const hasSecrets = group.some((e) => {
      const matches = e.matches as any[];
      return matches && matches.length > 0;
    });

    steps.push({
      runId,
      orgId: run.orgId,
      ts: firstEvent.ts,
      seqStart: firstEvent.seq || 0,
      seqEnd: lastEvent.seq || 0,
      stepKind: hasSecrets ? "confirmed" : "attempt",
      severity: hasSecrets ? "high" : "medium",
      claimTitle: hasSecrets
        ? "⚠️ Data exfiltration confirmed"
        : "🔍 Suspicious external request",
      claimSummary: `Agent made ${group.length} request(s) to ${firstEvent.classification} (${firstEvent.host})${hasSecrets ? " with sensitive data" : ""}`,
      evidenceEventIds: group.map((e) => e.id),
    });
  }

  // Store all steps
  const createdSteps = [];
  for (const step of steps) {
    const created = await createStoryStep(step);
    createdSteps.push(created);
  }

  return createdSteps;
}

/**
 * Group consecutive requests to same host
 */
function groupConsecutiveRequests(events: Event[]): Event[][] {
  if (events.length === 0) return [];

  const groups: Event[][] = [];
  let currentGroup: Event[] = [events[0]];
  let currentHost = events[0].host;

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    
    // If same host and within 10 sequence numbers, add to current group
    if (
      event.host === currentHost &&
      Math.abs((event.seq || 0) - (currentGroup[currentGroup.length - 1].seq || 0)) <= 10
    ) {
      currentGroup.push(event);
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = [event];
      currentHost = event.host;
    }
  }

  // Add last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Rebuild story steps for a run (useful after new events arrive)
 */
export async function rebuildStoryForRun(runId: string): Promise<StoryStep[]> {
  // Delete existing story steps
  await prisma.storyStep.deleteMany({ where: { runId } });
  
  // Rebuild
  return await buildStoryForRun(runId);
}

/**
 * Get story steps for a run
 */
export async function getStorySteps(runId: string): Promise<StoryStep[]> {
  return await prisma.storyStep.findMany({
    where: { runId },
    orderBy: [{ seqStart: "asc" }, { ts: "asc" }],
  });
}
