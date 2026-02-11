'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
  };
  org?: {
    name: string;
  };
  sidebarMode?: 'full' | 'rail' | 'hidden';
}

export function AppShell({ children, user, org, sidebarMode = 'full' }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showSidebar = sidebarMode !== 'hidden';

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      {showSidebar && (
        <Sidebar 
          user={user} 
          org={org}
          mode={sidebarMode === 'rail' ? 'rail' : 'full'}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      )}
      
      <main
        className={
          sidebarMode === 'hidden'
            ? 'w-full'
            : sidebarMode === 'rail'
            ? 'md:ml-14'
            : 'md:ml-60'
        }
      >
        {children}
      </main>
    </div>
  );
}
