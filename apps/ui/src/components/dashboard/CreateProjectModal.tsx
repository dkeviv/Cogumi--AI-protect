'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface CreateProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ onClose, onSuccess }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'staging' | 'prod'>('sandbox');
  const [prodConfirm1, setProdConfirm1] = useState(false);
  const [prodConfirm2, setProdConfirm2] = useState(false);
  const [prodConfirm3, setProdConfirm3] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const allConfirmationsChecked = prodConfirm1 && prodConfirm2 && prodConfirm3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          environment,
          prodOverrideEnabled: environment === 'prod' ? allConfirmationsChecked : false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();
      const projectId = data?.project?.id;
      toast.success('Project created successfully!');
      onSuccess();

      // Golden path: new projects go straight into Setup Wizard
      if (projectId) {
        router.push(`/projects/${projectId}?tab=setup`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-modal)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create New Project</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Define the environment, then connect your sidecar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--border-input)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[var(--transition-base)]"
              placeholder="My AI Agent Project"
            />
          </div>

          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Environment
            </label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="w-full rounded-lg border border-[var(--border-input)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-[var(--transition-base)]"
            >
              <option value="sandbox">Sandbox (recommended)</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>

          {environment === 'prod' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="text-sm font-semibold text-amber-900">Production Override Checklist</div>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                All items are required to enable production testing.
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodConfirm1}
                    onChange={(e) => setProdConfirm1(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900">
                    This is not customer-facing production traffic.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodConfirm2}
                    onChange={(e) => setProdConfirm2(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900">
                    No real customer secrets are stored in this environment.
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodConfirm3}
                    onChange={(e) => setProdConfirm3(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900">
                    I accept that adversarial prompts may trigger unsafe behavior.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || (environment === 'prod' && !allConfirmationsChecked)}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
