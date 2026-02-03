import { z } from 'zod';

// Enums
export const RoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
export type Role = z.infer<typeof RoleSchema>;

export const ProjectEnvSchema = z.enum(['sandbox', 'staging', 'prod']);
export type ProjectEnv = z.infer<typeof ProjectEnvSchema>;

export const RunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'canceled',
  'stopped_quota',
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingStatusSchema = z.enum(['confirmed', 'attempted', 'suspected']);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const ChannelSchema = z.enum(['http', 'system', 'policy']);
export type Channel = z.infer<typeof ChannelSchema>;

export const EventTypeSchema = z.enum([
  'request',
  'response',
  'blocked',
  'marker',
  'secret.detected',
  'policy.violation',
  'agent.message',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const ActorSchema = z.enum(['target', 'adversary', 'system']);
export type Actor = z.infer<typeof ActorSchema>;

export const DestinationClassSchema = z.enum([
  'llm_provider',
  'tool',
  'internal_api',
  'public_internet',
  'attacker_sink',
  'unknown',
]);
export type DestinationClass = z.infer<typeof DestinationClassSchema>;

export const StepKindSchema = z.enum(['attempt', 'confirmed', 'blocked', 'info', 'quota']);
export type StepKind = z.infer<typeof StepKindSchema>;

// Core domain schemas
export const DestinationSchema = z.object({
  host: z.string(),
  path: z.string().nullable().optional(),
  port: z.number().optional(),
  classification: DestinationClassSchema,
});
export type Destination = z.infer<typeof DestinationSchema>;

export const HttpSchema = z.object({
  method: z.string().nullable().optional(),
  status_code: z.number().nullable().optional(),
  bytes_out: z.number().optional(),
  bytes_in: z.number().optional(),
  duration_ms: z.number().optional(),
});
export type Http = z.infer<typeof HttpSchema>;

export const SecretMatchSchema = z.object({
  kind: z.string(), // OPENAI_KEY, AWS_ACCESS_KEY, JWT, HIGH_ENTROPY, etc.
  hash: z.string(),
  preview: z.string(),
  confidence: z.number().min(0).max(1),
});
export type SecretMatch = z.infer<typeof SecretMatchSchema>;

export const PayloadRedactedSchema = z.object({
  summary: z.string().optional(),
  headers_redacted: z.record(z.string()).optional(),
  body_redacted_preview: z.string().nullable().optional(),
});
export type PayloadRedacted = z.infer<typeof PayloadRedactedSchema>;

export const EventSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  project_id: z.string().uuid(),
  run_id: z.string().uuid().nullable().optional(),
  ts: z.string().datetime(), // ISO-8601
  seq: z.number().int().optional(),
  channel: ChannelSchema,
  type: EventTypeSchema,
  actor: ActorSchema,
  destination: DestinationSchema,
  http: HttpSchema.optional(),
  payload_redacted: PayloadRedactedSchema.optional(),
  matches: z.array(SecretMatchSchema).optional(),
  integrity_hash: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const StoryStepSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  run_id: z.string().uuid(),
  ts: z.string().datetime(), // ISO-8601
  seq_start: z.number().int().optional(),
  seq_end: z.number().int().optional(),
  script_id: z.string().nullable().optional(), // S1, S2, S3, S4, S5, or null
  step_kind: StepKindSchema,
  severity: SeveritySchema,
  status: z.string().default('open'),
  claim_title: z.string(),
  claim_summary: z.string(),
  attack_style: z.string().nullable().optional(),
  evidence_event_ids: z.array(z.string().uuid()),
});
export type StoryStep = z.infer<typeof StoryStepSchema>;

export const NarrativeStepSchema = z.object({
  label: z.string(),
  event_id: z.string().uuid(),
});
export type NarrativeStep = z.infer<typeof NarrativeStepSchema>;

export const FindingSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  run_id: z.string().uuid(),
  script_id: z.string(), // S1 through S5
  title: z.string(),
  severity: SeveritySchema,
  status: FindingStatusSchema,
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  evidence_event_ids: z.array(z.string().uuid()),
  narrative_steps: z.array(NarrativeStepSchema).optional(),
  remediation_md: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const PromptVariantSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  project_id: z.string().uuid(),
  script_id: z.string(), // S1-S5
  script_step_id: z.string(),
  style_id: z.string(),
  version: z.string().default('v1'),
  prompt_text: z.string(),
  source: z.enum(['builtin', 'generated', 'customer']).default('builtin'),
  created_at: z.string().datetime(),
  last_used_at: z.string().datetime().nullable().optional(),
});
export type PromptVariant = z.infer<typeof PromptVariantSchema>;

