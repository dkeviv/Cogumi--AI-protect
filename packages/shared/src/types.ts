// Re-export all schemas and types
export * from './schemas';

// Additional utility types
export type UUID = string;
export type ISO8601DateTime = string;

// Evidence card types for UI
export type EvidenceCardKind = 'conversation' | 'network' | 'detector' | 'policy' | 'info';

export interface EvidenceCardModel {
  kind: EvidenceCardKind;
  headline: string;
  bodyLines: string[];
  eventId?: string;
  jump?: {
    seqStart?: number;
    seqEnd?: number;
  };
}

// Timeline marker types for UI
export interface TimelineMarker {
  seq: number;
  label: string;
  kind: 'script' | 'confirmed' | 'attempt' | 'quota';
}

// SSE event types
export type SSEEventType =
  | 'run.status'
  | 'story.step.created'
  | 'finding.created'
  | 'quota.warning';

export interface SSEEvent {
  event: SSEEventType;
  data: any;
  id?: string;
}

// Quota check result
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

// Connect snippets
export interface ConnectSnippets {
  docker_compose: string;
  env_vars: string;
  sidecar_config_yaml: string;
  agent_endpoint_examples: {
    node_express: string;
    python_fastapi: string;
  };
}

// Token creation response (plaintext shown once)
export interface CreateTokenResponse {
  token: string; // plaintext, shown once
  token_id: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Error response
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}
