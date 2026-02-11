'use client';

import { Server, CheckCircle2, XCircle, Link as LinkIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ConnectStatusCardProps {
  tokenCount: number;
  lastSeenAt: string | null;
  agentTestUrl: string | null;
}

export function ConnectStatusCardNew({ 
  tokenCount, 
  lastSeenAt, 
  agentTestUrl
}: ConnectStatusCardProps) {
  const isSidecarConnected = Boolean(lastSeenAt);
  const hasEndpoint = Boolean(agentTestUrl);

  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 5) return `${minutes}m ago`;
    if (minutes < 60) return `${minutes}m ago (stale)`;
    return 'Offline';
  };

  const lastSeenText = getLastSeenText(lastSeenAt);
  const isStale = lastSeenText.includes('stale') || lastSeenText === 'Offline';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connection Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sidecar Status */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] p-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
            isSidecarConnected && !isStale 
              ? 'bg-green-100' 
              : 'bg-gray-100'
          }`}>
            <Server className={`h-5 w-5 ${
              isSidecarConnected && !isStale 
                ? 'text-green-600' 
                : 'text-gray-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Sidecar Proxy
              </span>
              {isSidecarConnected && !isStale ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {tokenCount === 0 && 'No tokens created'}
              {tokenCount > 0 && (
                <>
                  {tokenCount} active {tokenCount === 1 ? 'token' : 'tokens'} • Last seen: {lastSeenText}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Agent Endpoint Status */}
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] p-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
            hasEndpoint 
              ? 'bg-green-100' 
              : 'bg-gray-100'
          }`}>
            <LinkIcon className={`h-5 w-5 ${
              hasEndpoint 
                ? 'text-green-600' 
                : 'text-gray-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Agent Endpoint
              </span>
              {hasEndpoint ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)] truncate">
              {hasEndpoint ? agentTestUrl : 'Not configured'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
