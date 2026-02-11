'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  FolderKanban,
  Play,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  user?: {
    name: string;
    email: string;
  };
  org?: {
    name: string;
  };
  mode?: 'full' | 'rail';
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderKanban,
  },
  {
    name: 'Runs',
    href: '/runs',
    icon: Play,
  },
];

export function Sidebar({ user, org, mode = 'full', mobileMenuOpen = false, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const isRail = mode === 'rail';
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string; environment: string; setupComplete?: boolean; criticalHighCount?: number }>>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const closeMobileMenu = () => {
    if (setMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    if (isRail) return;
    if (!projectsOpen) return;
    if (projects.length > 0) return;

    let cancelled = false;
    async function load() {
      try {
        setProjectsLoading(true);
        const res = await fetch('/api/projects');
        if (!res.ok) return;
        const data = await res.json();
        const rows = (data.projects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          environment: p.environment,
          setupComplete: p.setupComplete,
          criticalHighCount: p.criticalHighCount ?? 0,
        }));
        if (!cancelled) setProjects(rows);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isRail, projectsOpen, projects.length]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  return (
    <>
      {/* Mobile menu button - fixed top-left */}
      <button
        onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] flex flex-col transition-transform duration-300',
        isRail ? 'w-14' : 'w-60',
        'md:translate-x-0', // Always visible on desktop
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full' // Slide in/out on mobile
      )}>
        {/* Logo */}
        <div className={cn('h-16 flex items-center border-b border-slate-800', isRail ? 'px-3 justify-center' : 'px-6')}>
          <Link href="/dashboard" className="flex items-center" onClick={closeMobileMenu} title="Dashboard">
            {isRail ? (
              <span className="h-9 w-9 rounded-lg bg-gradient-to-r from-blue-400 to-rose-400 flex items-center justify-center text-slate-950 font-black">
                C
              </span>
            ) : (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-rose-400 bg-clip-text text-transparent">
                Cogumi
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 py-4 space-y-1 overflow-y-auto', isRail ? 'px-2' : 'px-3')}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                title={item.name}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                  isRail ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                  active
                    ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]'
                    : 'text-[var(--sidebar-text)] hover:bg-slate-800/50'
                )}
              >
                <Icon size={20} />
                {!isRail && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Project switcher (PM-tool style). Only in full mode. */}
          {!isRail && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setProjectsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide text-slate-300 hover:bg-slate-800/50 transition-all duration-150"
                aria-expanded={projectsOpen}
              >
                <span className="flex items-center gap-2">
                  <FolderKanban size={14} />
                  Project Switcher
                </span>
                <ChevronDown size={16} className={cn('transition-transform', projectsOpen && 'rotate-180')} />
              </button>

              {projectsOpen && (
                <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
                  <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5">
                    <Search size={14} className="text-slate-400" />
                    <input
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects"
                      className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                      aria-label="Search projects"
                    />
                  </div>

                  <div className="mt-2 max-h-56 overflow-y-auto">
                    {projectsLoading && (
                      <div className="px-2 py-2 text-xs text-slate-400">Loading…</div>
                    )}
                    {!projectsLoading && filteredProjects.length === 0 && (
                      <div className="px-2 py-2 text-xs text-slate-400">No projects found</div>
                    )}

                    {filteredProjects.map((p) => {
                      const active = pathname.startsWith(`/projects/${p.id}`);
                      const needsSetup = p.setupComplete === false;
                      const hasCritical = (p.criticalHighCount ?? 0) > 0;
                      return (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}`}
                          onClick={closeMobileMenu}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs transition-all duration-150',
                            active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          )}
                          title={p.name}
                        >
                          <span className="min-w-0 truncate">
                            {p.name}
                          </span>
                          <span className="flex items-center gap-1.5 flex-shrink-0">
                            {hasCritical && <span className="h-2 w-2 rounded-full bg-red-400" title="Critical/high findings" />}
                            {needsSetup && <span className="h-2 w-2 rounded-full bg-amber-400" title="Setup incomplete" />}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User section */}
        <div className={cn('border-t border-slate-800', isRail ? 'p-2' : 'p-4')}>
          {!isRail && user && (
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user.name || user.email}</div>
                  {org && <div className="text-xs text-slate-400 truncate">{org.name}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Bottom actions: Settings + Sign out in a single row */}
          {isRail ? (
            <div className="flex items-center justify-center gap-2">
              <Link
                href="/settings"
                onClick={closeMobileMenu}
                title="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-all duration-150 hover:bg-slate-800/50 hover:text-white"
              >
                <Settings size={16} />
              </Link>
              <button
                onClick={() => {
                  closeMobileMenu();
                  window.location.href = '/api/auth/signout';
                }}
                title="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-all duration-150 hover:bg-slate-800/50 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/settings"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-150"
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={() => {
                  closeMobileMenu();
                  window.location.href = '/api/auth/signout';
                }}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-150"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
