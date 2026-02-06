interface ConnectStatusCardProps {
  tokenCount: number;
  lastSeenAt?: string | null;
  agentTestUrl?: string | null;
}

export function ConnectStatusCard({
  tokenCount,
  lastSeenAt,
  agentTestUrl,
}: ConnectStatusCardProps) {
  const connected = !!lastSeenAt;
  const statusText = connected ? 'Sidecar connected' : 'Sidecar not connected';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--app-shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Connect Status</h3>
          <p className="text-xs text-slate-500">Sidecar + agent endpoint readiness</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {connected ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>{statusText}</span>
          <span className="text-xs text-slate-500">
            {lastSeenAt ? new Date(lastSeenAt).toLocaleString() : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Active tokens</span>
          <span className="text-xs font-semibold text-slate-700">{tokenCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Agent test endpoint</span>
          <span className="text-xs text-slate-500">
            {agentTestUrl ? 'Configured' : 'Missing'}
          </span>
        </div>
      </div>
    </div>
  );
}
