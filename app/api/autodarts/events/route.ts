// app/api/autodarts/events/route.ts
import { NextRequest } from 'next/server';
import { autodartsBus } from '@/lib/services/autodartsBus';
import { AutodartsEvent } from '@/types/autodarts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      const initPacket = JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() });
      controller.enqueue(encoder.encode(`data: ${initPacket}\n\n`));

      // Subscribe to all incoming Autodarts events
      const unsubscribe = autodartsBus.subscribe((event: AutodartsEvent) => {
        try {
          const payload = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // If controller is closed, ignore
        }
      });

      // Send periodic heartbeat every 15s to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
      });
    },
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
