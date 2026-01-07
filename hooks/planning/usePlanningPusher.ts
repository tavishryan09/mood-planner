import { useEffect, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';

interface PlanningUpdate {
  type: 'task' | 'milestone' | 'connected';
  action?: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
  timestamp: string;
}

interface UsePlanningPusherOptions {
  enabled?: boolean;
  onUpdate?: (update: PlanningUpdate) => void;
}

export function usePlanningPusher({ enabled = true, onUpdate }: UsePlanningPusherOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !onUpdate) {
      return;
    }

    // Only run on client-side
    if (typeof window === 'undefined') {
      return;
    }

    const pusher = getPusherClient();

    // Subscribe to planning channel
    const channel = pusher.subscribe('planning');

    // Handle connection state
    pusher.connection.bind('connected', () => {
      console.log('[Pusher] Connected');
      setIsConnected(true);
      onUpdate({
        type: 'connected',
        timestamp: new Date().toISOString(),
      });
    });

    pusher.connection.bind('disconnected', () => {
      console.log('[Pusher] Disconnected');
      setIsConnected(false);
    });

    pusher.connection.bind('error', (error: any) => {
      console.error('[Pusher] Connection error:', error);
      setIsConnected(false);
    });

    // Listen for planning updates
    channel.bind('update', (data: PlanningUpdate) => {
      console.log('[Pusher] Received update:', data.type, data.action);
      onUpdate(data);
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('planning');
    };
  }, [enabled, onUpdate]);

  return {
    isConnected,
  };
}