export const RunSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  project_id: z.string().uuid(),
  status: RunStatusSchema,
  risk_score: z.number().int().min(0).max(100).nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  ended_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  created_by: z.string().uuid().nullable().optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  environment: ProjectEnvSchema,
  prod_override_enabled: z.boolean().default(false),
  agent_test_url: z.string().url().nullable().optional(),
  tool_domains: z.array(z.string()).default([]),
  internal_suffixes: z.array(z.string()).default([]),
  retention_days: z.number().int().default(7),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ScriptResultSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  run_id: z.string().uuid(),
  script_id: z.string(), // S1-S5
  score: z.number().int().min(0).max(100),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  status: z.enum(['pass', 'fail', 'blocked', 'inconclusive']),
  summary: z.string().optional(),
});
export type ScriptResult = z.infer<typeof ScriptResultSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  run_id: z.string().uuid(),
  format: z.string().default('markdown'),
  content_md: z.string(),
  generated_at: z.string().datetime(),
});
export type Report = z.infer<typeof ReportSchema>;

// API request/response schemas
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  environment: ProjectEnvSchema.default('sandbox'),
  tool_domains: z.array(z.string()).optional(),
  internal_suffixes: z.array(z.string()).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment: ProjectEnvSchema.optional(),
  prod_override_enabled: z.boolean().optional(),
  agent_test_url: z.string().url().nullable().optional(),
  tool_domains: z.array(z.string()).optional(),
  internal_suffixes: z.array(z.string()).optional(),
  redteam: z
    .object({
      enabled_style_ids: z.array(z.string()),
      intensity: z.enum(['low', 'med', 'high']),
      version_pin: z.string().optional(),
    })
    .optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const IngestEventsRequestSchema = z.object({
  project_id: z.string().uuid(),
  run_id: z.string().uuid().nullable().optional(),
  sidecar_version: z.string(),
  events: z.array(
    EventSchema.omit({ id: true, org_id: true }).extend({
      ts: z.string().datetime(),
    })
  ),
});
export type IngestEventsRequest = z.infer<typeof IngestEventsRequestSchema>;

export const IngestEventsResponseSchema = z.object({
  ok: z.boolean(),
  accepted: z.number().int(),
  dropped: z.number().int(),
});
export type IngestEventsResponse = z.infer<typeof IngestEventsResponseSchema>;

export const CreateRunRequestSchema = z.object({
  mode: z.literal('campaign'),
});
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

export const ValidateAgentEndpointRequestSchema = z.object({
  agent_test_url: z.string().url(),
});
export type ValidateAgentEndpointRequest = z.infer<typeof ValidateAgentEndpointRequestSchema>;

export const ValidateAgentEndpointResponseSchema = z.object({
  ok: z.boolean(),
  details: z.object({
    latency_ms: z.number(),
  }),
});
export type ValidateAgentEndpointResponse = z.infer<
  typeof ValidateAgentEndpointResponseSchema
>;

export const HeartbeatRequestSchema = z.object({
  project_id: z.string().uuid(),
  sidecar_version: z.string(),
  counters: z.object({
    events_sent_1m: z.number().int(),
    events_dropped_1m: z.number().int(),
  }),
});
export type HeartbeatRequest = z.infer<typeof HeartbeatRequestSchema>;

export const AgentMessageRequestSchema = z.object({
  run_id: z.string().uuid(),
  session_id: z.string().uuid(),
  actor: ActorSchema,
  message: z.string(),
  metadata: z.object({
    script_id: z.string().optional(),
    step: z.number().optional(),
    attack_style: z.string().optional(),
  }),
});
export type AgentMessageRequest = z.infer<typeof AgentMessageRequestSchema>;

export const AgentMessageResponseSchema = z.object({
  message: z.string(),
  done: z.boolean(),
  metadata: z.record(z.any()).optional(),
});
export type AgentMessageResponse = z.infer<typeof AgentMessageResponseSchema>;
