'use client';

interface TimelineMarker {
  seq: number;
  label: string;
  kind: 'script' | 'confirmed' | 'attempted' | 'quota' | 'posture';
}

interface TimelineScrubberProps {
  markers: TimelineMarker[];
  currentSeq: number;
  minSeq: number;
  maxSeq: number;
  onChangeSeq: (seq: number) => void;
  onJumpLatest: () => void;
  live?: boolean;
}

const MARKER_COLORS = {
  script: 'bg-purple-500',
  confirmed: 'bg-red-500',
  attempted: 'bg-orange-500',
  quota: 'bg-yellow-500',
  posture: 'bg-pink-500',
};

/**
 * TimelineScrubber - Center timeline with markers
 * Shows temporal progression of exploits and scripts
 */
export function TimelineScrubber({
  markers,
  currentSeq,
  minSeq,
  maxSeq,
  onChangeSeq,
  onJumpLatest,
  live = false,
}: TimelineScrubberProps) {
  const range = maxSeq - minSeq || 1;

  const getPosition = (seq: number): number => {
    return ((seq - minSeq) / range) * 100;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChangeSeq(value);
  };

  return (
    <div className="flex flex-col h-full bg-white border-x border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Timeline</h3>
          {live && (
            <button
              onClick={onJumpLatest}
              className="px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              ↓ Jump to latest
            </button>
          )}
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4">
        {/* Markers */}
        <div className="relative h-24 mb-4">
          {/* Timeline bar */}
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 rounded" />

          {/* Marker dots */}
          {markers.map((marker, idx) => {
            const position = getPosition(marker.seq);
            const color = MARKER_COLORS[marker.kind] || 'bg-gray-500';

            return (
              <div
                key={`${marker.seq}-${idx}`}
                className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${position}%` }}
                title={marker.label}
              >
                <div className={`w-3 h-3 rounded-full ${color} cursor-pointer hover:scale-125 transition-transform`} />
                <div className="absolute top-full mt-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {marker.label}
                  <div className="text-gray-400">seq {marker.seq}</div>
                </div>
              </div>
            );
          })}

          {/* Current position indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-600 transform -translate-x-1/2"
            style={{ left: `${getPosition(currentSeq)}%` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow" />
          </div>
        </div>

        {/* Slider */}
        <div className="mt-2">
          <input
            type="range"
            min={minSeq}
            max={maxSeq}
            value={currentSeq}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Seq indicator */}
        <div className="text-center mt-3 text-sm text-gray-600">
          <span className="font-mono">seq {currentSeq}</span>
          <span className="text-gray-400 mx-2">of</span>
          <span className="font-mono">{maxSeq}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MARKER_COLORS).map(([kind, color]) => (
            <div key={kind} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-gray-600 capitalize">{kind}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
