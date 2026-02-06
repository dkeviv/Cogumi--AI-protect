"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Run {
  id: string;
  status: string;
  riskScore: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  canceled: "bg-slate-100 text-slate-700",
  stopped_quota: "bg-amber-100 text-amber-700",
};

export function RunsTable({ projectId }: { projectId: string }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/runs`);
        if (res.ok) {
          const data = await res.json();
          setRuns(data.runs || []);
        }
      } catch (error) {
        console.error("Failed to load runs:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [projectId]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--app-shadow-card)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Runs</h3>
          <p className="text-xs text-slate-500">Recent tests and outcomes</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading && (
          <div className="space-y-3">
            <div className="h-10 rounded-lg bg-slate-100" />
            <div className="h-10 rounded-lg bg-slate-100" />
          </div>
        )}

        {!loading && runs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No runs yet. Start a run to generate evidence.
          </div>
        )}

        {!loading && runs.length > 0 && (
          <div className="divide-y divide-slate-200">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Run {run.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {run.startedAt
                      ? new Date(run.startedAt).toLocaleString()
                      : new Date(run.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUS_STYLES[run.status] || STATUS_STYLES.queued
                    }`}
                  >
                    {run.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    {run.riskScore === null ? "Score —" : `Score ${run.riskScore}`}
                  </span>
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
