'use client';

import { FolderKanban, Play, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  badge?: {
    text: string;
    variant?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  };
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
}

export function MetricCard({ icon, label, value, badge, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
            {badge && (
              <Badge variant={badge.variant || 'info'} className="text-xs">
                {badge.text}
              </Badge>
            )}
          </div>
          {trend && (
            <p className={`text-xs mt-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardMetrics {
  totalProjects: number;
  runsThisWeek: number;
  openFindings: number;
  worstRiskScore: number | null;
}

interface MetricsStripProps {
  metrics: DashboardMetrics;
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  const getRiskScoreBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 80) return { text: 'Critical', variant: 'critical' as const };
    if (score >= 60) return { text: 'High', variant: 'high' as const };
    if (score >= 40) return { text: 'Medium', variant: 'medium' as const };
    return { text: 'Low', variant: 'low' as const };
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={<FolderKanban className="h-6 w-6 text-blue-600" />}
        label="Total Projects"
        value={metrics.totalProjects}
      />
      <MetricCard
        icon={<Play className="h-6 w-6 text-blue-600" />}
        label="Runs This Week"
        value={metrics.runsThisWeek}
      />
      <MetricCard
        icon={<AlertTriangle className="h-6 w-6 text-blue-600" />}
        label="Open Findings"
        value={metrics.openFindings}
        badge={metrics.openFindings > 0 ? { text: 'Action needed', variant: 'high' } : undefined}
      />
      <MetricCard
        icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
        label="Worst Risk Score"
        value={metrics.worstRiskScore ?? '—'}
        badge={metrics.worstRiskScore !== null ? getRiskScoreBadge(metrics.worstRiskScore) ?? undefined : undefined}
      />
    </div>
  );
}
