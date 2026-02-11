'use client';

import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import {
  MessageSquare,
  Network,
  AlertTriangle,
  Shield,
  Database,
  Copy,
  BookPlus,
  ArrowUpRight,
} from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Event {
  id: string;
  seq: number | null;
  ts: string;
  type: string;
  channel: 'http' | 'system' | 'policy' | string;
  actor?: 'target' | 'adversary' | 'system';

  // API/DB shape (flat)
  host?: string;
  path?: string | null;
  classification?: string | null;
  method?: string | null;
  statusCode?: number | null;
  bytesOut?: number | null;
  bytesIn?: number | null;
  durationMs?: number | null;
  payloadRedacted?: {
    summary?: string;
    bodyRedactedPreview?: string | null;
  };

  // Fixture/legacy shape (nested)
  destination?: {
    host: string;
    path?: string | null;
    classification?: string;
  };
  http?: {
    method?: string;
    status_code?: number;
    bytes_out?: number;
    bytes_in?: number;
    duration_ms?: number;
  };
  payload_redacted?: {
    summary?: string;
    body_redacted_preview?: string;
  };
  matches?: Array<{
    kind: string;
    preview: string;
    confidence: number;
  }>;
}

function getEventHost(e: Event) {
  const host = typeof e.host === 'string' ? e.host.trim() : '';
  return host || e.destination?.host || 'unknown';
}

function getEventPath(e: Event) {
  const path = typeof e.path === 'string' ? e.path : null;
  return path ?? e.destination?.path ?? '';
}

function getEventClassification(e: Event) {
  return e.classification ?? e.destination?.classification ?? null;
}

function getEventMethod(e: Event) {
  return e.method ?? e.http?.method ?? null;
}

function getEventStatusCode(e: Event) {
  return e.statusCode ?? e.http?.status_code ?? null;
}

function getEventDurationMs(e: Event) {
  return e.durationMs ?? e.http?.duration_ms ?? null;
}

function getEventBytesOut(e: Event) {
  return e.bytesOut ?? e.http?.bytes_out ?? null;
}

function getEventBytesIn(e: Event) {
  return e.bytesIn ?? e.http?.bytes_in ?? null;
}

function getMessageText(e: Event) {
  const payloadAny = (e.payloadRedacted ?? {}) as any;
  const summary =
    e.payloadRedacted?.summary ??
    e.payload_redacted?.summary ??
    undefined;
  const bodyPreview =
    e.payloadRedacted?.bodyRedactedPreview ??
    payloadAny?.body_redacted_preview ??
    payloadAny?.message ??
    e.payload_redacted?.body_redacted_preview ??
    undefined;
  return summary || bodyPreview || '(message)';
}

function getMessageMeta(e: Event): { scriptId?: string; scriptStepId?: string } {
  const payloadAny = (e.payloadRedacted ?? {}) as any;
  const scriptId =
    (typeof payloadAny?.scriptId === 'string' ? payloadAny.scriptId : undefined) ??
    (typeof payloadAny?.script_id === 'string' ? payloadAny.script_id : undefined);
  const scriptStepId =
    (typeof payloadAny?.scriptStepId === 'string' ? payloadAny.scriptStepId : undefined) ??
    (typeof payloadAny?.script_step_id === 'string' ? payloadAny.script_step_id : undefined);
  return { scriptId, scriptStepId };
}

interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: string;
  score: number;
  confidence: number;
  summary: string;
  scriptId?: string;
  evidenceEventIds?: string[];
}

interface EvidencePanelNewProps {
  runId: string;
  projectId: string;
  events: Event[];
  findings: Finding[];
  storySteps?: Array<{
    id: string;
    seqStart: number | null;
    claimTitle: string;
    evidenceEventIds: string[];
  }>;
  currentSeq: number;
  onOpenProof?: (finding: Finding) => void;
  onOpenEventProof?: (title: string, evidenceEvents: Event[]) => void;
}

