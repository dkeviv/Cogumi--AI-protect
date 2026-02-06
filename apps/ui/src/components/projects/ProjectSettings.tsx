'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Project = {
  id: string;
  name: string;
  environment: string;
  agentTestUrl: string | null;
  toolDomains: string[];
  internalSuffixes: string[];
  retentionDays: number;
  prodOverrideEnabled: boolean;
};

export function ProjectSettings({ project }: { project: Project }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: project.name,
    agentTestUrl: project.agentTestUrl || '',
    toolDomains: project.toolDomains.join(', '),
    internalSuffixes: project.internalSuffixes.join(', '),
    retentionDays: project.retentionDays,
    environment: project.environment,
    prodOverrideEnabled: project.prodOverrideEnabled,
  });

  // Production override confirmations
  const [prodConfirm1, setProdConfirm1] = useState(project.prodOverrideEnabled);
  const [prodConfirm2, setProdConfirm2] = useState(project.prodOverrideEnabled);
  const [prodConfirm3, setProdConfirm3] = useState(project.prodOverrideEnabled);
  const allConfirmationsChecked = prodConfirm1 && prodConfirm2 && prodConfirm3;

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Agent validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    reachable: boolean;
    status?: number;
    error?: string;
    errorType?: string;
  } | null>(null);

  async function validateAgent() {
    if (!formData.agentTestUrl) {
      alert('Please enter an agent test URL first');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/validate-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentTestUrl: formData.agentTestUrl,
        }),
      });

      const data = await response.json();
      setValidationResult(data);
    } catch (err) {
      setValidationResult({
        success: false,
        reachable: false,
        error: 'Failed to validate endpoint',
      });
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // Parse arrays from comma-separated strings
      const toolDomains = formData.toolDomains
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const internalSuffixes = formData.internalSuffixes
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          agentTestUrl: formData.agentTestUrl || null,
          toolDomains,
          internalSuffixes,
          retentionDays: formData.retentionDays,
          environment: formData.environment,
          prodOverrideEnabled: formData.environment === 'prod' ? allConfirmationsChecked : false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  const getValidationStatusColor = () => {
    if (!validationResult) return '';
    if (validationResult.success && validationResult.reachable) return 'text-green-600';
    return 'text-red-600';
  };

  const getValidationStatusIcon = () => {
    if (isValidating) {
      return (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      );
    }
    if (!validationResult) return null;
    if (validationResult.success && validationResult.reachable) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">Settings saved successfully.</p>
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{saveError}</p>
        </div>
      )}

      {/* Basic Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Basic Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="environment" className="block text-sm font-medium text-slate-700 mb-1">
              Environment
            </label>
            <select
              id="environment"
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sandbox">Sandbox</option>
              <option value="staging">Staging</option>
              <option value="prod">Production</option>
            </select>
          </div>

          {formData.environment === 'prod' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-bold text-red-800 mb-2">
                    DANGER: Production Environment Testing
                  </h4>
                  <p className="text-sm text-red-700 mb-4">
                    You must confirm all safety requirements to enable production testing.
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={prodConfirm1}
                        onChange={(e) => setProdConfirm1(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-3 text-sm text-red-900">
                        <strong>This is NOT customer-facing production traffic.</strong>
                      </span>
                    </label>

                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={prodConfirm2}
                        onChange={(e) => setProdConfirm2(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-3 text-sm text-red-900">
                        <strong>No real customer secrets or sensitive data exist here.</strong>
                      </span>
                    </label>

                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={prodConfirm3}
                        onChange={(e) => setProdConfirm3(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-3 text-sm text-red-900">
                        <strong>I accept that adversarial prompts MAY trigger unsafe agent behavior.</strong>
                      </span>
                    </label>
                  </div>

                  {!allConfirmationsChecked && (
                    <p className="mt-3 text-xs text-red-600 font-semibold">
                      All three confirmations are required
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="retentionDays" className="block text-sm font-medium text-slate-700 mb-1">
              Data Retention (days)
            </label>
            <input
              type="number"
              id="retentionDays"
              min="1"
              max="365"
              value={formData.retentionDays}
              onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">
              How long to keep test runs and events (1-365 days)
            </p>
          </div>
        </div>
      </div>

      {/* Agent Endpoint */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Agent Endpoint</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="agentTestUrl" className="block text-sm font-medium text-slate-700 mb-1">
              Test Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="agentTestUrl"
                value={formData.agentTestUrl}
                onChange={(e) => setFormData({ ...formData, agentTestUrl: e.target.value })}
                placeholder="http://localhost:3000/api/chat"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={validateAgent}
                disabled={isValidating || !formData.agentTestUrl}
                className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidating ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              The URL where your AI agent receives messages for testing
            </p>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`rounded-lg border p-4 ${
              validationResult.success && validationResult.reachable
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                {getValidationStatusIcon()}
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${getValidationStatusColor()}`}>
                    {validationResult.success && validationResult.reachable
                      ? `Connection successful! (HTTP ${validationResult.status})`
                      : 'Connection failed'}
                  </p>
                  {validationResult.error && (
                    <p className="text-sm text-red-700 mt-1">{validationResult.error}</p>
                  )}
                  {validationResult.errorType === 'timeout' && (
                    <p className="text-sm text-red-700 mt-1">
                      Make sure your agent is running and accessible from this server.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-card)]">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Security Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="toolDomains" className="block text-sm font-medium text-slate-700 mb-1">
              Allowed Tool Domains
            </label>
            <input
              type="text"
              id="toolDomains"
              value={formData.toolDomains}
              onChange={(e) => setFormData({ ...formData, toolDomains: e.target.value })}
              placeholder="api.openai.com, api.anthropic.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">
              Comma-separated list of domains your agent is allowed to call
            </p>
          </div>

          <div>
            <label htmlFor="internalSuffixes" className="block text-sm font-medium text-slate-700 mb-1">
              Internal Domain Suffixes
            </label>
            <input
              type="text"
              id="internalSuffixes"
              value={formData.internalSuffixes}
              onChange={(e) => setFormData({ ...formData, internalSuffixes: e.target.value })}
              placeholder=".internal, .local, .corp"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-slate-500 mt-1">
              Comma-separated list of internal domain suffixes to flag privilege escalation attempts
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 text-sm text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
