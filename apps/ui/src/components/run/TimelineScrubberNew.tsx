'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, ChevronsRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TimelineMarker {
  seq: number;
  label: string;
  kind: 'script' | 'confirmed' | 'attempted' | 'quota' | 'posture';
}

interface TimelineScrubberNewProps {
  markers: TimelineMarker[];
  currentSeq: number;
  minSeq: number;
  maxSeq: number;
  onChangeSeq: (seq: number) => void;
  onJumpLatest?: () => void;
  live?: boolean;
}

function getMarkerDotClass(kind: TimelineMarker['kind']) {
  switch (kind) {
    case 'confirmed':
      return 'bg-[var(--severity-critical)]';
    case 'attempted':
      return 'bg-[var(--severity-high)]';
    case 'quota':
      return 'bg-[var(--severity-medium)]';
    case 'posture':
      return 'bg-[var(--text-muted)]';
    case 'script':
      return 'bg-[var(--severity-info)]';
    default:
      return 'bg-slate-400';
  }
}

/**
 * Vertical timeline (scrollable) used for replay navigation.
 * Replaces the old horizontal scrubber, which hid labels and wasted space.
 */
export function TimelineScrubberNew({
  markers,
  currentSeq,
  minSeq,
  maxSeq,
  onChangeSeq,
  onJumpLatest,
  live = false,
}: TimelineScrubberNewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const sorted = useMemo(() => {
    const uniq = new Map<number, TimelineMarker>();
    for (const m of markers) {
      // Prefer "more important" markers when seq collides.
      const existing = uniq.get(m.seq);
      if (!existing) {
        uniq.set(m.seq, m);
        continue;
      }
      const rank = (k: TimelineMarker['kind']) =>
        k === 'confirmed' ? 5 : k === 'attempted' ? 4 : k === 'quota' ? 3 : k === 'posture' ? 2 : 1;
      if (rank(m.kind) > rank(existing.kind)) uniq.set(m.seq, m);
    }
    return Array.from(uniq.values()).sort((a, b) => a.seq - b.seq);
  }, [markers]);

  // Auto-advance playhead in replay mode.
  useEffect(() => {
    if (!isPlaying || live) return;
    const interval = setInterval(() => {
      if (currentSeq < maxSeq) onChangeSeq(currentSeq + 1);
      else setIsPlaying(false);
    }, 350);
    return () => clearInterval(interval);
  }, [isPlaying, live, currentSeq, maxSeq, onChangeSeq]);

  const currentIdx = useMemo(() => {
    if (sorted.length === 0) return -1;
    let best = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i]!.seq <= currentSeq) best = i;
      else break;
    }
    return best;
  }, [sorted, currentSeq]);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Timeline</div>
          <div className="text-xs text-[var(--text-secondary)]">
            seq {currentSeq} / {maxSeq}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!live && (
            <Button
              variant="ghost"
              onClick={() => setIsPlaying((v) => !v)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="h-9 w-9 px-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          )}

          {live && onJumpLatest && (
            <Button variant="ghost" onClick={onJumpLatest} className="h-9">
              <ChevronsRight className="h-4 w-4 mr-1.5" />
              Latest
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-default)] bg-white px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            No markers yet. Story steps will appear as the run progresses.
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((m, idx) => {
              const active = idx === currentIdx;
              const past = m.seq <= currentSeq;
              return (
                <button
                  type="button"
                  key={`${m.seq}-${idx}`}
                  onClick={() => onChangeSeq(m.seq)}
                  className={[
                    'w-full text-left rounded-lg border px-3 py-2 transition',
                    active
                      ? 'border-[var(--brand-from)] bg-blue-50'
                      : 'border-[var(--border-default)] bg-white hover:border-slate-300 hover:shadow-sm',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${getMarkerDotClass(m.kind)}`} />
                      <div className="mt-1 h-full w-px bg-slate-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {m.label}
                        </div>
                        <div className="text-xs font-mono text-[var(--text-muted)]">#{m.seq}</div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        {past ? 'At or before current position' : 'After current position'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-default)] px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-[var(--text-muted)]">
          Range: {minSeq}–{maxSeq}
        </div>
        {!live && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onChangeSeq(maxSeq)}
            disabled={maxSeq <= minSeq}
          >
            Jump to end
          </Button>
        )}
      </div>
    </Card>
  );
}

