import { NextRequest } from 'next/server';
import { planningEvents } from '@/lib/planning-events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Event handler for planning updates
      const handleUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          // Connection might be closed
          console.error('Error sending SSE message:', error);
        }
      };

      // Subscribe to planning updates
      planningEvents.on('planning-update', handleUpdate);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        planningEvents.off('planning-update', handleUpdate);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for Nginx
    },
  });
}
