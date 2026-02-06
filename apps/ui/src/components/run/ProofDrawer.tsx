'use client';

import { Event } from '@cogumi/shared';
import { useState } from 'react';

interface ProofDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  evidenceEvents: Event[];
}

const EVENT_TYPE_DOTS: Record<string, string> = {
  request: 'bg-blue-500',
  response: 'bg-emerald-500',
  blocked: 'bg-slate-500',
  marker: 'bg-slate-400',
  'secret.detected': 'bg-red-500',
  'policy.violation': 'bg-amber-500',
  'agent.message': 'bg-purple-500',
};

const CHANNEL_COLORS: Record<string, string> = {
  http: 'bg-blue-100 text-blue-800',
  system: 'bg-slate-100 text-slate-800',
  policy: 'bg-red-100 text-red-800',
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
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[640px] bg-white shadow-[var(--app-shadow-drawer)] z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Evidence Chain
              </h2>
              <p className="text-sm text-slate-600 mt-1">{stepTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Evidence cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {evidenceEvents.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p>No evidence events found.</p>
            </div>
          )}

          {evidenceEvents.map((event, idx) => {
            const isExpanded = expandedEventId === event.id;
            const dot = EVENT_TYPE_DOTS[event.type] || 'bg-slate-400';
            const channelColor = CHANNEL_COLORS[event.channel] || CHANNEL_COLORS.system;

            return (
              <div
                key={event.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Card header */}
                <div
                  onClick={() =>
                    setExpandedEventId(isExpanded ? null : event.id)
                  }
                  className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {event.type.toUpperCase()} #{idx + 1}
                        </div>
                        <div className="text-xs text-slate-500">
                          seq {event.seq || 'N/A'} •{' '}
                          {new Date(event.ts).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded ${channelColor}`}>
                        {event.channel}
                      </span>
                      <span className="text-slate-400">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card body (expanded) */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-white">
                    {/* Destination */}
                    {event.host && (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">
                          DESTINATION
                        </div>
                        <div className="text-sm font-mono bg-slate-50 p-2 rounded border border-slate-200">
                          {event.host}
                          {event.path && (
                            <span className="text-slate-600">
                              {event.path}
                            </span>
                          )}
                        </div>
                        {event.classification && (
                          <div className="text-xs text-slate-500 mt-1">
                            Classification: {event.classification}
                          </div>
                        )}
                      </div>
                    )}

                    {/* HTTP details */}
                    {event.method && (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">
                          HTTP
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="font-mono bg-slate-50 p-2 rounded border border-slate-200">
                            {event.method} {event.host}{event.path || '/'}
                            {event.port && `:${event.port}`}
                          </div>
                          {event.statusCode && (
                            <div className="text-slate-600">
                              Status: {event.statusCode}
                            </div>
                          )}
                          {event.durationMs && (
                            <div className="text-slate-600">
                              Duration: {event.durationMs}ms
                            </div>
                          )}
                          {(event.bytesOut || event.bytesIn) && (
                            <div className="text-slate-600 text-xs">
                              {event.bytesOut && `Out: ${event.bytesOut}b `}
                              {event.bytesIn && `In: ${event.bytesIn}b`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Matches (secret detections) */}
                    {event.matches && Array.isArray(event.matches) && event.matches.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-1">
                          SECRET MATCHES
                        </div>
                        <div className="space-y-2">
                          {event.matches.map((match: any, matchIdx: number) => (
                            <div
                              key={matchIdx}
                              className="rounded border border-red-200 bg-red-50 p-2 text-sm"
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
                    {event.payloadRedacted && (
                      <div className="text-xs text-slate-500 italic">
                        Payload redacted for security
                      </div>
                    )}

                    {/* Integrity hash */}
                    {event.integrityHash && (
                      <div className="text-xs text-slate-400 font-mono">
                        Hash: {event.integrityHash.substring(0, 16)}...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            {evidenceEvents.length} evidence event
            {evidenceEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  );
}
