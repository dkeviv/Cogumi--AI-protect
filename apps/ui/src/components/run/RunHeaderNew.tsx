'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Download, X, Activity } from 'lucide-react';
import Link from 'next/link';

interface RunHeaderNewProps {
  run: {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled' | 'stopped';
    riskScore: number | null;
    startedAt: string | null;
    endedAt: string | null;
    results?: Array<{
      scriptId: string;
      score: number;
      severity: string;
      status: string;
    }>;
    project: {
      id: string;
      name: string;
      environment: 'sandbox' | 'staging' | 'prod';
      agentTestUrl?: string | null;
      toolDomains?: string[];
      internalSuffixes?: string[];
      redTeamConfig?: {
        enabledStyleIds: string[];
        intensity: string;
        versionPin: string | null;
      } | null;
    };
  };
  onCancel?: () => void;
  onDownloadReport?: () => void;
  onDownloadEvidence?: () => void;
  onCompare?: () => void;
}

export function RunHeaderNew({ run, onCancel, onDownloadReport, onDownloadEvidence, onCompare }: RunHeaderNewProps) {
  const isLive = run.status === 'running';
  const isComplete = run.status === 'completed';
  const isProd = run.project.environment === 'prod';

  // Calculate duration
  const getDuration = () => {
    if (!run.startedAt) return null;
    const start = new Date(run.startedAt);
    const end = run.endedAt ? new Date(run.endedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffHr > 0) return `${diffHr}h ${diffMin % 60}m`;
    if (diffMin > 0) return `${diffMin}m ${diffSec % 60}s`;
    return `${diffSec}s`;
  };

  // Risk score color
  const getRiskScoreColor = () => {
    if (!run.riskScore) return 'text-[var(--text-muted)]';
    if (run.riskScore >= 80) return 'text-[var(--severity-critical)]';
    if (run.riskScore >= 60) return 'text-[var(--severity-high)]';
    if (run.riskScore >= 40) return 'text-[var(--severity-medium)]';
    return 'text-[var(--severity-low)]';
  };

  const duration = getDuration();
  const agentHost = (() => {
    const url = run.project.agentTestUrl;
    if (!url) return null;
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();
  const scripts = (run.results || []).map((r) => r.scriptId).filter(Boolean);
  const stylesCount = run.project.redTeamConfig?.enabledStyleIds?.length ?? 0;
  const intensity = run.project.redTeamConfig?.intensity ?? null;
  const versionPin = run.project.redTeamConfig?.versionPin ?? null;
  const toolDomainsCount = run.project.toolDomains?.length ?? 0;
  const internalSuffixesCount = run.project.internalSuffixes?.length ?? 0;

  return (
    <div className="border-b border-[var(--border-default)] bg-white">
      {/* Production warning banner */}
      {isProd && (
        <div className="bg-[var(--severity-critical)] text-white px-6 py-2 text-sm font-medium">
          ⚠️ Production environment — override enabled
        </div>
      )}

      {/* Live indicator */}
      {isLive && (
        <div className="bg-[var(--status-running)] text-white px-6 py-2 text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 animate-pulse" />
          Live run in progress
        </div>
      )}

      {/* Main header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back link */}
          <Link
            href={`/projects/${run.project.id}`}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-[var(--transition-base)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Run info */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              Run #{run.id.slice(0, 8)}
            </h1>
            <Badge variant={run.status as any}>{run.status}</Badge>
            <Badge variant={run.project.environment as any}>
              {run.project.environment}
            </Badge>
          </div>

          {/* Start time */}
          {run.startedAt && (
            <span className="text-sm text-[var(--text-muted)]">
              {new Date(run.startedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Right side: metrics & actions */}
        <div className="flex items-center gap-6">
          {/* Risk score */}
          {run.riskScore !== null && (
            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Risk Score
              </div>
              <div className={`text-2xl font-bold ${getRiskScoreColor()}`}>
                {run.riskScore}
              </div>
            </div>
          )}

          {/* Duration */}
          {duration && (
            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Duration
              </div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {duration}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onCompare && (
              <Button variant="ghost" onClick={onCompare}>
                Compare
              </Button>
            )}
            {isLive && onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                <X className="h-4 w-4 mr-1.5" />
                Cancel Run
              </Button>
            )}
            {isComplete && onDownloadReport && (
              <Button variant="primary" onClick={onDownloadReport}>
                <Download className="h-4 w-4 mr-1.5" />
                Download Report
              </Button>
            )}
            {isComplete && onDownloadEvidence && (
              <Button variant="secondary" onClick={onDownloadEvidence}>
                Evidence JSON
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TLS disclaimer footer */}
      <div className="px-6 py-2 bg-[var(--surface-bg)] border-t border-[var(--border-default)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--text-muted)]">
            Pre-deployment testing tool · TLS metadata captured, payloads not decrypted
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {agentHost ? (
              <>Target: <span className="font-mono text-[var(--text-secondary)]">{agentHost}</span></>
            ) : (
              <>Target: <span className="text-[var(--text-secondary)]">not configured</span></>
            )}
            {' · '}
            {scripts.length > 0 ? (
              <>Scripts: <span className="font-mono text-[var(--text-secondary)]">{scripts.join(', ')}</span></>
            ) : (
              <>Scripts: <span className="text-[var(--text-secondary)]">unknown</span></>
            )}
            {' · '}
            <span className="text-[var(--text-secondary)]">
              Styles: {stylesCount}{intensity ? ` @ ${intensity}` : ''}
              {versionPin ? ` (${versionPin})` : ''}
            </span>
            {' · '}
            <span className="text-[var(--text-secondary)]">
              Scope: {toolDomainsCount} tool domain{toolDomainsCount === 1 ? '' : 's'},{' '}
              {internalSuffixesCount} internal suffix{internalSuffixesCount === 1 ? '' : 'es'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
