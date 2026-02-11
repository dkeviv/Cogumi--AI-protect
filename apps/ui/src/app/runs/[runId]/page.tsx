'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ExploitFeedNew } from '@/components/run/ExploitFeedNew';
import { ProofDrawerNew } from '@/components/run/ProofDrawerNew';
import { TimelineScrubberNew } from '@/components/run/TimelineScrubberNew';
import { EvidencePanelNew } from '@/components/run/EvidencePanelNew';
import { RunHeaderNew } from '@/components/run/RunHeaderNew';
import { getRunDataSource } from '@/lib/runDataSource';
import { useToast } from '@/components/ui/Toast';
import { useRunStream } from '@/hooks/useRunStream';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

// Simplified types matching our API responses
interface Run {
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
}

interface StoryStep {
  id: string;
  runId: string;
  ts: string;
  seqStart: number | null;
  seqEnd: number | null;
  scriptId: string | null;
  stepKind: string;
  severity: string;
  claimTitle: string;
  claimSummary: string;
  evidenceEventIds: string[];
}

interface Finding {
  id: string;
  title: string;
  severity: string;
  status: string;
  summary: string;
}

interface Event {
  id: string;
  seq: number | null;
  ts: string;
  type: string;
  channel: string;
  host?: string;
  method?: string | null;
  statusCode?: number | null;
}

interface TimelineMarker {
  seq: number;
  label: string;
  kind: 'script' | 'confirmed' | 'attempted' | 'quota' | 'posture';
}

