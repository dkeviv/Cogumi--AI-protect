'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

type Run = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled' | 'stopped';
  riskScore: number | null;
  createdAt: string;
  endedAt: string | null;
};

interface RunsTableProps {
  projectId: string;
  canStartRun?: boolean;
}

const ALL_SCRIPTS = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
type ScriptId = (typeof ALL_SCRIPTS)[number];

export function RunsTableNew({ projectId, canStartRun = false }: RunsTableProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [scriptsEnabled, setScriptsEnabled] = useState<ScriptId[]>([...ALL_SCRIPTS]);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchRuns();
  }, [projectId]);

  async function fetchRuns() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/runs`);
      if (!response.ok) throw new Error('Failed to fetch runs');
      const data = await response.json();
      setRuns(data.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartRun() {
    try {
      if (scriptsEnabled.length === 0) {
        toast.error('Select at least one script');
        return;
      }
      setIsStartingRun(true);
      const response = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign', scriptsEnabled }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Failed to start run');
      }
      
      const data = await response.json();
      // Start execution immediately (worker runs async).
      const exec = await fetch(`/api/runs/${data.run.id}/execute`, { method: 'POST' });
      if (!exec.ok) {
        const execData = await exec.json().catch(() => ({}));
        throw new Error(execData.error || execData.message || 'Run created but failed to enqueue execution');
      }

      toast.success('Run started successfully!');
      setStartModalOpen(false);
      
      // Navigate to run page
      router.push(`/runs/${data.run.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start run');
      setIsStartingRun(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonTable />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <Button onClick={fetchRuns} variant="secondary" size="sm" className="mt-2">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Play}
            heading="No runs yet"
            description={canStartRun 
              ? "Start your first red team test to see results here." 
              : "Complete setup to start running tests."
            }
            action={canStartRun ? {
              label: 'Start New Run',
              onClick: () => setStartModalOpen(true),
            } : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Runs</CardTitle>
        {canStartRun && (
          <Button 
            variant="primary" 
            size="sm"
            onClick={() => setStartModalOpen(true)}
            disabled={isStartingRun}
          >
            <Play className="h-4 w-4 mr-1.5" />
            {isStartingRun ? 'Starting...' : 'Start Run'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="pb-3 text-left text-xs font-medium text-[var(--text-muted)]">Status</th>
                <th className="pb-3 text-left text-xs font-medium text-[var(--text-muted)]">Risk Score</th>
                <th className="pb-3 text-left text-xs font-medium text-[var(--text-muted)]">Created</th>
                <th className="pb-3 text-left text-xs font-medium text-[var(--text-muted)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 5).map((run) => (
                <tr 
                  key={run.id}
                  className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--surface-subtle)] transition-colors"
                >
                  <td className="py-3">
                    <Link href={`/runs/${run.id}`} className="block">
                      <Badge variant={
                        run.status === 'running' ? 'running' :
                        run.status === 'completed' ? 'completed' :
                        run.status === 'failed' ? 'failed' :
                        run.status === 'canceled' ? 'canceled' :
                        run.status === 'stopped' ? 'stopped' :
                        'queued'
                      }>
                        {run.status}
                      </Badge>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Link href={`/runs/${run.id}`} className="block">
                      {run.riskScore !== null ? (
                        <Badge variant={
                          run.riskScore >= 80 ? 'critical' :
                          run.riskScore >= 60 ? 'high' :
                          run.riskScore >= 40 ? 'medium' :
                          'low'
                        }>
                          {run.riskScore}
                        </Badge>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="py-3">
                    <Link href={`/runs/${run.id}`} className="block">
                      <span className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Clock className="h-4 w-4" />
                        {formatDate(run.createdAt)}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3">
                    <Link href={`/runs/${run.id}`} className="block">
                      <span className="text-sm text-[var(--text-secondary)]">
                        {getDuration(run.createdAt, run.endedAt)}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {runs.length > 5 && (
          <div className="mt-4 text-center">
            <Link 
              href={`/runs`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all runs →
            </Link>
          </div>
        )}
      </CardContent>

      <Modal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title="Start New Run"
        description="Select which scripts to run for this campaign. Your selection is snapshotted into the run for reproducibility."
        size="lg"
        actions={[
          { label: 'Cancel', variant: 'ghost', onClick: () => setStartModalOpen(false) },
          { label: isStartingRun ? 'Starting…' : 'Start run', variant: 'primary', onClick: handleStartRun },
        ]}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-default)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Scripts</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  S1 prompt injection, S2 jailbreak, S3 secret leakage, S4 exfiltration, S5 privilege escalation.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setScriptsEnabled([...ALL_SCRIPTS])}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setScriptsEnabled([])}
                >
                  None
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_SCRIPTS.map((id) => {
                const checked = scriptsEnabled.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) setScriptsEnabled((prev) => (prev.includes(id) ? prev : [...prev, id]));
                        else setScriptsEnabled((prev) => prev.filter((s) => s !== id));
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{id}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {id === 'S1'
                          ? 'Prompt injection'
                          : id === 'S2'
                          ? 'Jailbreak'
                          : id === 'S3'
                          ? 'Secret leakage'
                          : id === 'S4'
                          ? 'Exfiltration intent'
                          : 'Privilege escalation intent'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {scriptsEnabled.length === 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Select at least one script to start a run.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Card>
  );
}
