import { useEffect, useRef, useState } from 'react';

interface RunStreamEvent {
  type: 'run.status' | 'story.step.created' | 'finding.created' | 'quota.warning' | 'event' | 'connected';
  data: any;
}

interface UseRunStreamOptions {
  onRunStatus?: (status: string) => void;
  onStoryStep?: (step: any) => void;
  onFinding?: (finding: any) => void;
  onQuotaWarning?: (warning: any) => void;
  onEvent?: (event: any) => void; // For real-time event feed (optional)
  onError?: (error: Error) => void;
}

interface UseRunStreamResult {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  disconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export function useRunStream(
  runId: string | null,
  options: UseRunStreamOptions = {}
): UseRunStreamResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);

  // Calculate exponential backoff delay
  const getReconnectDelay = () => {
    const delay = Math.min(
      reconnectDelayRef.current * 2,
      MAX_RECONNECT_DELAY
    );
    reconnectDelayRef.current = delay;
    return delay;
  };

  // Reset reconnect state
  const resetReconnect = () => {
    reconnectAttemptRef.current = 0;
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
  };

  // Connect to SSE stream
  const connect = () => {
    if (!runId) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource
      const eventSource = new EventSource(`/api/runs/${runId}/stream`);
      eventSourceRef.current = eventSource;

      // Handle open
      eventSource.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);
        resetReconnect();
      };

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const parsed: RunStreamEvent = JSON.parse(event.data);

          switch (parsed.type) {
            case 'connected':
              // Initial connection message, ignore or log
              console.log('SSE connected:', parsed);
              break;
            case 'run.status':
              options.onRunStatus?.(parsed.data);
              break;
            case 'story.step.created':
              options.onStoryStep?.(parsed.data);
              break;
            case 'finding.created':
              options.onFinding?.(parsed.data);
              break;
            case 'quota.warning':
              options.onQuotaWarning?.(parsed.data);
              break;
            case 'event':
              // Optional real-time event feed
              options.onEvent?.(parsed.data);
              break;
            default:
              console.warn('Unknown SSE event type:', parsed.type);
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      // Handle errors
      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setIsConnected(false);

        // Don't reconnect if we've hit the max attempts
        if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Connection lost. Maximum reconnect attempts reached.');
          setIsReconnecting(false);
          eventSource.close();
          options.onError?.(new Error('Max reconnect attempts reached'));
          return;
        }

        // Attempt to reconnect with exponential backoff
        setIsReconnecting(true);
        reconnectAttemptRef.current += 1;

        const delay = getReconnectDelay();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      options.onError?.(err instanceof Error ? err : new Error('Failed to connect'));
    }
  };

  // Disconnect from SSE stream
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setIsReconnecting(false);
    resetReconnect();
  };

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (runId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return {
    isConnected,
    isReconnecting,
    error,
    disconnect,
  };
}
