import { ReactNode } from 'react';

interface ProjectHeaderProps {
  name: string;
  environment: string;
  lastSeenAt?: string | null;
  rightSlot?: ReactNode;
}

const ENV_STYLES: Record<string, string> = {
  sandbox: 'bg-blue-100 text-blue-700',
  staging: 'bg-amber-100 text-amber-700',
  prod: 'bg-red-100 text-red-700',
};

export function ProjectHeader({ name, environment, lastSeenAt, rightSlot }: ProjectHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-900">{name}</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ENV_STYLES[environment] || ENV_STYLES.sandbox}`}>
            {environment.toUpperCase()}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {lastSeenAt
            ? `Last sidecar heartbeat: ${new Date(lastSeenAt).toLocaleString()}`
            : 'No sidecar heartbeat yet'}
        </p>
      </div>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </div>
  );
}
