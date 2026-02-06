'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Project = {
  id: string;
  name: string;
  environment: string;
};

type Run = {
  id: string;
  status: string;
  riskScore: number | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  projectId: string;
};

type RunRow = Run & { projectName: string; environment: string };

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-700',
  stopped_quota: 'bg-amber-100 text-amber-700',
};

export function RecentRunsList() {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const projectsRes = await fetch('/api/projects');
        if (!projectsRes.ok) throw new Error('Failed to load projects');
        const projectsData = await projectsRes.json();
        const projects: Project[] = projectsData.projects || [];

        const runsByProject = await Promise.all(
          projects.map(async (project) => {
            const res = await fetch(`/api/projects/${project.id}/runs`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.runs || []).map((run: Run) => ({
              ...run,
              projectName: project.name,
              environment: project.environment,
            }));
          })
        );

        const merged = runsByProject.flat();
        merged.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

        setRows(merged.slice(0, 8));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--app-shadow-card)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Recent Runs</h3>
          <p className="text-xs text-slate-500">Latest activity across all projects</p>
        </div>
        <div className="text-xs text-slate-500">Last 8</div>
      </div>

      <div className="px-5 py-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {empty && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No runs yet. Launch a test run to populate this feed.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((run) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {run.projectName}
                  </div>
                  <div className="text-xs text-slate-500">
                    Run {run.id.slice(0, 8)} · {new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[run.status] || STATUS_STYLES.queued}`}>
                    {run.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {run.riskScore === null ? 'Score —' : `Score ${run.riskScore}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
