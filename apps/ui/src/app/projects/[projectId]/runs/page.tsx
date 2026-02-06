'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/nav/AppHeader';

interface Run {
  id: string;
  status: string;
  riskScore: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  environment: string;
}

export default function ProjectRunsPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [projectRes, runsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/runs`),
        ]);

        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData.project);
        }

        if (runsRes.ok) {
          const runsData = await runsRes.json();
          setRuns(runsData.runs);
        }
      } catch (error) {
        console.error('Failed to load:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  async function handleCreateRun() {
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign' }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || 'Failed to create run');
        return;
      }

      const data = await res.json();
      
      // Execute the run
      const execRes = await fetch(`/api/runs/${data.run.id}/execute`, {
        method: 'POST',
      });

      if (!execRes.ok) {
        alert('Run created but failed to start execution');
      }

      // Navigate to run page
      router.push(`/runs/${data.run.id}`);
    } catch (error) {
      console.error('Failed to create run:', error);
      alert('Failed to create run');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-red-600">Project not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'canceled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e8eef9_0%,_#f6f7fb_45%,_#f6f7fb_100%)]">
      <AppHeader
        title={`${project.name} · Runs`}
        backHref={`/projects/${projectId}`}
        backLabel="Project"
        rightSlot={
          <Link
            href={`/projects/${projectId}/settings`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            Settings
          </Link>
        }
      />
      <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Environment:{' '}
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {project.environment}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/projects/${projectId}/settings`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Settings
          </Link>
          <button
            onClick={handleCreateRun}
            disabled={creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : '+ New Run'}
          </button>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--app-shadow-card)] overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Started
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No runs yet. Create your first run to test your AI agent!
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {run.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        run.status
                      )}`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {run.riskScore !== null ? (
                      <span
                        className={
                          run.riskScore >= 70
                            ? 'text-red-600 font-semibold'
                            : run.riskScore >= 40
                            ? 'text-yellow-600 font-semibold'
                            : 'text-green-600 font-semibold'
                        }
                      >
                        {run.riskScore}/100
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.startedAt
                      ? new Date(run.startedAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.startedAt && run.endedAt
                      ? `${Math.round(
                          (new Date(run.endedAt).getTime() -
                            new Date(run.startedAt).getTime()) /
                            1000
                        )}s`
                      : run.startedAt
                      ? 'Running...'
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </main>
    </div>
  );
}
