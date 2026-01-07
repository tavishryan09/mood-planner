import { useEffect, useRef } from 'react';

interface PlanningUpdate {
  tasks: any[];
  milestones: any[];
  timestamp: string;
}

interface UsePlanningPollingOptions {
  enabled?: boolean;
  onUpdate?: (update: PlanningUpdate) => void;
  interval?: number; // Polling interval in milliseconds
}

export function usePlanningPolling({
  enabled = true,
  onUpdate,
  interval = 5000 // Poll every 5 seconds by default
}: UsePlanningPollingOptions) {
  const lastUpdateRef = useRef<string>(new Date().toISOString());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !onUpdate) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/planning/updates?since=${encodeURIComponent(lastUpdateRef.current)}`);

        if (!response.ok) {
          console.error('[Planning Poll] Error fetching updates:', response.statusText);
          return;
        }

        const data: PlanningUpdate = await response.json();

        // If there are updates, notify the callback
        if (data.tasks.length > 0 || data.milestones.length > 0) {
          console.log(`[Planning Poll] Received ${data.tasks.length} task updates and ${data.milestones.length} milestone updates`);
          onUpdate(data);
        }

        // Update the last update timestamp
        if (data.timestamp) {
          lastUpdateRef.current = data.timestamp;
        }
      } catch (error) {
        console.error('[Planning Poll] Error:', error);
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(poll, interval);

    // Initial poll
    poll();

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, onUpdate, interval]);

  return {
    isConnected: enabled
  };
}
