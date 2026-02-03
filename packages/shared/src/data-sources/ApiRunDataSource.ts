import type { Event, StoryStep, Finding, Run } from '../schemas';
import type { RunDataSource } from './RunDataSource';

/**
 * RunDataSource implementation that fetches from real API endpoints
 * Used when NEXT_PUBLIC_USE_FIXTURES=false
 */
export class ApiRunDataSource implements RunDataSource {
  constructor(private apiBaseUrl: string = '/api') {}

  async getRun(runId: string): Promise<Run> {
    const res = await fetch(`${this.apiBaseUrl}/runs/${runId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch run: ${res.statusText}`);
    }
    const data = await res.json();
    return data.run;
  }

  async getStorySteps(runId: string): Promise<StoryStep[]> {
    const res = await fetch(`${this.apiBaseUrl}/runs/${runId}/story`);
    if (!res.ok) {
      throw new Error(`Failed to fetch story steps: ${res.statusText}`);
    }
    const data = await res.json();
    return data.steps;
  }

  async getEvents(
    runId: string,
    afterSeq?: number,
    limit: number = 200
  ): Promise<Event[]> {
    const params = new URLSearchParams();
    if (afterSeq !== undefined) params.set('after_seq', afterSeq.toString());
    params.set('limit', limit.toString());

    const res = await fetch(`${this.apiBaseUrl}/runs/${runId}/events?${params}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch events: ${res.statusText}`);
    }
    const data = await res.json();
    return data.events;
  }

  async getEventsByIds(eventIds: string[]): Promise<Event[]> {
    // Fetch all events and filter (simple approach)
    // In production, you might want a dedicated endpoint
    const allEvents = await this.getEvents('', undefined, 10000);
    return allEvents.filter(e => eventIds.includes(e.id));
  }

  async getFindings(runId: string): Promise<Finding[]> {
    const res = await fetch(`${this.apiBaseUrl}/runs/${runId}/findings`);
    if (!res.ok) {
      throw new Error(`Failed to fetch findings: ${res.statusText}`);
    }
    const data = await res.json();
    return data.findings;
  }

  /**
   * Subscribe to SSE stream for live updates
   */
  subscribe(
    runId: string,
    onStoryStep: (step: StoryStep) => void,
    onFinding: (finding: Finding) => void,
    onRunStatus: (status: string) => void
  ): () => void {
    const eventSource = new EventSource(`${this.apiBaseUrl}/runs/${runId}/stream`);

    eventSource.addEventListener('story.step.created', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      onStoryStep(data.step);
    });

    eventSource.addEventListener('finding.created', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      onFinding(data.finding);
    });

    eventSource.addEventListener('run.status', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      onRunStatus(data.status);
    });

    eventSource.onerror = error => {
      console.error('SSE error:', error);
      eventSource.close();
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
    };
  }
}
