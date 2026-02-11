'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { X, MessageSquare, Network, Shield, AlertTriangle, MoveRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
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
    hash: string;
  }>;
}

function getEventHost(e: Event) {
  const host = typeof e.host === 'string' ? e.host.trim() : '';
  return host || e.destination?.host || 'unknown';
}

function getEventPath(e: Event) {
  return e.path ?? e.destination?.path ?? null;
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

interface ProofDrawerNewProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  evidenceEvents: Event[];
  onJumpToSeq?: (seq: number) => void;
  finding?: {
    id: string;
    title: string;
    severity: string;
    triageStatus?: 'open' | 'fixed' | 'accepted';
    ownerUserId?: string | null;
    eta?: string | null;
    whyItWorks?: string | null;
    verificationStep?: string | null;
  };
  onFindingUpdated?: (finding: any) => void;
}

export function ProofDrawerNew({
  isOpen,
  onClose,
  stepTitle,
  evidenceEvents,
  onJumpToSeq,
  finding,
  onFindingUpdated,
}: ProofDrawerNewProps) {
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triageStatus, setTriageStatus] = useState<'open' | 'fixed' | 'accepted'>('open');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [eta, setEta] = useState<string>('');
  const [whyItWorks, setWhyItWorks] = useState('');
  const [verificationStep, setVerificationStep] = useState('');

  useEffect(() => {
    if (!finding) return;
    setTriageStatus((finding.triageStatus as any) || 'open');
    setOwnerUserId(finding.ownerUserId || '');
    setEta(finding.eta ? new Date(finding.eta).toISOString().slice(0, 10) : '');
    setWhyItWorks(finding.whyItWorks || '');
    setVerificationStep(finding.verificationStep || '');
  }, [finding]);
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build evidence chain
  const chain = buildEvidenceChain(evidenceEvents);
  const findingBadgeVariant = finding?.severity === 'critical' ? 'critical' : finding?.severity === 'high' ? 'high' : 'info';
  const triageVariant = triageStatus === 'fixed' ? 'completed' : triageStatus === 'accepted' ? 'medium' : 'high';
  const hasFinding = Boolean(finding?.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[560px] bg-white shadow-[var(--shadow-modal)] z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Evidence Chain
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{stepTitle}</p>

              {hasFinding && (
                <div className="mt-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={findingBadgeVariant as any}>{finding?.severity}</Badge>
                        <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{finding?.title}</div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                        <span>Triage: <Badge variant={triageVariant as any}>{triageStatus}</Badge></span>
                        <span>Owner: {ownerUserId ? ownerUserId.slice(0, 10) : 'unassigned'}</span>
                        <span>ETA: {eta || '—'}</span>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-[var(--transition-base)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Evidence cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chain.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-muted)]">No evidence events found</p>
            </div>
          ) : (
            chain.map((card, idx) => (
              <EvidenceCard key={idx} card={card} onJump={onJumpToSeq} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-default)] flex-shrink-0">
          <p className="text-xs text-[var(--text-muted)]">
            {evidenceEvents.length} evidence event{evidenceEvents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {hasFinding && (
        <Modal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          title="Update Finding"
          description="Track mitigation ownership and verification in a way that survives re-runs."
          size="lg"
          actions={[
            { label: 'Cancel', variant: 'ghost', onClick: () => setEditOpen(false) },
            {
              label: saving ? 'Saving…' : 'Save',
              variant: 'primary',
              onClick: async () => {
                if (!finding) return;
                try {
                  setSaving(true);
                  const res = await fetch(`/api/findings/${finding.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      triageStatus,
                      ownerUserId: ownerUserId.trim().length === 0 ? null : ownerUserId.trim(),
                      eta: eta ? new Date(eta).toISOString() : null,
                      whyItWorks: whyItWorks.trim().length === 0 ? null : whyItWorks,
                      verificationStep: verificationStep.trim().length === 0 ? null : verificationStep,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to update finding');
                  }
                  const data = await res.json();
                  toast.success('Finding updated');
                  onFindingUpdated?.(data.finding);
                  setEditOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Save failed');
                } finally {
                  setSaving(false);
                }
              },
            },
          ]}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-sm">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Triage status</div>
                <select
                  className="w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm"
                  value={triageStatus}
                  onChange={(e) => setTriageStatus(e.target.value as any)}
                >
                  <option value="open">Open</option>
                  <option value="fixed">Fixed</option>
                  <option value="accepted">Accepted risk</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Owner (user id)</div>
                <input
                  className="w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm"
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  placeholder="uuid…"
                />
              </label>
              <label className="text-sm">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">ETA</div>
                <input
                  type="date"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                />
              </label>
            </div>

            <label className="text-sm block">
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Why it works</div>
              <textarea
                className="w-full min-h-[90px] rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm"
                value={whyItWorks}
                onChange={(e) => setWhyItWorks(e.target.value)}
                placeholder="Explain the mitigation rationale so engineering can implement correctly."
              />
            </label>

            <label className="text-sm block">
              <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">Verification step</div>
              <textarea
                className="w-full min-h-[90px] rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm"
                value={verificationStep}
                onChange={(e) => setVerificationStep(e.target.value)}
                placeholder="How to prove closure (re-run + expected evidence)."
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}

// Evidence card types
type EvidenceCardType = 'conversation' | 'network' | 'detector' | 'policy';

interface EvidenceCardData {
  type: EvidenceCardType;
  event: Event;
  title: string;
  content: React.ReactNode;
}

function EvidenceCard({ card, onJump }: { card: EvidenceCardData; onJump?: (seq: number) => void }) {
  const getIcon = () => {
    switch (card.type) {
      case 'conversation':
        return MessageSquare;
      case 'network':
        return Network;
      case 'detector':
        return Shield;
      case 'policy':
        return AlertTriangle;
    }
  };

  const getColor = () => {
    switch (card.type) {
      case 'conversation':
        return 'text-purple-600 bg-purple-100';
      case 'network':
        return 'text-blue-600 bg-blue-100';
      case 'detector':
        return 'text-red-600 bg-red-100';
      case 'policy':
        return 'text-amber-600 bg-amber-100';
    }
  };

  const Icon = getIcon();

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-white overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 bg-[var(--surface-bg)] border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${getColor().split(' ')[1]}`} />
          <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            {card.type}
          </span>
          <Badge variant="default">{card.event.channel}</Badge>
        </div>
        {card.event.seq !== null && onJump && (
          <Button
            variant="ghost"
            onClick={() => onJump(card.event.seq!)}
          >
            <MoveRight className="h-3.5 w-3.5 mr-1" />
            Jump
          </Button>
        )}
      </div>

      {/* Card content */}
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{card.title}</h3>
        <div className="text-sm text-[var(--text-secondary)]">{card.content}</div>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          {new Date(card.event.ts).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// Build evidence chain from events
function buildEvidenceChain(events: Event[]): EvidenceCardData[] {
  const chain: EvidenceCardData[] = [];

  events.forEach((event) => {
    // Conversation card
    if (event.type === 'agent.message') {
      const isAdversary = event.actor === 'adversary';
      const meta = getMessageMeta(event);
      chain.push({
        type: 'conversation',
        event,
        title: isAdversary ? 'Adversary Message' : 'Agent Response',
        content: (
          <div className="space-y-1">
            <p className="font-medium">
              {isAdversary ? 'Adversary' : 'Agent'}
              {(meta.scriptId || meta.scriptStepId) && (
                <span className="ml-2 text-xs font-mono text-[var(--text-muted)]">
                  {meta.scriptId || 'S?'}
                  {meta.scriptStepId ? ` · ${meta.scriptStepId}` : ''}
                </span>
              )}
            </p>
            <p>{getMessageText(event)}</p>
          </div>
        ),
      });
    }

    // Network card
    if (event.channel === 'http' && event.type !== 'agent.message') {
      chain.push({
        type: 'network',
        event,
        title: 'Network Request',
        content: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getEventMethod(event) && <Badge variant="default">{getEventMethod(event)}</Badge>}
              <span className="font-mono text-xs">{getEventHost(event)}</span>
            </div>
            {getEventPath(event) && (
              <p className="font-mono text-xs text-[var(--text-muted)]">{getEventPath(event)}</p>
            )}
            {getEventClassification(event) && (
              <Badge variant="info">{getEventClassification(event)!.replace(/_/g, ' ')}</Badge>
            )}
            <div className="flex gap-3 text-xs text-[var(--text-muted)]">
              {getEventStatusCode(event) && <span>Status: {getEventStatusCode(event)}</span>}
              {getEventDurationMs(event) && <span>{getEventDurationMs(event)}ms</span>}
              {getEventBytesOut(event) && <span>{getEventBytesOut(event)}B out</span>}
            </div>
          </div>
        ),
      });
    }

    // Detector card (secret matches)
    if (event.matches && event.matches.length > 0) {
      event.matches.forEach((match) => {
        chain.push({
          type: 'detector',
          event,
          title: 'Secret Detected',
          content: (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <Badge variant="critical">{match.kind.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-2 font-mono text-xs">
                <span className="text-red-900">{match.preview}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Confidence: {Math.round(match.confidence * 100)}%
              </div>
              <div className="text-xs text-[var(--text-muted)] font-mono break-all">
                Hash: {match.hash.slice(0, 16)}...
              </div>
            </div>
          ),
        });
      });
    }

    // Policy card
    if (event.channel === 'policy') {
      chain.push({
        type: 'policy',
        event,
        title: 'Policy Violation',
        content: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{event.type}</span>
            </div>
            <p>{getMessageText(event) || 'Policy violation detected'}</p>
          </div>
        ),
      });
    }
  });

  return chain;
}
