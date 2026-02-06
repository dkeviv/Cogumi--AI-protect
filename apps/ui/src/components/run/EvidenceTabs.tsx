'use client';

import { Event, Finding } from '@cogumi/shared';
import { useState } from 'react';

interface EvidenceTabsProps {
  events: Event[];
  findings: Finding[];
  currentSeq?: number;
}

type TabId = 'conversation' | 'network' | 'findings' | 'policy' | 'memory';

/**
 * EvidenceTabs - Right column tabs
 * Shows different views of the evidence: Conversation, Network, Findings, Policy, Memory
 */
export function EvidenceTabs({
  events,
  findings,
  currentSeq,
}: EvidenceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('conversation');

  // Filter events by channel for different tabs
  const conversationEvents = events.filter(e => e.type === 'agent.message');
  const networkEvents = events.filter(e => e.channel === 'http');

  // Highlight events at or before currentSeq
  const isHighlighted = (event: Event): boolean => {
    if (!currentSeq || !event.seq) return false;
    return event.seq <= currentSeq;
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-[var(--app-shadow-card)]">
      {/* Tab headers */}
      <div className="flex gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <TabButton
          id="conversation"
          label="Conversation"
          count={conversationEvents.length}
          active={activeTab === 'conversation'}
          onClick={() => setActiveTab('conversation')}
        />
        <TabButton
          id="network"
          label="Network"
          count={networkEvents.length}
          active={activeTab === 'network'}
          onClick={() => setActiveTab('network')}
        />
        <TabButton
          id="findings"
          label="Findings"
          count={findings.length}
          active={activeTab === 'findings'}
          onClick={() => setActiveTab('findings')}
        />
        <TabButton
          id="policy"
          label="Policy"
          count={0}
          active={activeTab === 'policy'}
          onClick={() => setActiveTab('policy')}
        />
        <TabButton
          id="memory"
          label="Memory"
          count={0}
          active={activeTab === 'memory'}
          onClick={() => setActiveTab('memory')}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'conversation' && (
          <ConversationTab events={conversationEvents} isHighlighted={isHighlighted} />
        )}
        {activeTab === 'network' && (
          <NetworkTab events={networkEvents} isHighlighted={isHighlighted} />
        )}
        {activeTab === 'findings' && <FindingsTab findings={findings} />}
        {activeTab === 'policy' && <PolicyTab />}
        {activeTab === 'memory' && <MemoryTab />}
      </div>
    </div>
  );
}

function TabButton({
  id,
  label,
  count,
  active,
  onClick,
}: {
  id: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
      {count > 0 && (
        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
          {count}
        </span>
      )}
    </button>
  );
}

function ConversationTab({
  events,
  isHighlighted,
}: {
  events: Event[];
  isHighlighted: (e: Event) => boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p>No agent conversations recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => {
        const highlighted = isHighlighted(event);
        const isRequest = event.actor === 'adversary' || event.type === 'request';
        const label = event.actor === 'target' ? 'RESPONSE' : isRequest ? 'REQUEST' : 'MESSAGE';

        return (
          <div
            key={event.id}
            className={`rounded-lg border p-3 ${
              highlighted ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isRequest ? 'text-purple-700' : 'text-emerald-700'}`}>
                {label}
              </span>
              <span className="text-xs text-slate-500">
                seq {event.seq || 'N/A'}
              </span>
            </div>
            {event.payloadRedacted?.bodyRedactedPreview && (
              <pre className="max-h-32 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs font-mono text-slate-700">
                {event.payloadRedacted.bodyRedactedPreview}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NetworkTab({
  events,
  isHighlighted,
}: {
  events: Event[];
  isHighlighted: (e: Event) => boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p>No network events recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(event => {
        const highlighted = isHighlighted(event);

        return (
          <div
            key={event.id}
            className={`rounded border p-3 text-sm ${
              highlighted ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-slate-700">
                {event.method || 'HTTP'}
              </span>
              <span className="text-xs text-slate-500">
                seq {event.seq || 'N/A'}
              </span>
            </div>
            <div className="font-mono text-xs text-slate-700 truncate">
              {event.host}
              {event.path || ''}
            </div>
            {event.statusCode && (
              <div className="text-xs text-slate-600 mt-1">
                Status: {event.statusCode}
              </div>
            )}
            {event.matches && event.matches.length > 0 && (
              <div className="mt-2 text-xs text-red-700 font-semibold">
                {event.matches.length} secret match(es)
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FindingsTab({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p>No findings yet.</p>
      </div>
    );
  }

  const SEVERITY_COLORS = {
    critical: 'border-red-500 bg-red-50',
    high: 'border-orange-500 bg-orange-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-blue-500 bg-blue-50',
    info: 'border-gray-500 bg-gray-50',
  };

  return (
    <div className="space-y-3">
      {findings.map(finding => {
        const severityColor = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.info;

        return (
          <div
            key={finding.id}
            className={`rounded-lg border border-slate-200 p-4 ${severityColor}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{finding.title}</div>
                <div className="text-xs text-slate-600 mt-1">{finding.status}</div>
              </div>
              <span className="text-xs font-semibold text-slate-700 uppercase">
                {finding.severity}
              </span>
            </div>
            <p className="text-sm text-slate-700">{finding.summary}</p>
            {finding.scriptId && (
              <div className="text-xs text-slate-500 mt-2">
                Script: {finding.scriptId}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PolicyTab() {
  return (
    <div className="text-center text-slate-500 py-8">
      <p>Policy violations tab (coming soon)</p>
    </div>
  );
}

function MemoryTab() {
  return (
    <div className="text-center text-slate-500 py-8">
      <p>Memory tab (coming soon)</p>
    </div>
  );
}
