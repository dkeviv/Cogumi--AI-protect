'use client';

import { FolderKanban, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ProjectHeaderProps {
  name: string;
  environment: 'sandbox' | 'staging' | 'prod';
  lastSeenAt: string | null;
  totalRuns: number;
}

export function ProjectHeader({ name, environment, lastSeenAt, totalRuns }: ProjectHeaderProps) {
  const getLastSeenText = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0">
          <FolderKanban className="h-7 w-7 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {name}
            </h1>
            <Badge 
              variant={
                environment === 'sandbox' 
                  ? 'sandbox' 
                  : environment === 'staging' 
                  ? 'staging' 
                  : 'production'
              }
            >
              {environment}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Last seen: {getLastSeenText(lastSeenAt)}
            </span>
            <span>•</span>
            <span>{totalRuns} {totalRuns === 1 ? 'run' : 'runs'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
