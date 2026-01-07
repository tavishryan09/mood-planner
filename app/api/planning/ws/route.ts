import { NextRequest } from 'next/server';

export const runtime = 'edge';

// In-memory storage for WebSocket connections (per edge function instance)
const connections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgradeHeader = request.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // For Edge Runtime, we'll use Server-Sent Events as a fallback
  // since true WebSockets aren't supported in Vercel Edge
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      connections.add(controller);

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
          connections.delete(controller);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        connections.delete(controller);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

// Export function to broadcast updates (will be called by planning events)
export function broadcastUpdate(update: any) {
  const message = `data: ${JSON.stringify(update)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  connections.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      connections.delete(controller);
    }
  });
}
