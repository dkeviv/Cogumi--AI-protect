'use client';

import { useState, useEffect } from 'react';
import { ExploitFeed } from '@/components/run/ExploitFeed';
import { ProofDrawer } from '@/components/run/ProofDrawer';
import { TimelineScrubber } from '@/components/run/TimelineScrubber';
import { EvidenceTabs } from '@/components/run/EvidenceTabs';
import { RunHeader } from '@/components/run/RunHeader';
import { getRunDataSource } from '@/lib/runDataSource';

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
  host: string;
  method: string | null;
  statusCode: number | null;
}

interface TimelineMarker {
  seq: number;
  label: string;
  kind: 'script' | 'confirmed' | 'attempted' | 'quota' | 'posture';
}

export default function RunPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;

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
  const [proofEvents, setProofEvents] = useState<Event[]>([]);
  const [currentSeq, setCurrentSeq] = useState(0);

  // Load initial data
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

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

        // Subscribe to live updates if run is active
        if (data.run.status === 'running') {
          unsubscribe = dataSource.subscribe(runId, {
            onStoryStep: (step) => setStorySteps((prev) => [...prev, step]),
            onFinding: (finding) => setFindings((prev) => [...prev, finding]),
            onRunStatus: (status) => {
              setRun((prev) => (prev ? { ...prev, status } : null));
              if (['completed', 'failed', 'canceled'].includes(status)) {
                unsubscribe?.();
              }
            },
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load run data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadData();

    return () => {
      unsubscribe?.();
    };
  }, [runId]);

  // Handle opening proof drawer
  const handleOpenProof = async (step: StoryStep) => {
    setProofStep(step);
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
      <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
        <div className="text-center">
          <p className="text-lg text-slate-600">Loading run data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
        <div className="text-center">
          <p className="text-lg text-slate-900 font-semibold">
            Failed to load run
          </p>
          <p className="text-sm text-slate-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const isLive = run.status === 'running';

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
      {/* Header */}
      <RunHeader run={run as any} />

      {/* 3-column layout */}
      <div className="flex-1 flex gap-6 overflow-hidden px-6 py-6">
        {/* Left: Exploit Feed */}
        <div className="w-[34%] flex flex-col">
          <ExploitFeed
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

        {/* Center: Timeline Scrubber */}
        <div className="w-72 flex-shrink-0">
          <TimelineScrubber
            markers={timelineMarkers}
            currentSeq={currentSeq}
            minSeq={minSeq}
            maxSeq={maxSeq}
            onChangeSeq={setCurrentSeq}
            onJumpLatest={() => setCurrentSeq(maxSeq)}
            live={isLive}
          />
        </div>

        {/* Right: Evidence Tabs */}
        <div className="flex-1">
          <EvidenceTabs
            events={events as any}
            findings={findings as any}
            currentSeq={currentSeq}
          />
        </div>
      </div>

      {/* Proof Drawer (overlay) */}
      <ProofDrawer
        isOpen={proofDrawerOpen}
        onClose={() => setProofDrawerOpen(false)}
        stepTitle={proofStep?.claimTitle || ''}
        evidenceEvents={proofEvents as any}
      />
    </div>
  );
}
