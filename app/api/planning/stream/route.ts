import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Store for broadcasting (works within single edge function instance)
const subscribers = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      subscribers.add(controller);
      console.log(`[SSE] New subscriber. Total: ${subscribers.size}`);

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Send heartbeat every 15 seconds (Vercel has 25s timeout for edge functions)
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
          subscribers.delete(controller);
        }
      }, 15000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        subscribers.delete(controller);
        console.log(`[SSE] Subscriber disconnected. Remaining: ${subscribers.size}`);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Broadcast function to be called from planning events
export function broadcastToSubscribers(update: any) {
  const message = `data: ${JSON.stringify(update)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  subscribers.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (error) {
      subscribers.delete(controller);
    }
  });

  console.log(`[SSE] Broadcasted ${update.type}:${update.action} to ${subscribers.size} subscribers`);
}