export function EvidencePanelNew({
  runId,
  projectId,
  events,
  findings,
  storySteps = [],
  currentSeq,
  onOpenProof,
  onOpenEventProof,
}: EvidencePanelNewProps) {
  const toast = useToast();
  // Filter events by type
  const conversationEvents = useMemo(
    () => events.filter((e) => e.type === 'agent.message'),
    [events]
  );
  const networkEvents = useMemo(
    () => events.filter((e) => e.channel === 'http' && e.type !== 'agent.message'),
    [events]
  );
  const policyEvents = useMemo(
    () => events.filter((e) => e.channel === 'policy'),
    [events]
  );

  // Build tabs (only show tabs with content)
  const tabs = useMemo(() => {
    const allTabs = [];

    if (conversationEvents.length > 0) {
      allTabs.push({
        id: 'chain',
        label: 'Prompt Chain',
        badge: undefined,
        content: (
          <PromptChainTab
            runId={runId}
            projectId={projectId}
            events={events}
            storySteps={storySteps}
            onOpenEventProof={onOpenEventProof}
            toast={toast}
          />
        ),
      });
    }

    // Conversation tab (always show if there are conversation events)
    if (conversationEvents.length > 0) {
      allTabs.push({
        id: 'conversation',
        label: 'Conversation',
        badge: conversationEvents.length,
        content: (
          <ConversationTab
            runId={runId}
            projectId={projectId}
            events={conversationEvents}
            currentSeq={currentSeq}
            onOpenEventProof={onOpenEventProof}
            toast={toast}
          />
        ),
      });
    }

    // Network tab (always show if there are network events)
    allTabs.push({
      id: 'network',
      label: 'Network',
      badge: networkEvents.length,
      content: <NetworkTab events={networkEvents} currentSeq={currentSeq} />,
    });

    // Findings tab (always show, even if empty - core feature)
    allTabs.push({
      id: 'findings',
      label: 'Findings',
      badge: findings.length,
      content: <FindingsTab findings={findings} onOpenProof={onOpenProof} />,
    });

    // Policy tab (only show if there are policy events)
    if (policyEvents.length > 0) {
      allTabs.push({
        id: 'policy',
        label: 'Policy',
        badge: policyEvents.length,
        content: <PolicyTab events={policyEvents} />,
      });
    }

    return allTabs;
  }, [
    runId,
    projectId,
    events,
    storySteps,
    toast,
    conversationEvents,
    networkEvents,
    findings,
    policyEvents,
    currentSeq,
    onOpenProof,
    onOpenEventProof,
  ]);

  return (
    <Card className="h-full flex flex-col">
      <Tabs tabs={tabs} />
    </Card>
  );
}

