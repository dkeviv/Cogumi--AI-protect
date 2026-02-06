import secretLeakFixture from '@/fixtures/events_secret_leak.json';
import exfilAttemptFixture from '@/fixtures/events_exfil_attempt.json';
import escalationAttemptFixture from '@/fixtures/events_escalation_attempt.json';
import storyStepsFixture from '@/fixtures/story_steps_expected.json';
import findingsFixture from '@/fixtures/findings_expected.json';

type Run = {
  id: string;
  status: string;
  riskScore: number | null;
  startedAt: string | null;
  endedAt: string | null;
  project: {
    id: string;
    name: string;
    environment: string;
  };
};

type StoryStep = {
  id: string;
  runId: string;
  ts: string;
  seqStart: number | null;
  seqEnd: number | null;
  scriptId: string | null;
  stepKind: string;
  severity: string;
  status?: string;
  claimTitle: string;
  claimSummary: string;
  attackStyle?: string | null;
  evidenceEventIds: string[];
};

type Finding = {
  id: string;
  title: string;
  severity: string;
  status: string;
  summary: string;
  scriptId?: string;
  evidenceEventIds?: string[];
};

type Event = {
  id: string;
  ts: string;
  seq: number | null;
  channel: string;
  type: string;
  actor?: string;
  host: string;
  path?: string | null;
  port?: number | null;
  classification?: string | null;
  method?: string | null;
  statusCode?: number | null;
  bytesOut?: number | null;
  bytesIn?: number | null;
  durationMs?: number | null;
  payloadRedacted?: {
    summary?: string;
    headersRedacted?: Record<string, string>;
    bodyRedactedPreview?: string | null;
  };
  matches?: any[];
  integrityHash?: string;
};

type RunDataBundle = {
  run: Run;
  storySteps: StoryStep[];
  findings: Finding[];
  events: Event[];
};

type RunStreamHandlers = {
  onStoryStep: (step: StoryStep) => void;
  onFinding: (finding: Finding) => void;
  onRunStatus: (status: string) => void;
};

export interface RunDataSource {
  getInitialData: (runId: string) => Promise<RunDataBundle>;
  subscribe: (runId: string, handlers: RunStreamHandlers) => () => void;
}

const useFixtures = process.env.NEXT_PUBLIC_USE_FIXTURES === 'true';

const fixtureRunBase: Omit<Run, 'id'> = {
  status: 'completed',
  riskScore: 82,
  startedAt: '2026-02-02T12:00:00.000Z',
  endedAt: '2026-02-02T12:06:30.000Z',
  project: {
    id: 'project-fixture',
    name: 'Fixture Project',
    environment: 'sandbox',
  },
};

function normalizeFixtureEvent(
  raw: any,
  id: string,
  seq: number
): Event {
  return {
    id,
    ts: raw.ts,
    seq,
    channel: raw.channel,
    type: raw.type,
    actor: raw.actor,
    host: raw.destination?.host || 'unknown',
    path: raw.destination?.path ?? null,
    port: raw.destination?.port ?? null,
    classification: raw.destination?.classification ?? null,
    method: raw.http?.method ?? null,
    statusCode: raw.http?.status_code ?? null,
    bytesOut: raw.http?.bytes_out ?? null,
    bytesIn: raw.http?.bytes_in ?? null,
    durationMs: raw.http?.duration_ms ?? null,
    payloadRedacted: raw.payload_redacted
      ? {
          summary: raw.payload_redacted.summary,
          headersRedacted: raw.payload_redacted.headers_redacted,
          bodyRedactedPreview: raw.payload_redacted.body_redacted_preview,
        }
      : undefined,
    matches: raw.matches || [],
  };
}

function normalizeStoryStep(step: any, runId: string): StoryStep {
  return {
    id: step.id,
    runId,
    ts: step.ts,
    seqStart: step.seq_start ?? null,
    seqEnd: step.seq_end ?? null,
    scriptId: step.script_id ?? null,
    stepKind: step.step_kind,
    severity: step.severity,
    status: step.status,
    claimTitle: step.claim_title,
    claimSummary: step.claim_summary,
    attackStyle: step.attack_style ?? null,
    evidenceEventIds: step.evidence_event_ids || [],
  };
}

function normalizeFinding(finding: any, runId: string): Finding {
  return {
    id: finding.id,
    title: finding.title,
    severity: finding.severity,
    status: finding.status,
    summary: finding.summary,
    scriptId: finding.script_id,
    evidenceEventIds: finding.evidence_event_ids || [],
  };
}

const fixtureEvents: Event[] = [
  normalizeFixtureEvent(secretLeakFixture.events[0], 'event-secret-adversary', 1),
  normalizeFixtureEvent(secretLeakFixture.events[1], 'event-secret-agent', 2),
  normalizeFixtureEvent(escalationAttemptFixture.events[0], 'event-escalation-request', 10),
  normalizeFixtureEvent(escalationAttemptFixture.events[1], 'event-escalation-response', 11),
  normalizeFixtureEvent(exfilAttemptFixture.events[0], 'event-exfil-request', 20),
];

const fixtureStorySteps: StoryStep[] = storyStepsFixture.steps.map((step: any) =>
  normalizeStoryStep(step, 'run-fixture')
);

const fixtureFindings: Finding[] = findingsFixture.findings.map((finding: any) =>
  normalizeFinding(finding, 'run-fixture')
);

const fixtureDataSource: RunDataSource = {
  async getInitialData(runId: string) {
    return {
      run: {
        ...fixtureRunBase,
        id: runId,
      },
      storySteps: fixtureStorySteps.map((step) => ({ ...step, runId })),
      findings: fixtureFindings.map((finding) => ({ ...finding, runId })),
      events: fixtureEvents,
    };
  },
  subscribe() {
    return () => undefined;
  },
};

const apiDataSource: RunDataSource = {
  async getInitialData(runId: string) {
    const [runRes, stepsRes, findingsRes, eventsRes] = await Promise.all([
      fetch(`/api/runs/${runId}`),
      fetch(`/api/runs/${runId}/story`),
      fetch(`/api/runs/${runId}/findings`),
      fetch(`/api/runs/${runId}/events`),
    ]);

    if (!runRes.ok) {
      throw new Error('Failed to load run');
    }

    const runData = await runRes.json();
    const stepsData = await stepsRes.json();
    const findingsData = await findingsRes.json();
    const eventsData = await eventsRes.json();

    return {
      run: runData.run,
      storySteps: stepsData.steps || [],
      findings: findingsData.findings || [],
      events: eventsData.events || [],
    };
  },
  subscribe(runId: string, handlers: RunStreamHandlers) {
    const eventSource = new EventSource(`/api/runs/${runId}/stream`);

    eventSource.addEventListener('story_step', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      handlers.onStoryStep(data.data);
    });

    eventSource.addEventListener('finding', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      handlers.onFinding(data.data);
    });

    eventSource.addEventListener('run_status', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.data.status) {
        handlers.onRunStatus(data.data.status);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  },
};

export function getRunDataSource(): RunDataSource {
  return useFixtures ? fixtureDataSource : apiDataSource;
}
