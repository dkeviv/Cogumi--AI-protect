'use client';

import { useEffect, useState } from 'react';

type Token = {
  id: string;
  status: string;
  lastSeenAt: string | null;
  createdAt: string;
};

export function TokenManagement({ projectId }: { projectId: string }) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewToken, setShowNewToken] = useState(false);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, [projectId]);

  async function fetchTokens() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/tokens`);
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      setTokens(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  async function createToken() {
    try {
      setIsCreating(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to create token');
      
      const data = await response.json();
      setNewTokenValue(data.plainToken);
      setShowNewToken(true);
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  }

  async function revokeToken(tokenId: string) {
    if (!confirm('Are you sure you want to revoke this token? Sidecars using this token will no longer be able to connect.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) throw new Error('Failed to revoke token');
      
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token');
    }
  }

  async function deleteToken(tokenId: string) {
    if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/tokens/${tokenId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete token');
      
      fetchTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Token copied to clipboard!');
  }

  function getStatusBadge(status: string) {
    if (status === 'active') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  }

  function getConnectionStatus(lastSeenAt: string | null) {
    if (!lastSeenAt) {
      return { text: 'Never connected', color: 'text-gray-500' };
    }
    
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 2) {
      return { text: 'Connected', color: 'text-green-600' };
    } else if (diffMinutes < 10) {
      return { text: 'Recently active', color: 'text-yellow-600' };
    }
    return { text: 'Disconnected', color: 'text-red-600' };
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sidecar Tokens</h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate tokens for your sidecar proxies to authenticate with the platform
          </p>
        </div>
        <button
          onClick={createToken}
          disabled={isCreating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? 'Generating...' : 'Generate Token'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* New Token Modal */}
      {showNewToken && newTokenValue && (
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Token Created Successfully
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Copy this token now. For security reasons, it won't be shown again.
              </p>
              <div className="bg-white rounded border border-blue-300 p-3 mb-3">
                <code className="text-sm text-gray-900 break-all font-mono">{newTokenValue}</code>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(newTokenValue)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                >
                  Copy Token
                </button>
                <button
                  onClick={() => {
                    setShowNewToken(false);
                    setNewTokenValue(null);
                  }}
                  className="px-3 py-1.5 bg-white text-blue-600 text-sm font-medium rounded border border-blue-300 hover:bg-blue-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="text-gray-600 mb-2">No tokens yet</p>
          <p className="text-sm text-gray-500">Generate a token to connect your sidecar proxy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => {
            const connectionStatus = getConnectionStatus(token.lastSeenAt);
            return (
              <div
                key={token.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="text-sm font-mono text-gray-600">
                        {token.id.substring(0, 8)}...
                      </code>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(token.status)}`}>
                        {token.status}
                      </span>
                      <span className={`text-xs font-medium ${connectionStatus.color}`}>
                        ● {connectionStatus.text}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Created {new Date(token.createdAt).toLocaleString()}</p>
                      {token.lastSeenAt && (
                        <p>Last seen {new Date(token.lastSeenAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {token.status === 'active' && (
                      <button
                        onClick={() => revokeToken(token.id)}
                        className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
