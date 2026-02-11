'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, ChevronRight, Loader2 } from 'lucide-react';

type RunRow = {
  id: string;
  status: string;
  createdAt: string;
  riskScore: number | null;
};

export function RunPicker({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/runs`);
        if (!res.ok) throw new Error('Failed to load runs');
        const data = await res.json();
        const rows: RunRow[] = (data.runs || []).map((r: any) => ({
          id: r.id,
          status: r.status,
          createdAt: r.createdAt,
          riskScore: r.riskScore ?? null,
        }));
        if (!cancelled) {
          setRuns(rows);
          setSelected(rows[0]?.id || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const selectedRun = useMemo(() => runs.find((r) => r.id === selected) || null, [runs, selected]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">Run Selector</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Jump into a specific run replay.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : runs.length === 0 ? (
            <div className="text-sm text-[var(--text-secondary)]">No runs yet</div>
          ) : (
            <>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="min-w-[240px] rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)]"
                aria-label="Select a run"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.id.slice(0, 8)} • {run.status} • {new Date(run.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                onClick={() => selected && router.push(`/runs/${selected}`)}
                disabled={!selected}
              >
                <Play className="h-4 w-4 mr-2" />
                Open Run
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </div>

        {selectedRun && (
          <div className="text-xs text-[var(--text-muted)]">
            Risk: {selectedRun.riskScore ?? '—'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

