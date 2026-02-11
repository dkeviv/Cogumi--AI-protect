'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Server,
  Key,
  Settings,
  Zap,
  PlayCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  environment: 'dev' | 'staging' | 'prod';
  agentTestUrl?: string;
}

type StepId = 'token' | 'deploy' | 'verify' | 'endpoint' | 'run';

const STEPS: { id: StepId; title: string; icon: typeof Server }[] = [
  { id: 'token', title: 'Generate Token', icon: Key },
  { id: 'deploy', title: 'Deploy Sidecar', icon: Server },
  { id: 'verify', title: 'Verify Connection', icon: Zap },
  { id: 'endpoint', title: 'Configure Endpoint', icon: Settings },
  { id: 'run', title: 'Complete', icon: PlayCircle },
];

export function SetupWizard({
  projectId,
  baseHref,
  embedded = false,
}: {
  projectId: string;
  baseHref?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Get current step from URL query param, default to 'token'
  const currentStep = (searchParams.get('step') as StepId) || 'token';
  
  const [project, setProject] = useState<Project | null>(null);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1 (token): Token state
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Step 2 (deploy): Snippets state
  const [snippets, setSnippets] = useState<{
    dockerCompose: string;
    envTemplate: string;
    verifyInstructions: string;
  } | null>(null);
  const [loadingSnippets, setLoadingSnippets] = useState(false);
  const [deployTab, setDeployTab] = useState<'docker' | 'env'>('docker');

  // Step 3 (verify): Validation state
  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  // Step 4 (endpoint): Endpoint config state
  const [agentTestUrl, setAgentTestUrl] = useState('');
  const [validatingEndpoint, setValidatingEndpoint] = useState(false);
  const [endpointValid, setEndpointValid] = useState(false);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [savingEndpoint, setSavingEndpoint] = useState(false);

  // Step 5 (run): Test run state
  const [runningTest, setRunningTest] = useState(false);
  const [testRunId, setTestRunId] = useState<string | null>(null);

  // Load project
  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to load project');
        const data = await res.json();
        setProject(data.project);
        setAgentTestUrl(data.project.agentTestUrl || '');
        setLoading(false);
      } catch (err) {
        toast.error('Failed to load project');
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId, toast]);

  // Navigate to step
  const goToStep = (step: StepId) => {
    const hrefBase = baseHref || `/projects/${projectId}/setup`;
    const joiner = hrefBase.includes('?') ? '&' : '?';
    router.push(`${hrefBase}${joiner}step=${step}`);
  };

  // Step 1: Generate token
  const handleGenerateToken = async () => {
    try {
      setGeneratingToken(true);
      const res = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to generate token');
      const data = await res.json();
      
      // API returns { token: {...}, plainToken: "cog_..." }
      setPlainToken(data.plainToken);
      setTokenId(data.token.id);
      setShowTokenModal(true);
      setTokenSaved(false);

      toast.success('Token generated successfully');
    } catch (err) {
      toast.error('Failed to generate token');
    } finally {
      setGeneratingToken(false);
    }
  };

  // Step 1: Acknowledge token and proceed
  const handleTokenAcknowledge = () => {
    if (!tokenSaved) {
      toast.warning('Please check the box to confirm you saved the token');
      return;
    }
    setShowTokenModal(false);
    setCompletedSteps([...completedSteps, 'token']);
    goToStep('deploy');
  };

  // Step 2: Load snippets
  useEffect(() => {
    if (currentStep === 'deploy' && !snippets) {
      async function loadSnippets() {
        try {
          setLoadingSnippets(true);
          const res = await fetch(`/api/projects/${projectId}/connect-snippets`);
          if (!res.ok) throw new Error('Failed to load snippets');
          const data = await res.json();
          setSnippets({
            dockerCompose: data.dockerCompose,
            envTemplate: data.envTemplate,
            verifyInstructions: data.verifyInstructions,
          });
          // If a token was auto-generated, show it
          if (data.tokenGenerated && data.tokenValue) {
            setPlainToken(data.tokenValue);
            setTokenId(data.tokenId);
          }
        } catch (err) {
          toast.error('Failed to load connection snippets');
        } finally {
          setLoadingSnippets(false);
        }
      }
      loadSnippets();
    }
  }, [currentStep, snippets, projectId, toast]);

  // Step 2: Proceed to verify
  const handleDeployComplete = () => {
    setCompletedSteps([...completedSteps, 'deploy']);
    goToStep('verify');
  };

  // Step 3: Validate connection
  const handleValidateConnection = async () => {
    try {
      setValidating(true);
      setValidationError(null);
      
      // Check for active tokens with last_seen_at
      const res = await fetch(`/api/projects/${projectId}/tokens`);
      if (!res.ok) throw new Error('Failed to check connection');
      
      const data = await res.json();
      const activeToken = data.tokens?.find((t: any) => t.status === 'active' && t.lastSeenAt);
      
      if (activeToken && activeToken.lastSeenAt) {
        setValidationSuccess(true);
        setLastSeenAt(activeToken.lastSeenAt);
        setCompletedSteps([...completedSteps, 'verify']);
        toast.success('Connection validated successfully!');
        
        // Auto-advance after 1.5s
        setTimeout(() => {
          goToStep('endpoint');
        }, 1500);
      } else {
        throw new Error('No heartbeat received. Make sure the sidecar is running and configured correctly.');
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Connection validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Step 4: Validate endpoint
  const handleValidateEndpoint = async () => {
    try {
      setValidatingEndpoint(true);
      setEndpointError(null);
      
      const res = await fetch(`/api/projects/${projectId}/validate-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentTestUrl: agentTestUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Endpoint validation failed');
      }

      const data = await res.json();
      setEndpointValid(true);
      toast.success(`Endpoint validated! Latency: ${data.details?.latency_ms || 0}ms`);
    } catch (err) {
      setEndpointError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Endpoint validation failed');
    } finally {
      setValidatingEndpoint(false);
    }
  };

  // Step 4: Save endpoint and proceed
  const handleSaveEndpoint = async () => {
    try {
      setSavingEndpoint(true);
      
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentTestUrl }),
      });

      if (!res.ok) throw new Error('Failed to save endpoint');
      
      setCompletedSteps([...completedSteps, 'endpoint']);
      toast.success('Endpoint saved!');
      goToStep('run');
    } catch (err) {
      toast.error('Failed to save endpoint');
    } finally {
      setSavingEndpoint(false);
    }
  };

  // Step 5: Run first test
  const handleRunTest = async () => {
    try {
      setRunningTest(true);
      
      // API expects POST /api/projects/:id/runs (not /api/runs)
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'campaign' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start test run');
      }
      
      const data = await res.json();
      setTestRunId(data.run.id);
      
      setCompletedSteps([...completedSteps, 'run']);
      toast.success('Test run started!');
      
      // Redirect to run page after 2s
      setTimeout(() => {
        router.push(`/runs/${data.run.id}`);
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start test run');
      setRunningTest(false);
    }
  };

  if (loading) {
    const content = (
      <div className="flex items-center justify-center min-h-[420px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-from)]" />
      </div>
    );
    return embedded ? content : <AppShell>{content}</AppShell>;
  }

  if (!project) {
    const content = (
      <div className="flex items-center justify-center min-h-[420px]">
        <p className="text-[var(--text-secondary)]">Project not found</p>
      </div>
    );
    return embedded ? content : <AppShell>{content}</AppShell>;
  }

  const content = (
    <>
      <div className={embedded ? '' : 'px-4 sm:px-6 py-6'}>
        {/* Breadcrumbs */}
        {!embedded && (
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: project.name, href: `/projects/${projectId}` },
              { label: 'Setup' },
            ]}
          />
        )}

        {/* Header */}
        <div className="mt-6 mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Connect Sidecar</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Follow these steps to connect your AI agent to COGUMI
          </p>
        </div>

        {/* Progress indicator - hidden on mobile, visible on tablet+ */}
        <div className="mb-8 hidden md:block">
          <div className="flex items-center justify-between max-w-4xl">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  {/* Step circle */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(step.id)}
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        transition-all duration-[var(--transition-base)]
                        ${isComplete 
                          ? 'bg-emerald-500 text-white' 
                          : isCurrent 
                            ? 'bg-[var(--brand-from)] text-white' 
                            : 'bg-[var(--surface-card)] border-2 border-[var(--border-default)] text-[var(--text-muted)]'
                        }
                      `}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </button>
                    <p className={`
                      text-xs mt-2 font-medium
                      ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                    `}>
                      {step.title}
                    </p>
                  </div>

                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div className={`
                      h-0.5 w-24 mx-2
                      ${isComplete && completedSteps.includes(STEPS[idx + 1].id)
                        ? 'bg-emerald-500' 
                        : 'bg-[var(--border-default)]'
                      }
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-3xl">
          {/* Step 1: Generate Token */}
          {currentStep === 'token' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--brand-from)]/10 rounded-lg">
                    <Key className="h-5 w-5 text-[var(--brand-from)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Generate Token</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Create a secure token for your sidecar proxy
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  This token authenticates your sidecar proxy with the COGUMI API. You'll only see it once, so make sure to copy it.
                </p>
                <Button
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                  variant="primary"
                >
                  {generatingToken ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generate Token
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Deploy Sidecar */}
          {currentStep === 'deploy' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--brand-from)]/10 rounded-lg">
                    <Server className="h-5 w-5 text-[var(--brand-from)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Deploy Sidecar</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Add the sidecar to your environment
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSnippets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-from)]" />
                  </div>
                ) : snippets ? (
                  <div>
                    <div className="mb-4">
                      <div className="flex border-b border-[var(--border-default)]">
                        <button
                          onClick={() => setDeployTab('docker')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            deployTab === 'docker'
                              ? 'border-[var(--brand-from)] text-[var(--brand-from)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Docker Compose
                        </button>
                        <button
                          onClick={() => setDeployTab('env')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            deployTab === 'env'
                              ? 'border-[var(--brand-from)] text-[var(--brand-from)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Environment Variables
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      {deployTab === 'docker' && (
                        <CodeBlock code={snippets.dockerCompose} language="yaml" />
                      )}
                      {deployTab === 'env' && (
                        <CodeBlock code={snippets.envTemplate} language="bash" />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Failed to load snippets. Please try refreshing the page.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleDeployComplete} variant="primary">
                  I've deployed the sidecar
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Verify Connection */}
          {currentStep === 'verify' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--brand-from)]/10 rounded-lg">
                    <Zap className="h-5 w-5 text-[var(--brand-from)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Verify Connection</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Confirm your sidecar is connected
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {validationSuccess ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="font-medium text-emerald-500">Connection successful!</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          Last seen: {lastSeenAt ? new Date(lastSeenAt).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : validationError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-500">Connection failed</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {validationError}
                        </p>
                        <div className="mt-3 text-sm text-[var(--text-secondary)]">
                          <p className="font-medium mb-2">Troubleshooting:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Make sure the sidecar container is running</li>
                            <li>Check that the COGUMI_TOKEN is correct</li>
                            <li>Verify COGUMI_API_URL is accessible</li>
                            <li>Check container logs for errors</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Click the button below to check if your sidecar is sending heartbeat signals to COGUMI.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleValidateConnection}
                  disabled={validating || validationSuccess}
                  variant="primary"
                >
                  {validating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking connection...
                    </>
                  ) : validationSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Check Connection
                    </>
                  )}
                </Button>
                {validationError && (
                  <Button onClick={handleValidateConnection} variant="secondary" className="ml-2">
                    Try Again
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Step 4: Configure Endpoint */}
          {currentStep === 'endpoint' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--brand-from)]/10 rounded-lg">
                    <Settings className="h-5 w-5 text-[var(--brand-from)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Configure Agent Endpoint</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Point us to your agent's test endpoint
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="agentTestUrl" className="block text-sm font-medium mb-2">
                      Agent Test URL
                    </label>
                    <input
                      id="agentTestUrl"
                      type="url"
                      value={agentTestUrl}
                      onChange={(e) => setAgentTestUrl(e.target.value)}
                      placeholder="https://your-agent.example.com/api/chat"
                      className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] text-sm"
                    />
                  </div>

                  {endpointValid && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm text-emerald-500 font-medium">Endpoint validated</p>
                      </div>
                    </div>
                  )}

                  {endpointError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <p className="text-sm text-red-500 font-medium">{endpointError}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleValidateEndpoint}
                    disabled={validatingEndpoint || !agentTestUrl}
                    variant="secondary"
                    size="sm"
                  >
                    {validatingEndpoint ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate Endpoint'
                    )}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSaveEndpoint}
                  disabled={savingEndpoint || !agentTestUrl}
                  variant="primary"
                >
                  {savingEndpoint ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'run' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <PlayCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">You're all set!</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Ready to run your first security test
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <CheckCircle className="h-16 w-16 text-emerald-500" />
                </div>
                <p className="text-center text-sm text-[var(--text-secondary)]">
                  Your sidecar is connected and your agent endpoint is configured. 
                  You're ready to run your first red team test!
                </p>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  onClick={handleRunTest}
                  disabled={runningTest}
                  variant="primary"
                >
                  {runningTest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting test...
                    </>
                  ) : testRunId ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Test started! Redirecting...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run First Test
                    </>
                  )}
                </Button>
                <Link href={`/projects/${projectId}`}>
                  <Button variant="ghost">Go to Project</Button>
                </Link>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Token Modal */}
      {showTokenModal && plainToken && (
        <Modal
          isOpen={showTokenModal}
          onClose={() => {}}
          title="Save Your Token"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">Important!</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    This token will only be shown once. Make sure to copy it and store it securely.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Token</label>
              <CodeBlock code={plainToken} language="text" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tokenSaved"
                checked={tokenSaved}
                onChange={(e) => setTokenSaved(e.target.checked)}
                className="rounded border-[var(--border-default)]"
              />
              <label htmlFor="tokenSaved" className="text-sm">
                I saved this token
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={handleTokenAcknowledge}
                disabled={!tokenSaved}
                variant="primary"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  return embedded ? content : <AppShell>{content}</AppShell>;
}
