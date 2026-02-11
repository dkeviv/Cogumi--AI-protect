'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, Play, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface ProjectActionsProps {
  projectId: string;
  setupComplete: boolean;
}

export function ProjectActions({ projectId, setupComplete }: ProjectActionsProps) {
  const [isStartingRun, setIsStartingRun] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleStartRun() {
    try {
      setIsStartingRun(true);
      const response = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign' }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Failed to start run');
      }
      
      const data = await response.json();
      toast.success('Run started successfully!');
      
      // Navigate to run page
      router.push(`/runs/${data.run.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start run');
      setIsStartingRun(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {setupComplete ? (
        <Button variant="primary" onClick={handleStartRun} disabled={isStartingRun}>
          {isStartingRun ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Start Run
            </>
          )}
        </Button>
      ) : (
        <Link href={`/projects/${projectId}?tab=setup`}>
          <Button variant="primary">
            Continue Setup
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>
      )}

      <Link href={`/projects/${projectId}/settings`}>
        <Button variant="ghost">
          <Settings className="h-5 w-5 mr-2" />
          Settings
        </Button>
      </Link>
    </div>
  );
}
