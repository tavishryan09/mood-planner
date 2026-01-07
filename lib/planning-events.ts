import { broadcastPlanningUpdate } from './pusher-server';

// Planning events broadcaster using Pusher
export const planningEvents = {
  broadcastTaskUpdate: async (type: 'created' | 'updated' | 'deleted', taskId: number, task?: any) => {
    await broadcastPlanningUpdate({
      type: 'task',
      action: type,
      taskId,
      task,
    });
  },

  broadcastMilestoneUpdate: async (type: 'created' | 'updated' | 'deleted', milestoneId: number, milestone?: any) => {
    await broadcastPlanningUpdate({
      type: 'milestone',
      action: type,
      milestoneId,
      milestone,
    });
  },
};
