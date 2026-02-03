'use client';

import { Event } from '@cogumi/shared';
import { useState } from 'react';

interface ProofDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  evidenceEvents: Event[];
}

const EVENT_TYPE_ICONS = {
  request: '→',
  response: '←',
  violation: '⚠',
  ingest_throttled: '🚦',
};

const CHANNEL_COLORS = {
  http: 'bg-blue-100 text-blue-800',
  agent: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800',
};

/**
 * ProofDrawer - Chain-of-evidence overlay (slides in from right)
 * Shows evidence cards for a selected story step
 * NOT a JSON dump - human-readable evidence cards
 */
export function ProofDrawer({
  isOpen,
  onClose,
  stepTitle,
  evidenceEvents,
}: ProofDrawerProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Evidence Chain
              </h2>
              <p className="text-sm text-gray-600 mt-1">{stepTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Evidence cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {evidenceEvents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No evidence events found.</p>
            </div>
          )}

          {evidenceEvents.map((event, idx) => {
            const isExpanded = expandedEventId === event.id;
            const icon = EVENT_TYPE_ICONS[event.type] || '•';
            const channelColor = CHANNEL_COLORS[event.channel] || CHANNEL_COLORS.system;

            return (
              <div
                key={event.id}
                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Card header */}
                <div
                  onClick={() =>
                    setExpandedEventId(isExpanded ? null : event.id)
                  }
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {event.type.toUpperCase()} #{idx + 1}
                        </div>
                        <div className="text-xs text-gray-500">
                          seq {event.seq || 'N/A'} •{' '}
                          {new Date(event.ts).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${channelColor}`}>
                        {event.channel}
                      </span>
                      <span className="text-gray-400">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card body (expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-white">
                    {/* Destination */}
                    {event.destination && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">
                          DESTINATION
                        </div>
                        <div className="text-sm font-mono bg-gray-50 p-2 rounded">
                          {event.destination.host}
                          {event.destination.path && (
                            <span className="text-gray-600">
                              {event.destination.path}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Classification: {event.destination.classification}
                        </div>
                      </div>
                    )}

                    {/* HTTP details */}
                    {event.http && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">
                          HTTP
                        </div>
                        <div className="text-sm space-y-1">
                          {event.http.method && event.http.url && (
                            <div className="font-mono bg-gray-50 p-2 rounded">
                              {event.http.method} {event.http.url}
                            </div>
                          )}
                          {event.http.status && (
                            <div className="text-gray-600">
                              Status: {event.http.status}
                            </div>
                          )}
                          {event.http.headers && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Headers ({Object.keys(event.http.headers).length})
                              </summary>
                              <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(event.http.headers, null, 2)}
                              </pre>
                            </details>
                          )}
                          {event.http.body_preview && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                Body Preview
                              </summary>
                              <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                                {event.http.body_preview}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Matches (secret detections) */}
                    {event.matches && event.matches.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">
                          SECRET MATCHES
                        </div>
                        <div className="space-y-2">
                          {event.matches.map((match, matchIdx) => (
                            <div
                              key={matchIdx}
                              className="bg-red-50 border border-red-200 p-2 rounded text-sm"
                            >
                              <div className="font-semibold text-red-900">
                                {match.kind}
                              </div>
                              {match.preview && (
                                <div className="font-mono text-xs text-red-700 mt-1">
                                  {match.preview}
                                </div>
                              )}
                              <div className="text-xs text-red-600 mt-1">
                                Confidence: {match.confidence}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payload redacted info */}
                    {event.payload_redacted && (
                      <div className="text-xs text-gray-500 italic">
                        ⚠ Payload redacted for security
                      </div>
                    )}

                    {/* Integrity hash */}
                    {event.integrity_hash && (
                      <div className="text-xs text-gray-400 font-mono">
                        Hash: {event.integrity_hash.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            {evidenceEvents.length} evidence event
            {evidenceEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  );
}
