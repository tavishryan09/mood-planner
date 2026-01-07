import Pusher from 'pusher';

// Initialize Pusher server instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Broadcast planning updates
export async function broadcastPlanningUpdate(update: {
  type: 'task' | 'milestone';
  action: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
}) {
  try {
    await pusherServer.trigger('planning', 'update', {
      ...update,
      timestamp: new Date().toISOString(),
    });
    console.log(`[Pusher] Broadcasted ${update.type}:${update.action}`);
  } catch (error) {
    console.error('[Pusher] Error broadcasting update:', error);
  }
}
