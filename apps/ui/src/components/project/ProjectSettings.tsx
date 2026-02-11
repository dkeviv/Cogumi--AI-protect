'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface Project {
  id: string;
  name: string;
  environment: 'sandbox' | 'staging' | 'prod';
  agentTestUrl: string | null;
  toolDomains: string[];
  internalSuffixes: string[];
  retentionDays: number;
  prodOverrideEnabled: boolean;
  _count?: {
    runs: number;
    tokens: number;
  };
}

interface Token {
  id: string;
  status: 'active' | 'revoked';
  lastSeenAt: Date | null;
  createdAt: Date;
}

interface FormData {
  name: string;
  retentionDays: number;
  toolDomains: string;
  internalSuffixes: string;
  environment: 'sandbox' | 'staging' | 'prod';
  prodOverride1: boolean;
  prodOverride2: boolean;
  prodOverride3: boolean;
}

export function ProjectSettings({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    retentionDays: 30,
    toolDomains: '',
    internalSuffixes: '',
    environment: 'sandbox',
    prodOverride1: false,
    prodOverride2: false,
    prodOverride3: false,
  });

  useEffect(() => {
    loadProject();
    loadTokens();
  }, [projectId]);

  async function loadProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setFormData({
          name: data.project.name,
          retentionDays: data.project.retentionDays,
          toolDomains: (data.project.toolDomains || []).join(', '),
          internalSuffixes: (data.project.internalSuffixes || []).join(', '),
          environment: data.project.environment,
          prodOverride1: false,
          prodOverride2: false,
          prodOverride3: false,
        });
      }
    } catch (error) {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function loadTokens() {
    try {
      const res = await fetch(`/api/projects/${projectId}/tokens`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  async function handleSaveGeneral() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          retentionDays: formData.retentionDays,
        }),
      });

      if (res.ok) {
        toast.success('General settings saved');
        await loadProject();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeToken(tokenId: string) {
    if (!confirm('Are you sure you want to revoke this token? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Token revoked');
        await loadTokens();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to revoke token');
      }
    } catch (error) {
      toast.error('Failed to revoke token');
    }
  }

  async function handleSaveSecurity() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolDomains: formData.toolDomains
            .split(',')
            .map(d => d.trim())
            .filter(d => d),
          internalSuffixes: formData.internalSuffixes
            .split(',')
            .map(s => s.trim())
            .filter(s => s),
        }),
      });

      if (res.ok) {
        toast.success('Security configuration saved');
        await loadProject();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEnvironment() {
    // Validate prod override if changing to production
    if (
      formData.environment === 'prod' &&
      project?.environment !== 'prod' &&
      (!formData.prodOverride1 || !formData.prodOverride2 || !formData.prodOverride3)
    ) {
      toast.error('You must check all three confirmations to enable production mode');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: formData.environment,
          prodOverrideEnabled: formData.environment === 'prod',
        }),
      });

      if (res.ok) {
        toast.success('Environment settings saved');
        await loadProject();
        // Reset checkboxes after save
        setFormData(prev => ({
          ...prev,
          prodOverride1: false,
          prodOverride2: false,
          prodOverride3: false,
        }));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !project) {
    const content = (
      <div className="flex items-center justify-center min-h-[420px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-from)]" />
      </div>
    );
    return embedded ? content : <AppShell>{content}</AppShell>;
  }

  const isProdOverrideValid =
    formData.environment !== 'prod' ||
    project.environment === 'prod' ||
    (formData.prodOverride1 && formData.prodOverride2 && formData.prodOverride3);

  const body = (
    <div className={embedded ? '' : 'mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8'}>
      {!embedded && (
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: project.name, href: `/projects/${projectId}` },
            { label: 'Settings' },
          ]}
        />
      )}

      {!embedded && (
        <div className="mt-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Project Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Configure your project parameters
          </p>
        </div>
      )}

      <div className={embedded ? 'space-y-8' : 'mt-8 space-y-8'}>
          {/* General Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">General</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Basic project information and data retention
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.retentionDays}
                  onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent"
                  aria-label="Data retention in days"
                />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Run data will be deleted after this many days (1-365)
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save General Settings
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Connection Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Connection</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Managed through the Setup Wizard (single source of truth)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Setup Wizard is the source of truth
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Tokens, sidecar deployment, heartbeat verification, and agent endpoint configuration live
                      in the Setup Wizard to avoid duplicated flows.
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--text-muted)]">Agent endpoint</span>
                        <span className="truncate text-right">
                          {project.agentTestUrl ? project.agentTestUrl : 'Not configured'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--text-muted)]">Active tokens</span>
                        <span className="text-right">
                          {tokens.filter((t) => t.status === 'active').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Link href={`/projects/${projectId}/setup`}>
                      <Button variant="primary" size="sm">Open Setup Wizard</Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sidecar Tokens (view + revoke only) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Sidecar Tokens
                  </label>
                  <Link href={`/projects/${projectId}/setup?step=token`}>
                    <Button size="sm" variant="secondary">
                      Generate in Setup
                    </Button>
                  </Link>
                </div>
                {tokens.length === 0 ? (
                  <div className="text-center py-8 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md">
                    <p className="text-sm text-[var(--text-secondary)]">No tokens yet</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Generate a token in the Setup Wizard to connect your sidecar
                    </p>
                  </div>
                ) : (
                  <div className="border border-[var(--border-default)] rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--surface-raised)]">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                            Token ID
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                            Last Seen
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]">
                            Created
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-[var(--text-secondary)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]">
                        {tokens.map((token) => (
                          <tr key={token.id}>
                            <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                              {token.id.substring(0, 8)}...
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={token.status === 'active' ? 'completed' : 'default'}>
                                {token.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">
                              {token.lastSeenAt
                                ? new Date(token.lastSeenAt).toLocaleString()
                                : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">
                              {new Date(token.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {token.status === 'active' && (
                                <button
                                  onClick={() => handleRevokeToken(token.id)}
                                  className="text-[var(--severity-critical-text)] hover:text-[var(--severity-critical-text)]/80 text-sm"
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Configuration Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Security Configuration
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Configure allowed domains and internal suffixes
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Allowed Tool Domains
                </label>
                <input
                  type="text"
                  value={formData.toolDomains}
                  onChange={(e) => setFormData({ ...formData, toolDomains: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent font-mono text-sm"
                  placeholder="github.com, api.openai.com, claude.ai"
                />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Comma-separated list of domains the agent is allowed to access
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Internal Domain Suffixes
                </label>
                <input
                  type="text"
                  value={formData.internalSuffixes}
                  onChange={(e) => setFormData({ ...formData, internalSuffixes: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent font-mono text-sm"
                  placeholder=".internal, .corp, .local"
                />
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Domains considered internal (comma-separated)
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSecurity} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Security Configuration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Environment & Safety (Danger Zone) */}
          <Card className="border-[var(--severity-critical-border)]">
            <CardHeader className="bg-[var(--severity-critical-bg)]/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[var(--severity-critical-text)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Environment & Safety
                </h2>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Configure test environment and production override
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Environment
                </label>
                <div className="flex gap-3">
                  {(['sandbox', 'staging', 'prod'] as const).map((env) => (
                    <label key={env} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="environment"
                        value={env}
                        checked={formData.environment === env}
                        onChange={(e) =>
                          setFormData({ ...formData, environment: e.target.value as typeof env })
                        }
                        className="w-4 h-4 text-[var(--brand-from)] focus:ring-2 focus:ring-[var(--brand-from)]"
                        aria-label={`Select ${env} environment`}
                      />
                      <Badge variant={env === 'prod' ? 'production' : env === 'staging' ? 'staging' : 'sandbox'}>
                        {env}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              {/* Production Override Checklist */}
              {formData.environment === 'prod' && project.environment !== 'prod' && (
                <div className="p-4 bg-[var(--severity-critical-bg)] border border-[var(--severity-critical-border)] rounded-md space-y-3">
                  <p className="text-sm font-medium text-[var(--severity-critical-text)]">
                    ⚠️ Production Mode Confirmation Required
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    You must confirm all three statements before enabling production mode:
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prodOverride1}
                        onChange={(e) =>
                          setFormData({ ...formData, prodOverride1: e.target.checked })
                        }
                        className="mt-0.5 w-4 h-4 text-[var(--brand-from)] focus:ring-2 focus:ring-[var(--brand-from)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        This is not customer-facing production traffic
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prodOverride2}
                        onChange={(e) =>
                          setFormData({ ...formData, prodOverride2: e.target.checked })
                        }
                        className="mt-0.5 w-4 h-4 text-[var(--brand-from)] focus:ring-2 focus:ring-[var(--brand-from)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        No real customer secrets exist in this environment
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.prodOverride3}
                        onChange={(e) =>
                          setFormData({ ...formData, prodOverride3: e.target.checked })
                        }
                        className="mt-0.5 w-4 h-4 text-[var(--brand-from)] focus:ring-2 focus:ring-[var(--brand-from)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">
                        I accept that adversarial prompts may trigger unsafe behavior
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {project.environment === 'prod' && (
                <div className="p-4 bg-[var(--severity-warning-bg)] border border-[var(--severity-warning-border)] rounded-md">
                  <p className="text-sm font-medium text-[var(--severity-warning-text)]">
                    Production mode is currently enabled
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    New runs will execute against production-level adversarial tests
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveEnvironment}
                disabled={saving || !isProdOverrideValid}
                variant={formData.environment === 'prod' ? 'danger' : 'primary'}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Environment Settings
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
      </div>
    </div>
  );

  return embedded ? body : <AppShell>{body}</AppShell>;
}
