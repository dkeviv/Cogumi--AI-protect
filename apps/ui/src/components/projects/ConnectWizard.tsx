'use client';

import { useState } from 'react';

type WizardStep = 'token' | 'deploy' | 'verify' | 'endpoint' | 'complete';

export function ConnectWizard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('token');
  const [token, setToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenAcknowledged, setTokenAcknowledged] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [agentEndpoint, setAgentEndpoint] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    reachable: boolean;
    status?: number;
    error?: string;
    errorType?: string;
  } | null>(null);

  const steps = [
    { id: 'token', name: 'Generate Token', number: 1 },
    { id: 'deploy', name: 'Deploy Sidecar', number: 2 },
    { id: 'verify', name: 'Verify Connection', number: 3 },
    { id: 'endpoint', name: 'Configure Agent', number: 4 },
    { id: 'complete', name: 'Complete', number: 5 },
  ];

  async function generateToken() {
    try {
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to create token');
      
      const data = await response.json();
      setToken(data.plainToken);
      setShowTokenModal(true);
      setTokenSaved(false);
    } catch (err) {
      alert('Failed to generate token. Please try again.');
    }
  }

  async function verifyConnection() {
    setIsVerifying(true);
    setVerificationStatus('checking');

    try {
      // Poll for heartbeat updates
      const response = await fetch(`/api/projects/${projectId}/tokens`);
      if (!response.ok) throw new Error('Failed to check connection');
      
      const data = await response.json();
      const hasConnectedToken = data.tokens.some((t: any) => t.lastSeenAt !== null);
      
      if (hasConnectedToken) {
        setVerificationStatus('success');
        setTimeout(() => setCurrentStep('endpoint'), 1500);
      } else {
        setVerificationStatus('failed');
      }
    } catch (err) {
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  }

  async function validateEndpoint() {
    if (!agentEndpoint) {
      alert('Please enter an agent endpoint URL first.');
      return false;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/validate-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentTestUrl: agentEndpoint }),
      });

      const data = await response.json();
      setValidationResult(data);
      return data?.success && data?.reachable;
    } catch (err) {
      setValidationResult({
        success: false,
        reachable: false,
        error: 'Failed to validate endpoint',
        errorType: 'error',
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  }

  async function saveEndpoint() {
    const isValid = await validateEndpoint();
    if (!isValid) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentTestUrl: agentEndpoint }),
      });
      
      if (!response.ok) throw new Error('Failed to save endpoint');
      
      setCurrentStep('complete');
    } catch (err) {
      alert('Failed to save agent endpoint. Please try again.');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, idx) => {
              const status = getStepStatus(step.id);
              return (
                <li key={step.id} className={`relative ${idx !== steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex items-center">
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold
                          ${status === 'complete' ? 'bg-blue-600 text-white' : ''}
                          ${status === 'current' ? 'bg-blue-600 text-white ring-2 ring-blue-100' : ''}
                          ${status === 'upcoming' ? 'bg-slate-200 text-slate-600' : ''}
                        `}
                      >
                        {status === 'complete' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          step.number
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600' : 'text-slate-900'}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className="hidden md:block absolute top-4 left-8 w-full h-0.5 bg-slate-200">
                      <div className={`h-full ${status === 'complete' ? 'bg-blue-600 w-full' : 'bg-slate-200 w-0'}`} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-[var(--app-shadow-card)]">
        {/* Step 1: Generate Token */}
        {currentStep === 'token' && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Step 1: Generate Sidecar Token</h2>
            <p className="text-slate-600 mb-6">
              Create a secure token that your sidecar proxy will use to authenticate with the Cogumi platform.
            </p>
            <button
              onClick={generateToken}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Generate Token
            </button>
          </div>
        )}

        {showTokenModal && token && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-[var(--app-shadow-drawer)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Your Sidecar Token (shown once)</h3>
              <p className="text-sm text-slate-600 mb-4">
                Save this token securely. You won’t be able to view it again.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 break-all">
                {token}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => copyToClipboard(token)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Copy Token
                </button>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={tokenSaved}
                    onChange={(e) => setTokenSaved(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  I saved it
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (!tokenSaved) return;
                    setShowTokenModal(false);
                    setTokenAcknowledged(true);
                    setCurrentStep('deploy');
                  }}
                  disabled={!tokenSaved}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Deploy Sidecar */}
        {currentStep === 'deploy' && token && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Step 2: Deploy Sidecar</h2>
            <p className="text-slate-600 mb-6">
              Use this Docker Compose configuration to deploy your sidecar proxy.
            </p>

            {/* Token Display */}
            {tokenAcknowledged ? (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Token saved</h3>
                <p className="text-sm text-slate-600">
                  Your token was shown once. Use the stored value in the configuration below.
                </p>
              </div>
            ) : null}

            {/* Docker Compose */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">docker-compose.yml</h3>
              <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto border border-slate-800">
                <pre className="text-sm text-slate-100 font-mono">
{`version: '3.8'

services:
  cogumi-sidecar:
    image: cogumi/sidecar:latest
    container_name: cogumi-sidecar-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
    environment:
      - COGUMI_TOKEN=${tokenAcknowledged ? 'YOUR_TOKEN' : token}
      - COGUMI_API_URL=http://localhost:3001
      - COGUMI_PROJECT_ID=${projectId}
    ports:
      - "8080:8080"
    restart: unless-stopped

  # Your AI agent container
  your-agent:
    # ... your agent configuration
    environment:
      # Set these to route through the sidecar
      - HTTP_PROXY=http://cogumi-sidecar:8080
      - HTTPS_PROXY=http://cogumi-sidecar:8080
    depends_on:
      - cogumi-sidecar`}
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(`version: '3.8'

services:
  cogumi-sidecar:
    image: cogumi/sidecar:latest
    container_name: cogumi-sidecar-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
    environment:
      - COGUMI_TOKEN=${tokenAcknowledged ? 'YOUR_TOKEN' : token}
      - COGUMI_API_URL=http://localhost:3001
      - COGUMI_PROJECT_ID=${projectId}
    ports:
      - "8080:8080"
    restart: unless-stopped

  your-agent:
    # ... your agent configuration
    environment:
      - HTTP_PROXY=http://cogumi-sidecar:8080
      - HTTPS_PROXY=http://cogumi-sidecar:8080
    depends_on:
      - cogumi-sidecar`)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Copy docker-compose.yml
              </button>
            </div>

            {/* .env file */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">.env (Alternative)</h3>
              <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto border border-slate-800">
                <pre className="text-sm text-slate-100 font-mono">
{`COGUMI_TOKEN=${tokenAcknowledged ? 'YOUR_TOKEN' : token}
COGUMI_API_URL=http://localhost:3001
COGUMI_PROJECT_ID=${projectId}
HTTP_PROXY=http://localhost:8080
HTTPS_PROXY=http://localhost:8080`}
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(`COGUMI_TOKEN=${tokenAcknowledged ? 'YOUR_TOKEN' : token}
COGUMI_API_URL=http://localhost:3001
COGUMI_PROJECT_ID=${projectId}
HTTP_PROXY=http://localhost:8080
HTTPS_PROXY=http://localhost:8080`)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Copy .env
              </button>
            </div>

            <button
              onClick={() => setCurrentStep('verify')}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              I've Deployed the Sidecar
            </button>
          </div>
        )}

        {/* Step 3: Verify Connection */}
        {currentStep === 'verify' && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Step 3: Verify Connection</h2>
            <p className="text-slate-600 mb-6">
              Make sure your sidecar is running and can connect to the Cogumi platform.
            </p>

            {verificationStatus === 'idle' && (
              <button
                onClick={verifyConnection}
                disabled={isVerifying}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isVerifying ? 'Checking Connection...' : 'Check Connection'}
              </button>
            )}

            {verificationStatus === 'checking' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                <div>
                  <p className="text-blue-900 font-medium">Checking for sidecar connection...</p>
                  <p className="text-sm text-blue-700">This may take a few seconds.</p>
                </div>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-emerald-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-emerald-900 font-medium">Connection Successful!</p>
                    <p className="text-sm text-emerald-700">Your sidecar is connected and sending heartbeats.</p>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-red-900 font-medium mb-2">No Connection Detected</p>
                    <p className="text-sm text-red-700 mb-4">
                      Make sure your sidecar is running and configured correctly.
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1 mb-4">
                      <li>Check that docker-compose is running</li>
                      <li>Verify the token is correct</li>
                      <li>Check network connectivity</li>
                      <li>Review sidecar logs for errors</li>
                    </ul>
                    <button
                      onClick={verifyConnection}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Configure Agent Endpoint */}
        {currentStep === 'endpoint' && (
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Step 4: Configure Agent Endpoint</h2>
            <p className="text-slate-600 mb-6">
              Provide the URL where your AI agent can be reached for testing.
            </p>

            <div className="mb-6">
              <label htmlFor="agentEndpoint" className="block text-sm font-medium text-slate-700 mb-2">
                Agent Test Endpoint
              </label>
              <input
                type="url"
                id="agentEndpoint"
                value={agentEndpoint}
                onChange={(e) => setAgentEndpoint(e.target.value)}
                placeholder="http://localhost:3000/api/chat"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-slate-500 mt-2">
                This is the URL where Cogumi will send test messages to your agent.
              </p>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={validateEndpoint}
                disabled={isValidating || !agentEndpoint}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isValidating ? 'Validating...' : 'Validate Endpoint'}
              </button>
              {validationResult?.success && validationResult?.reachable && (
                <span className="text-xs font-semibold text-emerald-700">
                  Validated (HTTP {validationResult.status})
                </span>
              )}
            </div>

            {validationResult && !(validationResult.success && validationResult.reachable) && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {validationResult.error || 'Endpoint validation failed.'}
              </div>
            )}

            <button
              onClick={saveEndpoint}
              disabled={!agentEndpoint}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save & Continue
            </button>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Setup Complete!</h2>
            <p className="text-slate-600 mb-8">
              Your sidecar is connected and ready to start monitoring your AI agent.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href={`/projects/${projectId}`}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to Project Dashboard
              </a>
              <a
                href={`/projects/${projectId}`}
                className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Run First Test
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
