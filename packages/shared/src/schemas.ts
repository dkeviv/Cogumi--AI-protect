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
  statusCode: z.number().nullable().optional(),
  bytesOut: z.number().optional(),
  bytesIn: z.number().optional(),
  durationMs: z.number().optional(),
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
  headersRedacted: z.record(z.string()).optional(),
  bodyRedactedPreview: z.string().nullable().optional(),
});
export type PayloadRedacted = z.infer<typeof PayloadRedactedSchema>;

export const EventSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  runId: z.string().uuid().nullable().optional(),
  ts: z.string().datetime(), // ISO-8601
  seq: z.number().int().optional(),
  channel: ChannelSchema,
  type: EventTypeSchema,
  actor: ActorSchema,
  host: z.string(),
  path: z.string().nullable().optional(),
  port: z.number().optional(),
  classification: DestinationClassSchema.nullable().optional(),
  method: z.string().nullable().optional(),
  statusCode: z.number().nullable().optional(),
  bytesOut: z.number().optional(),
  bytesIn: z.number().optional(),
  durationMs: z.number().optional(),
  payloadRedacted: z.any().optional(), // Json field
  matches: z.any().optional(), // Json field
  integrityHash: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const StoryStepSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  runId: z.string().uuid(),
  ts: z.string().datetime(), // ISO-8601
  seqStart: z.number().int().optional(),
  seqEnd: z.number().int().optional(),
  scriptId: z.string().nullable().optional(), // S1, S2, S3, S4, S5, or null
  stepKind: StepKindSchema,
  severity: SeveritySchema,
  status: z.string().default('open'),
  claimTitle: z.string(),
  claimSummary: z.string(),
  attackStyle: z.string().nullable().optional(),
  evidenceEventIds: z.array(z.string().uuid()),
});
export type StoryStep = z.infer<typeof StoryStepSchema>;

export const NarrativeStepSchema = z.object({
  label: z.string(),
  eventId: z.string().uuid(),
});
export type NarrativeStep = z.infer<typeof NarrativeStepSchema>;

export const FindingSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  runId: z.string().uuid(),
  scriptId: z.string(), // S1 through S5
  title: z.string(),
  severity: SeveritySchema,
  status: FindingStatusSchema,
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  evidenceEventIds: z.array(z.string().uuid()),
  narrativeSteps: z.array(NarrativeStepSchema).optional(),
  remediationMd: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const PromptVariantSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  scriptId: z.string(), // S1-S5
  scriptStepId: z.string(),
  styleId: z.string(),
  version: z.string().default('v1'),
  promptText: z.string(),
  source: z.enum(['builtin', 'generated', 'customer']).default('builtin'),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable().optional(),
});
export type PromptVariant = z.infer<typeof PromptVariantSchema>;

export const RunSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  status: RunStatusSchema,
  riskScore: z.number().int().min(0).max(100).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid().nullable().optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  environment: ProjectEnvSchema,
  prodOverrideEnabled: z.boolean().default(false),
  agentTestUrl: z.string().url().nullable().optional(),
  toolDomains: z.array(z.string()).default([]),
  internalSuffixes: z.array(z.string()).default([]),
  retentionDays: z.number().int().default(7),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ScriptResultSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  runId: z.string().uuid(),
  scriptId: z.string(), // S1-S5
  score: z.number().int().min(0).max(100),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  status: z.enum(['pass', 'fail', 'blocked', 'inconclusive']),
  summary: z.string().optional(),
});
export type ScriptResult = z.infer<typeof ScriptResultSchema>;

export const ReportSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  runId: z.string().uuid(),
  format: z.string().default('markdown'),
  contentMd: z.string(),
  generatedAt: z.string().datetime(),
});
export type Report = z.infer<typeof ReportSchema>;

// API request/response schemas
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  environment: ProjectEnvSchema.default('sandbox'),
  toolDomains: z.array(z.string()).optional(),
  internalSuffixes: z.array(z.string()).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment: ProjectEnvSchema.optional(),
  prodOverrideEnabled: z.boolean().optional(),
  agentTestUrl: z.string().url().nullable().optional(),
  toolDomains: z.array(z.string()).optional(),
  internalSuffixes: z.array(z.string()).optional(),
  redteam: z
    .object({
      enabledStyleIds: z.array(z.string()),
      intensity: z.enum(['low', 'med', 'high']),
      versionPin: z.string().optional(),
    })
    .optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const IngestEventsRequestSchema = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid().nullable().optional(),
  sidecarVersion: z.string(),
  events: z.array(
    EventSchema.omit({ id: true, orgId: true }).extend({
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
  agentTestUrl: z.string().url(),
});
export type ValidateAgentEndpointRequest = z.infer<typeof ValidateAgentEndpointRequestSchema>;

export const ValidateAgentEndpointResponseSchema = z.object({
  ok: z.boolean(),
  details: z.object({
    latencyMs: z.number(),
  }),
});
export type ValidateAgentEndpointResponse = z.infer<
  typeof ValidateAgentEndpointResponseSchema
>;

export const HeartbeatRequestSchema = z.object({
  projectId: z.string().uuid(),
  sidecarVersion: z.string(),
  counters: z.object({
    eventsSent1m: z.number().int(),
    eventsDropped1m: z.number().int(),
  }),
});
export type HeartbeatRequest = z.infer<typeof HeartbeatRequestSchema>;

export const AgentMessageRequestSchema = z.object({
  runId: z.string().uuid(),
  sessionId: z.string().uuid(),
  actor: ActorSchema,
  message: z.string(),
  metadata: z.object({
    scriptId: z.string().optional(),
    step: z.number().optional(),
    attackStyle: z.string().optional(),
  }),
});
export type AgentMessageRequest = z.infer<typeof AgentMessageRequestSchema>;

export const AgentMessageResponseSchema = z.object({
  message: z.string(),
  done: z.boolean(),
  metadata: z.record(z.any()).optional(),
});
export type AgentMessageResponse = z.infer<typeof AgentMessageResponseSchema>;
