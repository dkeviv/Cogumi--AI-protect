'use client';

import { Run } from '@cogumi/shared';
import { useState } from 'react';

interface RunHeaderProps {
  run: Run;
}

const STATUS_COLORS = {
  queued: 'bg-amber-100 text-amber-800 border-amber-200',
  running: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  canceled: 'bg-slate-100 text-slate-700 border-slate-200',
  stopped_quota: 'bg-orange-100 text-orange-800 border-orange-200',
};

const ENVIRONMENT_COLORS = {
  prod: 'bg-red-100 text-red-900 border-red-200',
  staging: 'bg-amber-100 text-amber-900 border-amber-200',
  sandbox: 'bg-blue-100 text-blue-900 border-blue-200',
};

function getRiskScoreColor(score: number | null): string {
  if (!score) return 'text-slate-400';
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-green-600';
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '--';
  if (!end) return 'Running...';
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/**
 * RunHeader - Top bar of run page
 * Shows status, risk score, environment, timestamps, and download report button
 */
export function RunHeader({ run }: RunHeaderProps) {
  const [downloading, setDownloading] = useState(false);
  
  const statusColor = STATUS_COLORS[run.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.running;

  const environment = (run as any).project?.environment || 'sandbox';
  const envColor = ENVIRONMENT_COLORS[environment as keyof typeof ENVIRONMENT_COLORS] || ENVIRONMENT_COLORS.sandbox;

  const canDownloadReport = ['completed', 'failed', 'stopped_quota'].includes(run.status);

  const handleDownloadReport = async () => {
    if (!canDownloadReport || downloading) return;
    
    setDownloading(true);
    try {
      // First, generate the report
      const generateRes = await fetch(`/api/runs/${run.id}/report`, {
        method: 'POST',
      });

      if (!generateRes.ok) {
        const error = await generateRes.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      const { markdown } = await generateRes.json();

      // Create a blob and download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cogumi-report-${run.id.split('-').pop()}-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert(`Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white/80 backdrop-blur px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Run ID and status */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Run {run.id.split('-').pop()}
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              {run.startedAt ? new Date(run.startedAt).toLocaleString() : '--'}
            </div>
          </div>

          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColor}`}
          >
            {run.status.toUpperCase()}
          </span>

          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${envColor}`}
          >
            {environment.toUpperCase()}
          </span>
        </div>

        {/* Right: Risk score, duration, and download button */}
        <div className="flex items-center gap-6">
          {/* Risk score */}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Risk Score</div>
            <div
              className={`text-2xl font-semibold ${getRiskScoreColor(run.riskScore ?? null)}`}
            >
              {run.riskScore ?? '--'}
            </div>
          </div>

          {/* Duration */}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Duration</div>
            <div className="text-base font-semibold text-slate-900">
              {formatDuration(run.startedAt ?? null, run.endedAt ?? null)}
            </div>
          </div>

          {/* Download Report Button */}
          {canDownloadReport && (
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                downloading
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {downloading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
