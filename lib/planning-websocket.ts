import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface PlanningUpdate {
  type: 'task' | 'milestone';
  action: 'created' | 'updated' | 'deleted';
  taskId?: number;
  milestoneId?: number;
  task?: any;
  milestone?: any;
  timestamp: string;
}

class PlanningWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    if (this.wss) {
      console.log('[Planning WS] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({
      noServer: true,
      path: '/api/planning/ws'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[Planning WS] New client connected. Total:', this.clients.size + 1);
      this.clients.add(ws);

      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      }));

      // Set up ping/pong for keepalive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000); // Ping every 30 seconds

      ws.on('pong', () => {
        // Client responded to ping, connection is alive
      });

      ws.on('close', () => {
        console.log('[Planning WS] Client disconnected. Remaining:', this.clients.size - 1);
        clearInterval(pingInterval);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[Planning WS] Client error:', error);
        clearInterval(pingInterval);
        this.clients.delete(ws);
      });
    });

    console.log('[Planning WS] WebSocket server initialized');
  }

  handleUpgrade(request: any, socket: any, head: any) {
    if (!this.wss) {
      console.error('[Planning WS] WebSocket server not initialized');
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss!.emit('connection', ws, request);
    });
  }

  broadcastTaskUpdate(type: 'created' | 'updated' | 'deleted', taskId: number, task?: any) {
    const update: PlanningUpdate = {
      type: 'task',
      action: type,
      taskId,
      task,
      timestamp: new Date().toISOString()
    };

    this.broadcast(update);
  }

  broadcastMilestoneUpdate(type: 'created' | 'updated' | 'deleted', milestoneId: number, milestone?: any) {
    const update: PlanningUpdate = {
      type: 'milestone',
      action: type,
      milestoneId,
      milestone,
      timestamp: new Date().toISOString()
    };

    this.broadcast(update);
  }

  private broadcast(update: PlanningUpdate) {
    const message = JSON.stringify(update);
    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          successCount++;
        } catch (error) {
          console.error('[Planning WS] Error sending to client:', error);
          failCount++;
        }
      }
    });

    console.log(`[Planning WS] Broadcast ${update.type}:${update.action} to ${successCount} clients (${failCount} failed)`);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Export singleton instance
export const planningWebSocket = new PlanningWebSocketManager();