export default function RunPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;
  const toast = useToast();

  // State
  const [run, setRun] = useState<Run | null>(null);
  const [storySteps, setStorySteps] = useState<StoryStep[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [proofDrawerOpen, setProofDrawerOpen] = useState(false);
  const [proofStep, setProofStep] = useState<StoryStep | null>(null);
  const [proofFinding, setProofFinding] = useState<any | null>(null);
  const [proofEvents, setProofEvents] = useState<Event[]>([]);
  const [currentSeq, setCurrentSeq] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);

  // SSE live stream (only connect when run is active)
  const isLive = run?.status === 'running';
  const { isConnected, isReconnecting, error: streamError } = useRunStream(
    isLive ? runId : null,
    {
      onRunStatus: (status: string) => {
        setRun((prev) => (prev ? { ...prev, status } : null));
        if (['completed', 'failed', 'canceled'].includes(status)) {
          toast.info(`Run ${status}`);
        }
      },
      onStoryStep: (step: any) => {
        setStorySteps((prev) => [...prev, step]);
        // Auto-update currentSeq to latest
        if (step.seqStart) {
          setCurrentSeq(step.seqStart);
        }
      },
      onFinding: (finding: any) => {
        setFindings((prev) => [...prev, finding]);
      },
      onQuotaWarning: (warning: any) => {
        toast.warning(`Quota warning: ${warning.message || 'Limit approaching'}`);
      },
      onError: (err: Error) => {
        toast.error(`Stream error: ${err.message}`);
      },
    }
  );

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const dataSource = getRunDataSource();
        const data = await dataSource.getInitialData(runId);

        setRun(data.run);
        setStorySteps(data.storySteps || []);
        setFindings(data.findings || []);
        setEvents(data.events || []);

        // Set initial currentSeq to max seq
        const maxSeq = Math.max(...(data.events || []).map((e: Event) => e.seq || 0), 0);
        setCurrentSeq(maxSeq);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load run data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadData();
  }, [runId]);

  // Handle opening proof drawer
  const handleOpenProof = async (step: StoryStep) => {
    setProofStep(step);
    setProofFinding(null);
    setProofDrawerOpen(true);

    if (step.evidenceEventIds && step.evidenceEventIds.length > 0) {
      try {
        // Fetch events by filtering from our cached events
        const evidenceEvents = events.filter((e) => 
          step.evidenceEventIds.includes(e.id)
        );
        setProofEvents(evidenceEvents);
      } catch (err) {
        console.error('Failed to load proof events:', err);
      }
    }
  };

  // Build timeline markers
  const timelineMarkers: TimelineMarker[] = storySteps
    .filter((step) => step.seqStart !== null)
    .map((step) => ({
      seq: step.seqStart!,
      label: step.claimTitle,
      kind:
        step.stepKind === 'confirmed'
          ? 'confirmed'
          : step.stepKind === 'attempt'
          ? 'attempted'
          : step.stepKind === 'quota'
          ? 'quota'
          : step.stepKind === 'blocked'
          ? 'posture'
          : 'script',
    }));

  const minSeq = Math.min(...events.map((e) => e.seq || 0), 0);
  const maxSeq = Math.max(...events.map((e) => e.seq || 0), 0);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-bg)]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[var(--brand-from)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-[var(--text-secondary)]">Loading run data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--surface-bg)]">
        <div className="text-center">
          <p className="text-lg text-[var(--text-primary)] font-semibold">
            Failed to load run
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">{error}</p>
        </div>
      </div>
    );
  }

  // Handle cancel run
  const handleCancelRun = async () => {
    try {
      const res = await fetch(`/api/runs/${runId}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel run');
      toast.success('Run canceled successfully');
      setRun({ ...run, status: 'canceled' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel run');
    }
  };

  // Handle download report
  const handleDownloadReport = async () => {
    try {
      const res = await fetch(`/api/runs/${runId}/report`);
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run-${runId.slice(0, 8)}-report.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download report');
    }
  };

  const handleDownloadEvidence = async () => {
    try {
      const res = await fetch(`/api/runs/${runId}/bundle`);
      if (!res.ok) throw new Error('Failed to export evidence bundle');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `run-${runId.slice(0, 8)}-evidence.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Evidence bundle downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download evidence bundle');
    }
  };

  const handleOpenCompare = async () => {
    try {
      setCompareOpen(true);
      setCompareLoading(true);
      const res = await fetch(`/api/runs/${runId}/compare`);
      if (!res.ok) throw new Error('Failed to compare runs');
      const data = await res.json();
      setCompareData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to compare runs');
      setCompareData(null);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <AppShell sidebarMode="rail">
      <div className="flex min-h-screen flex-col bg-[var(--surface-bg)]">
        {/* Header */}
        <RunHeaderNew
          run={run as any}
          onCancel={isLive ? handleCancelRun : undefined}
          onDownloadReport={run.status === 'completed' ? handleDownloadReport : undefined}
          onDownloadEvidence={run.status === 'completed' ? handleDownloadEvidence : undefined}
          onCompare={handleOpenCompare}
        />

        {/* Stream connection status banner */}
        {isLive && isReconnecting && (
          <div className="bg-amber-500 text-white px-6 py-2 text-sm font-medium flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            Reconnecting to live stream...
          </div>
        )}

        {isLive && streamError && !isConnected && !isReconnecting && (
          <div className="bg-red-500 text-white px-6 py-2 text-sm font-medium">
            ⚠️ Stream disconnected: {streamError}
          </div>
        )}

        {/* Main content - 2 column layout (stacks on mobile) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden px-4 sm:px-6 py-6">
          {/* Left: Narrative + Timeline (380px fixed on desktop, full width on mobile) */}
          <div className="w-full lg:w-[380px] lg:flex-shrink-0 h-[520px] lg:h-full flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 min-h-0">
              <ExploitFeedNew
                steps={storySteps as any}
                selectedStepId={selectedStepId || undefined}
                onSelectStep={(step: any) => {
                  setSelectedStepId(step.id);
                  if (step.seqStart) {
                    setCurrentSeq(step.seqStart);
                  }
                }}
                onOpenProof={handleOpenProof as any}
                live={isLive}
              />
            </div>
            <div className="h-[260px] flex-shrink-0">
              <TimelineScrubberNew
                markers={timelineMarkers}
                currentSeq={currentSeq}
                minSeq={minSeq}
                maxSeq={maxSeq}
                onChangeSeq={setCurrentSeq}
                onJumpLatest={() => setCurrentSeq(maxSeq)}
                live={isLive}
              />
            </div>
          </div>

          {/* Right: Evidence Panel (flex-1) */}
          <div className="flex-1 h-[500px] lg:h-full overflow-hidden">
            <EvidencePanelNew
              runId={runId}
              projectId={run.project.id}
              events={events as any}
              findings={findings as any}
              storySteps={storySteps as any}
              currentSeq={currentSeq}
              onOpenProof={(finding: any) => {
                setProofStep(null);
                setProofFinding(finding);
                setProofDrawerOpen(true);
                if (finding.evidenceEventIds && finding.evidenceEventIds.length > 0) {
                  const evidenceEvents = events.filter((e) =>
                    finding.evidenceEventIds.includes(e.id)
                  );
                  setProofEvents(evidenceEvents);
                }
              }}
              onOpenEventProof={(title, evs) => {
                setProofStep(null);
                setProofFinding(null);
                setProofDrawerOpen(true);
                setProofEvents(evs);
              }}
            />
          </div>
        </div>

        {/* Proof Drawer (overlay) */}
        <ProofDrawerNew
          isOpen={proofDrawerOpen}
          onClose={() => setProofDrawerOpen(false)}
          stepTitle={proofStep?.claimTitle || 'Evidence'}
          finding={proofFinding || undefined}
          onFindingUpdated={(updated: any) => {
            setFindings((prev) => prev.map((f: any) => (f.id === updated.id ? updated : f)));
            setProofFinding(updated);
          }}
          evidenceEvents={proofEvents as any}
          onJumpToSeq={(seq) => {
            setCurrentSeq(seq);
            setProofDrawerOpen(false);
          }}
        />

        <Modal
          isOpen={compareOpen}
          onClose={() => setCompareOpen(false)}
          title="Compare to Previous Run"
          description="Diff of findings, policy signals, and risk score vs the previous run in this project."
          size="lg"
        >
          {compareLoading ? (
            <div className="space-y-3">
              <div className="h-10 rounded-lg bg-slate-100" />
              <div className="h-10 rounded-lg bg-slate-100" />
              <div className="h-20 rounded-lg bg-slate-100" />
            </div>
          ) : !compareData || compareData.baselineRunId === null ? (
            <div className="text-sm text-[var(--text-secondary)]">
              {compareData?.message || 'No previous run found for this project yet.'}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-[var(--border-default)] bg-white p-3">
                  <div className="text-xs text-[var(--text-muted)]">Risk score</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-lg font-semibold text-[var(--text-primary)]">{compareData.riskScore ?? '—'}</div>
                    <Badge variant={compareData.riskScoreDelta > 0 ? 'high' : compareData.riskScoreDelta < 0 ? 'completed' : 'info'}>
                      {compareData.riskScoreDelta > 0 ? `+${compareData.riskScoreDelta}` : `${compareData.riskScoreDelta}`}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    baseline {compareData.baselineRiskScore ?? '—'}
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-white p-3">
                  <div className="text-xs text-[var(--text-muted)]">New findings</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{compareData.newFindings?.length ?? 0}</div>
                </div>

                <div className="rounded-lg border border-[var(--border-default)] bg-white p-3">
                  <div className="text-xs text-[var(--text-muted)]">Resolved findings</div>
                  <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{compareData.resolvedFindings?.length ?? 0}</div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-default)] bg-white p-3">
                <div className="text-xs text-[var(--text-muted)]">Policy violations</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{compareData.policyViolations ?? 0}</div>
                  <Badge variant={compareData.policyViolationsDelta > 0 ? 'high' : compareData.policyViolationsDelta < 0 ? 'completed' : 'info'}>
                    {compareData.policyViolationsDelta > 0 ? `+${compareData.policyViolationsDelta}` : `${compareData.policyViolationsDelta}`}
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)]">baseline {compareData.baselinePolicyViolations ?? 0}</span>
                </div>
              </div>

              {(compareData.newFindings?.length ?? 0) > 0 && (
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">New findings</div>
                  <div className="space-y-2">
                    {compareData.newFindings.slice(0, 8).map((f: any) => (
                      <div key={f.id} className="rounded-lg border border-[var(--border-default)] bg-white p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={f.severity as any}>{f.severity}</Badge>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{f.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
