import { EventEmitter } from 'events';

// Create a single instance of EventEmitter for planning updates
class PlanningEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent SSE connections
  }

  broadcastTaskUpdate(type: 'created' | 'updated' | 'deleted', taskId: number, task?: any) {
    const event = {
      type: 'task',
      action: type,
      taskId,
      task,
      timestamp: new Date().toISOString()
    };
    console.log('[PlanningEvents] Broadcasting task update:', event);
    console.log('[PlanningEvents] Current listeners:', this.listenerCount('planning-update'));
    this.emit('planning-update', event);
  }

  broadcastMilestoneUpdate(type: 'created' | 'updated' | 'deleted', milestoneId: number, milestone?: any) {
    const event = {
      type: 'milestone',
      action: type,
      milestoneId,
      milestone,
      timestamp: new Date().toISOString()
    };
    console.log('[PlanningEvents] Broadcasting milestone update:', event);
    console.log('[PlanningEvents] Current listeners:', this.listenerCount('planning-update'));
    this.emit('planning-update', event);
  }
}

// Use global to preserve singleton across hot reloads in development
const globalForPlanningEvents = global as typeof globalThis & {
  planningEventsInstance?: PlanningEventEmitter;
};

// Export singleton instance - preserved across hot reloads
export const planningEvents = globalForPlanningEvents.planningEventsInstance ?? new PlanningEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForPlanningEvents.planningEventsInstance = planningEvents;
}
