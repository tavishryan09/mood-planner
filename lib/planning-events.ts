import { EventEmitter } from 'events';

// Create a single instance of EventEmitter for planning updates
class PlanningEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many concurrent SSE connections
  }

  broadcastTaskUpdate(type: 'created' | 'updated' | 'deleted', taskId: number, task?: any) {
    this.emit('planning-update', {
      type: 'task',
      action: type,
      taskId,
      task,
      timestamp: new Date().toISOString()
    });
  }

  broadcastMilestoneUpdate(type: 'created' | 'updated' | 'deleted', milestoneId: number, milestone?: any) {
    this.emit('planning-update', {
      type: 'milestone',
      action: type,
      milestoneId,
      milestone,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const planningEvents = new PlanningEventEmitter();
