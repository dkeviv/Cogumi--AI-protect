'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  badge?: ReactNode;
  rightSlot?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  badge,
  rightSlot,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <span className="text-lg leading-none">←</span>
              {backLabel}
            </Link>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
      </div>
    </header>
  );
}
