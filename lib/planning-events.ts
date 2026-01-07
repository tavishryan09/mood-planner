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
    this.emit('planning-update', event);
  }
}

// Export singleton instance
export const planningEvents = new PlanningEventEmitter();
