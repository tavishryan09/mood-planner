import { useEffect, useRef, useState } from 'react';

interface PlanningUpdate {
  type: 'task' | 'milestone' | 'connected';
  action?: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
  timestamp: string;
}

interface UsePlanningWebSocketOptions {
  enabled?: boolean;
  onUpdate?: (update: PlanningUpdate) => void;
}

export function usePlanningWebSocket({ enabled = true, onUpdate }: UsePlanningWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined' || !enabled || !onUpdate) {
      return;
    }

    const connect = () => {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      try {
        // Determine WebSocket protocol based on current page protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/planning/ws`;

        console.log('[Planning WS] Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Planning WS] Connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const update: PlanningUpdate = JSON.parse(event.data);
            onUpdate(update);
          } catch (error) {
            console.error('[Planning WS] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[Planning WS] Connection error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('[Planning WS] Connection closed');
          setIsConnected(false);
          wsRef.current = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(
              baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
              30000 // Max 30 seconds
            );

            console.log(`[Planning WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            console.error('[Planning WS] Max reconnection attempts reached. Please refresh the page.');
          }
        };
      } catch (error) {
        console.error('[Planning WS] Error creating WebSocket:', error);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, onUpdate]);

  return {
    isConnected
  };
}
