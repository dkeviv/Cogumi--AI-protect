import type { Event, StoryStep, Finding, Run } from '../schemas';

/**
 * Data source abstraction for Run page
 * Allows switching between fixture data and real API without changing UI components
 */
export interface RunDataSource {
  /** Get run metadata */
  getRun(runId: string): Promise<Run>;

  /** Get story steps for narrative feed */
  getStorySteps(runId: string): Promise<StoryStep[]>;

  /** Get events (paginated) */
  getEvents(runId: string, afterSeq?: number, limit?: number): Promise<Event[]>;

  /** Get events by IDs (for evidence chains) */
  getEventsByIds(eventIds: string[]): Promise<Event[]>;

  /** Get findings */
  getFindings(runId: string): Promise<Finding[]>;

  /** Subscribe to live updates (SSE) - optional for fixtures */
  subscribe?(
    runId: string,
    onStoryStep: (step: StoryStep) => void,
    onFinding: (finding: Finding) => void,
    onRunStatus: (status: string) => void
  ): () => void; // returns unsubscribe function
}
