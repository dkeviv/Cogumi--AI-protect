import type { Event, StoryStep, Finding, Run } from '../schemas';
import type { RunDataSource } from './RunDataSource';

// Fixture file structure (matches /fixtures/*.json)
interface FixtureEvents {
  events: Array<Omit<Event, 'id' | 'orgId' | 'projectId'>>;
}

interface FixtureStorySteps {
  steps: StoryStep[];
}

interface FixtureFindings {
  findings: Finding[];
}

/**
 * RunDataSource implementation that loads from /fixtures/*.json
 * Enables UI-first development without backend
 */
export class FixtureRunDataSource implements RunDataSource {
  private events: Event[] = [];
  private storySteps: StoryStep[] = [];
  private findings: Finding[] = [];
  private run: Run | null = null;

  constructor(private fixturesBasePath: string = '/fixtures') {}

  /**
   * Load all fixture data for a run
   * In real implementation, this would be called once on mount
   */
  async loadFixtures(): Promise<void> {
    try {
      // Load events from all fixture files
      const [secretLeakRes, escalationRes, exfilRes, stepsRes, findingsRes] = await Promise.all([
        fetch(`${this.fixturesBasePath}/events_secret_leak.json`),
        fetch(`${this.fixturesBasePath}/events_escalation_attempt.json`),
        fetch(`${this.fixturesBasePath}/events_exfil_attempt.json`),
        fetch(`${this.fixturesBasePath}/story_steps_expected.json`),
        fetch(`${this.fixturesBasePath}/findings_expected.json`),
      ]);

      const secretLeakData: FixtureEvents = await secretLeakRes.json();
      const escalationData: FixtureEvents = await escalationRes.json();
      const exfilData: FixtureEvents = await exfilRes.json();
      const stepsData: FixtureStorySteps = await stepsRes.json();
      const findingsData: FixtureFindings = await findingsRes.json();

      // Normalize events (add missing org_id, project_id, id)
      const allEvents = [
        ...secretLeakData.events,
        ...escalationData.events,
        ...exfilData.events,
      ];

      this.events = allEvents.map((e, idx) =>
        this.normalizeEvent(e as any, `event-${idx}`)
      );

      this.storySteps = stepsData.steps;
      this.findings = findingsData.findings;

      // Create mock run
      this.run = {
        id: 'run-fixture',
        orgId: 'org-fixture',
        projectId: 'project-fixture',
        status: 'completed',
        riskScore: 85,
        startedAt: '2026-02-02T12:00:00.000Z',
        endedAt: '2026-02-02T12:05:00.000Z',
        createdAt: '2026-02-02T11:55:00.000Z',
        createdBy: 'user-fixture',
      };
    } catch (error) {
      console.error('Failed to load fixtures:', error);
      throw error;
    }
  }

  private normalizeEvent(
    fixtureEvent: Partial<Event>,
    id: string
  ): Event {
    return {
      id: id,
      orgId: 'org-fixture',
      projectId: 'project-fixture',
      runId: 'run-fixture',
      ts: fixtureEvent.ts || new Date().toISOString(),
      seq: fixtureEvent.seq || 0,
      channel: fixtureEvent.channel || 'http',
      type: fixtureEvent.type || 'request',
      actor: fixtureEvent.actor || 'system',
      host: fixtureEvent.host || 'unknown',
      path: fixtureEvent.path || null,
      port: fixtureEvent.port || null,
      classification: fixtureEvent.classification || null,
      method: fixtureEvent.method || null,
      statusCode: fixtureEvent.statusCode || null,
      bytesOut: fixtureEvent.bytesOut || null,
      bytesIn: fixtureEvent.bytesIn || null,
      durationMs: fixtureEvent.durationMs || null,
      payloadRedacted: fixtureEvent.payloadRedacted || null,
      matches: fixtureEvent.matches || null,
      integrityHash: fixtureEvent.integrityHash || null,
      createdAt: new Date().toISOString(),
    } as Event;
  }

  async getRun(runId: string): Promise<Run> {
    if (!this.run) {
      await this.loadFixtures();
    }
    return this.run!;
  }

  async getStorySteps(runId: string): Promise<StoryStep[]> {
    if (this.storySteps.length === 0) {
      await this.loadFixtures();
    }
    return this.storySteps;
  }

  async getEvents(
    runId: string,
    afterSeq?: number,
    limit: number = 200
  ): Promise<Event[]> {
    if (this.events.length === 0) {
      await this.loadFixtures();
    }

    let filtered = this.events;

    if (afterSeq !== undefined) {
      filtered = filtered.filter(e => (e.seq || 0) > afterSeq);
    }

    return filtered.slice(0, limit);
  }

  async getEventsByIds(eventIds: string[]): Promise<Event[]> {
    if (this.events.length === 0) {
      await this.loadFixtures();
    }

    return this.events.filter(e => eventIds.includes(e.id));
  }

  async getFindings(runId: string): Promise<Finding[]> {
    if (this.findings.length === 0) {
      await this.loadFixtures();
    }
    return this.findings;
  }

  /**
   * Simulate live streaming for fixtures (optional)
   * Gradually emits story steps and findings to simulate real-time updates
   */
  subscribe(
    runId: string,
    onStoryStep: (step: StoryStep) => void,
    onFinding: (finding: Finding) => void,
    onRunStatus: (status: string) => void
  ): () => void {
    let cancelled = false;

    // Simulate streaming with delays
    (async () => {
      if (!this.storySteps.length) {
        await this.loadFixtures();
      }

      onRunStatus('running');

      // Emit story steps gradually
      for (const step of this.storySteps) {
        if (cancelled) break;
        await this.delay(1000); // 1 second between steps
        onStoryStep(step);
      }

      // Emit findings gradually
      for (const finding of this.findings) {
        if (cancelled) break;
        await this.delay(500);
        onFinding(finding);
      }

      if (!cancelled) {
        onRunStatus('completed');
      }
    })();

    // Return unsubscribe function
    return () => {
      cancelled = true;
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
