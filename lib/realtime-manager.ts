// Unified realtime manager that works in both dev and production

interface RealtimeUpdate {
  type: 'task' | 'milestone';
  action: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
  timestamp: string;
}

class RealtimeManager {
  private subscribers: Set<(update: RealtimeUpdate) => void> = new Set();

  subscribe(callback: (update: RealtimeUpdate) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  broadcastTaskUpdate(type: 'created' | 'updated' | 'deleted', taskId: number, task?: any) {
    const update: RealtimeUpdate = {
      type: 'task',
      action: type,
      taskId,
      task,
      timestamp: new Date().toISOString()
    };
    this.broadcast(update);
  }

  broadcastMilestoneUpdate(type: 'created' | 'updated' | 'deleted', milestoneId: number, milestone?: any) {
    const update: RealtimeUpdate = {
      type: 'milestone',
      action: type,
      milestoneId,
      milestone,
      timestamp: new Date().toISOString()
    };
    this.broadcast(update);
  }

  private broadcast(update: RealtimeUpdate) {
    console.log(`[Realtime] Broadcasting ${update.type}:${update.action} to ${this.subscribers.size} subscribers`);
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('[Realtime] Error in subscriber callback:', error);
      }
    });
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

// Use global to preserve singleton across hot reloads in development
const globalForRealtime = global as typeof globalThis & {
  realtimeManager?: RealtimeManager;
};

export const realtimeManager = globalForRealtime.realtimeManager ?? new RealtimeManager();

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeManager = realtimeManager;
}
