'use client';

import Link from 'next/link';
import { FolderKanban, Play, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type Project = {
  id: string;
  name: string;
  environment: 'sandbox' | 'staging' | 'prod';
  agentTestUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    runs: number;
  };
  // Optional fields for richer display
  setupComplete?: boolean;
  criticalHighCount?: number;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
  lastRunRiskScore?: number | null;
  openFindingsCount?: number;
  worstRiskScore?: number | null;
};

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isSetupComplete = project.setupComplete ?? !!project.agentTestUrl;
  const criticalHigh = project.criticalHighCount ?? 0;
  
  return (
    <Link href={`/projects/${project.id}`}>
      <Card hover className="h-full transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                {project.name}
              </h3>
            </div>
          </div>
          <Badge 
            variant={
              project.environment === 'sandbox' 
                ? 'sandbox' 
                : project.environment === 'staging' 
                ? 'staging' 
                : 'production'
            }
            className="ml-2 flex-shrink-0"
          >
            {project.environment}
          </Badge>
        </div>

        {!isSetupComplete && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-900">Setup incomplete</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Play className="h-4 w-4" />
            <span>{project._count.runs} {project._count.runs === 1 ? 'run' : 'runs'}</span>
          </div>

          {criticalHigh > 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--severity-critical)]">
              <AlertCircle className="h-4 w-4" />
              <span>{criticalHigh} critical/high</span>
            </div>
          )}

          {project.openFindingsCount !== undefined && project.openFindingsCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-[var(--severity-high)]">
              <AlertCircle className="h-4 w-4" />
              <span>{project.openFindingsCount} open findings</span>
            </div>
          )}

          {project.lastRunAt && (
            <div className="text-xs text-[var(--text-muted)]">
              Last run {new Date(project.lastRunAt).toLocaleDateString()}
              {project.lastRunStatus ? ` • ${project.lastRunStatus}` : ''}
            </div>
          )}

          {!project.lastRunAt && (
            <div className="text-xs text-[var(--text-muted)]">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {project.worstRiskScore !== null && project.worstRiskScore !== undefined && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Worst Risk Score</span>
              <Badge 
                variant={
                  project.worstRiskScore >= 80 ? 'critical' :
                  project.worstRiskScore >= 60 ? 'high' :
                  project.worstRiskScore >= 40 ? 'medium' :
                  'low'
                }
              >
                {project.worstRiskScore}
              </Badge>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
