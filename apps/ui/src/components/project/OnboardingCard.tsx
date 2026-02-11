'use client';

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  warning?: boolean;
}

interface OnboardingCardProps {
  projectId: string;
  steps: OnboardingStep[];
  allComplete: boolean;
}

export function OnboardingCard({ projectId, steps, allComplete }: OnboardingCardProps) {
  if (allComplete) {
    return null; // Don't show the card if setup is complete
  }

  const completedCount = steps.filter(s => s.completed).length;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-900">
              Complete Setup
            </h3>
            <p className="mt-1 text-xs text-amber-700">
              {completedCount} of {steps.length} steps complete
            </p>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
              <div
                className="h-full rounded-full bg-amber-600 transition-all duration-300"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>

            {/* Steps checklist */}
            <div className="mt-4 space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2 text-xs text-amber-900"
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  ) : step.warning ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  )}
                  <span className={step.completed ? 'line-through opacity-60' : ''}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Link href={`/projects/${projectId}?tab=setup`}>
                <Button variant="secondary" size="sm">
                  Continue Setup
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
