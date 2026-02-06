'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface QuickActionsProps {
  projectId: string;
  agentTestUrl?: string | null;
}

export function QuickActions({ projectId, agentTestUrl }: QuickActionsProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreateRun() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign' }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to create run');
        return;
      }

      const data = await res.json();
      const execRes = await fetch(`/api/runs/${data.run.id}/execute`, {
        method: 'POST',
      });

      if (!execRes.ok) {
        alert('Run created but failed to start execution');
      }

      router.push(`/runs/${data.run.id}`);
    } catch (error) {
      console.error('Failed to create run:', error);
      alert('Failed to create run');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--app-shadow-card)]">
      <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
      <p className="text-xs text-slate-500">Launch a run or finish setup</p>

      <div className="mt-4 grid gap-2">
        <Link
          href={`/projects/${projectId}/connect`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          Open Connect Wizard
        </Link>
        <button
          onClick={handleCreateRun}
          disabled={creating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? 'Starting run...' : 'Start New Run'}
        </button>
        <Link
          href={`/projects/${projectId}/settings`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          Project Settings
        </Link>
      </div>

      {!agentTestUrl && (
        <p className="mt-3 text-xs text-amber-700">
          Agent test endpoint not configured yet.
        </p>
      )}
    </div>
  );
}