// Conversation Tab Component
function ConversationTab({
  runId,
  projectId,
  events,
  currentSeq,
  onOpenEventProof,
  toast,
}: {
  runId: string;
  projectId: string;
  events: Event[];
  currentSeq: number;
  onOpenEventProof?: (title: string, evidenceEvents: Event[]) => void;
  toast: ReturnType<typeof useToast>;
}) {
  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={MessageSquare}
          heading="No conversation events"
          description="Agent messages will appear here"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {events.map((event) => {
        const isAdversary = event.actor === 'adversary';
        const isPast = event.seq !== null && event.seq <= currentSeq;
        const meta = getMessageMeta(event);

        return (
          <div
            key={event.id}
            className={`flex ${isAdversary ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-lg px-4 py-3 border-l-[3px]
                ${isPast ? 'opacity-100' : 'opacity-40'}
                ${isAdversary ? 'bg-purple-50 border-purple-600' : 'bg-emerald-50 border-emerald-600'}
                transition-opacity duration-[var(--transition-base)]
              `}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {isAdversary ? 'Adversary' : 'Agent'}
                  </span>
                {(meta.scriptId || meta.scriptStepId) && (
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    {meta.scriptId || 'S?'}
                    {meta.scriptStepId ? ` · ${meta.scriptStepId}` : ''}
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(event.ts).toLocaleTimeString()}
                </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 px-0"
                    aria-label="Copy text"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(getMessageText(event));
                        toast.success('Copied');
                      } catch {
                        toast.error('Copy failed');
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 px-0"
                    aria-label="Save prompt"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/saved-prompts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            projectId,
                            kind: isAdversary ? 'adversary' : 'agent',
                            title: meta.scriptStepId ? `${meta.scriptStepId}` : (isAdversary ? 'Adversary prompt' : 'Agent response'),
                            promptText: getMessageText(event),
                            scriptId: meta.scriptId,
                            scriptStepId: meta.scriptStepId,
                            sourceRunId: runId,
                            sourceEventId: event.id,
                          }),
                        });
                        if (!res.ok) throw new Error('Save failed');
                        toast.success('Saved to library');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Save failed');
                      }
                    }}
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                  </Button>

                  {onOpenEventProof && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 px-0"
                      aria-label="Open in proof drawer"
                      onClick={() => onOpenEventProof(isAdversary ? 'Adversary prompt' : 'Agent response', [event])}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--text-primary)]">
                {getMessageText(event)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PromptChainTab({
  runId,
  projectId,
  events,
  storySteps,
  onOpenEventProof,
  toast,
}: {
  runId: string;
  projectId: string;
  events: Event[];
  storySteps: Array<{ id: string; seqStart: number | null; claimTitle: string; evidenceEventIds: string[] }>;
  onOpenEventProof?: (title: string, evidenceEvents: Event[]) => void;
  toast: ReturnType<typeof useToast>;
}) {
  // Group conversation pairs by scriptStepId when present (best-effort).
  const convo = events
    .filter((e) => e.type === 'agent.message')
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  const groups: Array<{
    key: string;
    scriptId?: string;
    scriptStepId?: string;
    prompt?: Event;
    response?: Event;
    relatedNetwork: Event[];
    relatedStory: Array<{ id: string; claimTitle: string }>;
  }> = [];

  const byKey = new Map<string, any>();
  for (const e of convo) {
    const meta = getMessageMeta(e);
    const key = meta.scriptStepId || `seq:${e.seq ?? 'na'}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        scriptId: meta.scriptId,
        scriptStepId: meta.scriptStepId,
        prompt: undefined,
        response: undefined,
        relatedNetwork: [] as Event[],
        relatedStory: [] as Array<{ id: string; claimTitle: string }>,
      });
    }
    const g = byKey.get(key);
    if (e.actor === 'adversary' && !g.prompt) g.prompt = e;
    if (e.actor !== 'adversary' && !g.response) g.response = e;
  }

  for (const g of byKey.values()) groups.push(g);
  groups.sort((a, b) => ((a.prompt?.seq ?? a.response?.seq ?? 0) - (b.prompt?.seq ?? b.response?.seq ?? 0)));

  // Attach network events between prompt/response seq windows (best-effort).
  const httpEvents = events
    .filter((e) => e.channel === 'http' && e.type !== 'agent.message')
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  for (const g of groups) {
    const start = g.prompt?.seq ?? g.response?.seq ?? null;
    const end = g.response?.seq ?? g.prompt?.seq ?? null;
    if (start === null || end === null) continue;
    const low = Math.min(start, end);
    const high = Math.max(start, end);
    g.relatedNetwork = httpEvents.filter((e) => (e.seq ?? -1) >= low && (e.seq ?? -1) <= high);

    const evidenceSet = new Set<string>();
    for (const ev of [g.prompt, g.response, ...g.relatedNetwork]) {
      if (ev?.id) evidenceSet.add(ev.id);
    }
    g.relatedStory = storySteps
      .filter((s) => s.evidenceEventIds?.some((id) => evidenceSet.has(id)))
      .slice(0, 3)
      .map((s) => ({ id: s.id, claimTitle: s.claimTitle }));
  }

  if (groups.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={MessageSquare}
          heading="No prompt chain events yet"
          description="Adversarial prompts and agent responses will appear here."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {groups.map((g) => {
        const seq = g.prompt?.seq ?? g.response?.seq ?? null;
        return (
          <div key={g.key} className="rounded-lg border border-[var(--border-default)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {g.scriptStepId ? `Step ${g.scriptStepId}` : 'Prompt step'}
                  </div>
                  {g.scriptId && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {g.scriptId}
                    </span>
                  )}
                  {seq !== null && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">seq {seq}</span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-purple-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Adversary prompt</div>
                    <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                      {g.prompt ? getMessageText(g.prompt) : <span className="text-slate-500">Not captured</span>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-emerald-50 p-3">
                    <div className="text-xs font-semibold text-slate-900">Agent response</div>
                    <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                      {g.response ? getMessageText(g.response) : <span className="text-slate-500">Not captured</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{g.relatedNetwork.length} network event{g.relatedNetwork.length === 1 ? '' : 's'}</span>
                  {g.relatedStory.length > 0 && (
                    <span>• supports {g.relatedStory.length} story step{g.relatedStory.length === 1 ? '' : 's'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const combined = [
                        g.prompt ? `PROMPT:\n${getMessageText(g.prompt)}` : 'PROMPT:\n(n/a)',
                        g.response ? `RESPONSE:\n${getMessageText(g.response)}` : 'RESPONSE:\n(n/a)',
                      ].join('\n\n');
                      await navigator.clipboard.writeText(combined);
                      toast.success('Copied step');
                    } catch {
                      toast.error('Copy failed');
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/saved-prompts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          projectId,
                          kind: 'adversary',
                          title: g.scriptStepId ? `Chain step ${g.scriptStepId}` : 'Prompt chain step',
                          promptText: g.prompt ? getMessageText(g.prompt) : '',
                          scriptId: g.scriptId,
                          scriptStepId: g.scriptStepId,
                          sourceRunId: runId,
                          sourceEventId: g.prompt?.id,
                          tags: ['prompt_chain'],
                        }),
                      });
                      if (!res.ok) throw new Error('Save failed');
                      toast.success('Saved prompt');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Save failed');
                    }
                  }}
                  disabled={!g.prompt}
                >
                  <BookPlus className="h-4 w-4 mr-1.5" />
                  Save
                </Button>

                {onOpenEventProof && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const evs = [g.prompt, g.response, ...g.relatedNetwork].filter(Boolean) as Event[];
                      onOpenEventProof(g.scriptStepId ? `Step ${g.scriptStepId}` : 'Prompt step', evs);
                    }}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1.5" />
                    Proof
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Network Tab Component
function NetworkTab({ events, currentSeq }: { events: Event[]; currentSeq: number }) {
  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Network}
          heading="No network events"
          description="If you're expecting traffic, common reasons include: HTTPS CONNECT-only tunnels (no TLS decryption), sidecar not connected, or events outside the run window."
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {events.map((event) => {
        const isPast = event.seq !== null && event.seq <= currentSeq;
        const hasSecrets = event.matches && event.matches.length > 0;

        return (
          <div
            key={event.id}
            className={`rounded-lg border border-[var(--border-default)] bg-white p-3 ${
              isPast ? 'opacity-100' : 'opacity-40'
            } transition-opacity duration-[var(--transition-base)]`}
          >
            {/* Method + host */}
            <div className="flex items-center gap-2 mb-2">
              {getEventMethod(event) && (
                <Badge variant="default">
                  {getEventMethod(event)}
                </Badge>
              )}
              <span className="text-sm font-mono text-[var(--text-primary)]">
                {getEventHost(event)}
                {getEventPath(event)}
              </span>
            </div>

            {/* Classification */}
            {getEventClassification(event) && (
              <div className="mb-2">
                <Badge variant="info">
                  {getEventClassification(event)!.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}

            {/* Status + metrics */}
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              {getEventStatusCode(event) && (
                <span>Status: {getEventStatusCode(event)}</span>
              )}
              {getEventDurationMs(event) && (
                <span>{getEventDurationMs(event)}ms</span>
              )}
              {getEventBytesOut(event) && (
                <span>{getEventBytesOut(event)}B out</span>
              )}
              {getEventBytesIn(event) && (
                <span>{getEventBytesIn(event)}B in</span>
              )}
            </div>

            {/* Secret matches alert */}
            {hasSecrets && event.matches && (
              <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium text-red-700">
                  {event.matches.length} secret{event.matches.length > 1 ? 's' : ''} detected
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Findings Tab Component
function FindingsTab({
  findings,
  onOpenProof,
}: {
  findings: Finding[];
  onOpenProof?: (finding: Finding) => void;
}) {
  if (findings.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Shield}
          heading="No findings yet"
          description="Security findings will appear here as the run progresses"
        />
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-[var(--severity-critical)]';
      case 'high':
        return 'border-l-[var(--severity-high)]';
      case 'medium':
        return 'border-l-[var(--severity-medium)]';
      case 'low':
        return 'border-l-[var(--severity-low)]';
      default:
        return 'border-l-[var(--severity-info)]';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {findings.map((finding) => (
        <div
          key={finding.id}
          onClick={() => onOpenProof?.(finding)}
          className={`
            rounded-lg border border-[var(--border-default)] bg-white p-4
            border-l-4 ${getSeverityColor(finding.severity)}
            cursor-pointer hover:shadow-[var(--shadow-card)] transition-shadow duration-[var(--transition-base)]
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex-1">
              {finding.title}
            </h3>
            <Badge variant={finding.severity as any}>
              {finding.severity}
            </Badge>
          </div>

          {/* Summary */}
          <p className="text-sm text-[var(--text-secondary)] mb-3">{finding.summary}</p>

          {/* Footer */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            {finding.scriptId && (
              <span className="font-mono bg-[var(--surface-bg)] px-2 py-0.5 rounded">
                {finding.scriptId}
              </span>
            )}
            <span>Score: {finding.score}</span>
            <span>Confidence: {Math.round(finding.confidence * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Policy Tab Component
function PolicyTab({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Database}
          heading="No policy violations"
          description="Policy violation events will appear here"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">{event.type}</p>
              <p className="text-sm text-amber-700">
                {event.payload_redacted?.summary || 'Policy violation detected'}
              </p>
              <span className="text-xs text-amber-600 mt-1">
                {new Date(event.ts).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
