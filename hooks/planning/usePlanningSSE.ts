import { useEffect, useRef } from 'react';

interface PlanningUpdate {
  type: 'task' | 'milestone' | 'connected';
  action?: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
  timestamp: string;
}

interface UsePlanningSSEOptions {
  enabled?: boolean;
  onUpdate?: (update: PlanningUpdate) => void;
}

export function usePlanningSSE({ enabled = true, onUpdate }: UsePlanningSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  useEffect(() => {
    if (!enabled || !onUpdate) {
      return;
    }

    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const eventSource = new EventSource('/api/planning/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE connection established');
          reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const update: PlanningUpdate = JSON.parse(event.data);
            onUpdate(update);
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          eventSource.close();
          eventSourceRef.current = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(
              baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
              30000 // Max 30 seconds
            );

            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            console.error('Max reconnection attempts reached. Please refresh the page.');
          }
        };
      } catch (error) {
        console.error('Error creating EventSource:', error);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, onUpdate]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  };
}
