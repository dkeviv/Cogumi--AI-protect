'use client';

import { useState, useEffect } from 'react';

type WizardStep = 'token' | 'deploy' | 'verify' | 'endpoint' | 'complete';

export function ConnectWizard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('token');
  const [token, setToken] = useState<string | null>(null);
  const [agentEndpoint, setAgentEndpoint] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

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
      setCurrentStep('deploy');
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

  async function saveEndpoint() {
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
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                          ${status === 'complete' ? 'bg-blue-600 text-white' : ''}
                          ${status === 'current' ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''}
                          ${status === 'upcoming' ? 'bg-gray-200 text-gray-600' : ''}
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
                      <p className={`text-sm font-medium ${status === 'current' ? 'text-blue-600' : 'text-gray-900'}`}>
                        {step.name}
                      </p>
                    </div>
                  </div>
                  {idx !== steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-10 w-full h-0.5 bg-gray-200">
                      <div className={`h-full ${status === 'complete' ? 'bg-blue-600 w-full' : 'bg-gray-200 w-0'}`} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        {/* Step 1: Generate Token */}
        {currentStep === 'token' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Generate Sidecar Token</h2>
            <p className="text-gray-600 mb-6">
              Create a secure token that your sidecar proxy will use to authenticate with the Cogumi platform.
            </p>
            <button
              onClick={generateToken}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Generate Token
            </button>
          </div>
        )}

        {/* Step 2: Deploy Sidecar */}
        {currentStep === 'deploy' && token && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Deploy Sidecar</h2>
            <p className="text-gray-600 mb-6">
              Use this Docker Compose configuration to deploy your sidecar proxy.
            </p>

            {/* Token Display */}
            <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Your Sidecar Token</h3>
              <p className="text-sm text-blue-800 mb-3">
                Save this token securely. You'll need it for the Docker Compose configuration.
              </p>
              <div className="bg-white rounded border border-blue-300 p-3 mb-3">
                <code className="text-sm text-gray-900 break-all font-mono">{token}</code>
              </div>
              <button
                onClick={() => copyToClipboard(token)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Copy Token
              </button>
            </div>

            {/* Docker Compose */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">docker-compose.yml</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono">
{`version: '3.8'

services:
  cogumi-sidecar:
    image: cogumi/sidecar:latest
    container_name: cogumi-sidecar-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
    environment:
      - COGUMI_TOKEN=${token}
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
      - COGUMI_TOKEN=${token}
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
              <h3 className="text-sm font-semibold text-gray-900 mb-2">.env (Alternative)</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-100 font-mono">
{`COGUMI_TOKEN=${token}
COGUMI_API_URL=http://localhost:3001
COGUMI_PROJECT_ID=${projectId}
HTTP_PROXY=http://localhost:8080
HTTPS_PROXY=http://localhost:8080`}
                </pre>
              </div>
              <button
                onClick={() => copyToClipboard(`COGUMI_TOKEN=${token}
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
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              I've Deployed the Sidecar
            </button>
          </div>
        )}

        {/* Step 3: Verify Connection */}
        {currentStep === 'verify' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 3: Verify Connection</h2>
            <p className="text-gray-600 mb-6">
              Make sure your sidecar is running and can connect to the Cogumi platform.
            </p>

            {verificationStatus === 'idle' && (
              <button
                onClick={verifyConnection}
                disabled={isVerifying}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isVerifying ? 'Checking Connection...' : 'Check Connection'}
              </button>
            )}

            {verificationStatus === 'checking' && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                <div>
                  <p className="text-blue-900 font-medium">Checking for sidecar connection...</p>
                  <p className="text-sm text-blue-700">This may take a few seconds.</p>
                </div>
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-6">
                <div className="flex items-center">
                  <svg className="w-8 h-8 text-green-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-green-900 font-medium">Connection Successful!</p>
                    <p className="text-sm text-green-700">Your sidecar is connected and sending heartbeats.</p>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-6">
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
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 4: Configure Agent Endpoint</h2>
            <p className="text-gray-600 mb-6">
              Provide the URL where your AI agent can be reached for testing.
            </p>

            <div className="mb-6">
              <label htmlFor="agentEndpoint" className="block text-sm font-medium text-gray-700 mb-2">
                Agent Test Endpoint
              </label>
              <input
                type="url"
                id="agentEndpoint"
                value={agentEndpoint}
                onChange={(e) => setAgentEndpoint(e.target.value)}
                placeholder="http://localhost:3000/api/chat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                This is the URL where Cogumi will send test messages to your agent.
              </p>
            </div>

            <button
              onClick={saveEndpoint}
              disabled={!agentEndpoint}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
          </div>
        )}

        {/* Step 5: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
            <p className="text-gray-600 mb-8">
              Your sidecar is connected and ready to start monitoring your AI agent.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href={`/projects/${projectId}`}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Go to Project Dashboard
              </a>
              <a
                href={`/projects/${projectId}`}
                className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
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
