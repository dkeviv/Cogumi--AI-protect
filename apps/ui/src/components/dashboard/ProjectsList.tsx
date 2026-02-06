'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
};

export function ProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  const getEnvironmentBadge = (env: string) => {
    const badges = {
      sandbox: 'bg-blue-100 text-blue-800',
      staging: 'bg-yellow-100 text-yellow-800',
      prod: 'bg-red-100 text-red-800',
    };
    return badges[env as keyof typeof badges] || badges.sandbox;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 mb-4"></div>
          <div className="h-4 w-32 rounded bg-slate-100"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchProjects}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create your first project
            </h3>
            <p className="text-slate-600 mb-6">
              Set up a project to start red teaming your AI agents. Connect your sidecar proxy and run automated security tests.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </div>

        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchProjects();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 truncate flex-1">
                {project.name}
              </h3>
              <span
                className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${getEnvironmentBadge(
                  project.environment
                )}`}
              >
                {project.environment}
              </span>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>{project._count.runs} runs</p>
              <p className="text-xs text-slate-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchProjects();
          }}
        />
      )}
    </>
  );
}

// Create Project Modal Component
function CreateProjectModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'staging' | 'prod'>('sandbox');
  const [prodConfirm1, setProdConfirm1] = useState(false); // Not customer-facing
  const [prodConfirm2, setProdConfirm2] = useState(false); // No real secrets
  const [prodConfirm3, setProdConfirm3] = useState(false); // Accept unsafe behavior
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All 3 confirmations must be checked to enable prod override
  const allConfirmationsChecked = prodConfirm1 && prodConfirm2 && prodConfirm3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Create New Project</h2>
        <p className="text-sm text-slate-500 mb-4">Define the environment, then connect your sidecar.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My AI Agent Project"
            />
          </div>

          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sandbox">Sandbox (recommended)</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>

          {environment === 'prod' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900 mb-1">Production Override Checklist</div>
              <p className="text-xs text-amber-700 mb-3">
                All items are required to enable production testing.
              </p>
              <div className="space-y-2 text-sm text-amber-900">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={prodConfirm1}
                    onChange={(e) => setProdConfirm1(e.target.checked)}
                    className="mt-1 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  This is not customer-facing production traffic.
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={prodConfirm2}
                    onChange={(e) => setProdConfirm2(e.target.checked)}
                    className="mt-1 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  No real customer secrets are stored in this environment.
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={prodConfirm3}
                    onChange={(e) => setProdConfirm3(e.target.checked)}
                    className="mt-1 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  I accept that adversarial prompts may trigger unsafe behavior.
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (environment === 'prod' && !allConfirmationsChecked)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
