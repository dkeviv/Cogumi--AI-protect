'use client';

import { useEffect, useMemo, useState } from 'react';

type Project = {
  id: string;
  name: string;
};

type Run = {
  id: string;
  createdAt: string;
  projectId: string;
};

type Finding = {
  id: string;
  title: string;
  severity: string;
  summary: string;
  runId: string;
};

type FindingRow = Finding & { projectName: string };

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-blue-100 text-blue-700',
  info: 'bg-slate-100 text-slate-600',
};

export function TopFindingsPreview() {
  const [findings, setFindings] = useState<FindingRow[]>([]);
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
              projectId: project.id,
            }));
          })
        );

        const runs = runsByProject
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        const findingsByRun = await Promise.all(
          runs.map(async (run) => {
            const res = await fetch(`/api/runs/${run.id}/findings`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.findings || []).map((finding: Finding) => ({
              ...finding,
              projectName:
                projects.find((project) => project.id === run.projectId)?.name ||
                'Unknown Project',
            }));
          })
        );

        const merged = findingsByRun.flat();
        merged.sort((a, b) => {
          const aRank = SEVERITY_ORDER.indexOf(a.severity);
          const bRank = SEVERITY_ORDER.indexOf(b.severity);
          if (aRank !== bRank) return aRank - bRank;
          return a.title.localeCompare(b.title);
        });

        setFindings(merged.slice(0, 6));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load findings');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const empty = useMemo(() => !loading && findings.length === 0, [loading, findings.length]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--app-shadow-card)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Top Findings</h3>
        <p className="text-xs text-slate-500">Highest severity issues across recent runs</p>
      </div>

      <div className="px-5 py-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-16 rounded-lg bg-slate-100" />
            <div className="h-16 rounded-lg bg-slate-100" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {empty && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No findings yet. Complete a run to see prioritized findings here.
          </div>
        )}

        {!loading && !error && findings.length > 0 && (
          <div className="space-y-3">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    {finding.title}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info}`}>
                    {finding.severity.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{finding.projectName}</p>
                <p className="mt-2 text-sm text-slate-600">{finding.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
