// app/api/autodarts/throw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autodartsBus } from '@/lib/services/autodartsBus';
import { autodartsPayloadToDart, getSegmentCenterCoordinates } from '@/lib/engines/autodartsTranslator';
import { AutodartsEvent, AutodartsThrowPayload, DEFAULT_AUTODARTS_BOARD_ID } from '@/types/autodarts';

export const dynamic = 'force-dynamic';

async function broadcastToSupabase(
  boardId: string,
  event: AutodartsEvent
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: 'Supabase env not configured' };
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `autodarts-board:${boardId}`,
            event: 'autodarts',
            payload: event,
            private: false,
          },
        ],
      }),
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      return { ok: true, status: res.status };
    }

    const errText = await res.text().catch(() => '');
    console.warn('Supabase REST broadcast failed:', res.status, errText);

    // Fallback to supabase-js httpSend
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const channel = client.channel(`autodarts-board:${boardId}`);
    try {
      await channel.httpSend('autodarts', event, { timeout: 1500 });
      return { ok: true, status: 202 };
    } catch (fallbackErr: unknown) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : '';
      return {
        ok: false,
        status: res.status,
        error: fallbackMessage || errText || `HTTP ${res.status}`,
      };
    } finally {
      await client.removeChannel(channel).catch(() => {});
    }
  } catch (err: unknown) {
    console.warn('Supabase Realtime broadcast exception:', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Broadcast request failed',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Optional Pre-Shared Secret Authentication
    const configuredSecret = process.env.AUTODARTS_WEBHOOK_SECRET;
    if (configuredSecret) {
      const authHeader =
        req.headers.get('x-autodarts-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (authHeader !== configuredSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Autodarts secret' }, { status: 401 });
      }
    }

    const body = await req.json();
    const boardId = String(body.boardId || DEFAULT_AUTODARTS_BOARD_ID);
    const eventId = String(body.eventId || crypto.randomUUID());

    // 2. Handle Takeout / Next Turn Event
    if (body.type === 'TAKEOUT' || body.isTakeout === true || body.event === 'TAKEOUT') {
      const takeoutEvent: AutodartsEvent = {
        type: 'TAKEOUT',
        eventId,
        boardId,
        matchId: body.matchId,
        playerIndex: body.playerIndex,
        timestamp: Date.now(),
      };
      autodartsBus.dispatch(takeoutEvent, boardId);
      const realtime = await broadcastToSupabase(boardId, takeoutEvent);
      return NextResponse.json({ ok: true, event: takeoutEvent, realtime });
    }

    // 3. Handle Reset / Undo Event
    if (body.type === 'RESET' || body.type === 'UNDO' || body.event === 'RESET') {
      const resetEvent: AutodartsEvent = {
        type: body.type === 'UNDO' ? 'UNDO' : 'RESET',
        eventId,
        boardId,
        matchId: body.matchId,
        timestamp: Date.now(),
      };
      autodartsBus.dispatch(resetEvent, boardId);
      const realtime = await broadcastToSupabase(boardId, resetEvent);
      return NextResponse.json({ ok: true, event: resetEvent, realtime });
    }

    // 4. Handle Standard Dart Throw Event (accepts segment, segmentName, or bed)
    const rawSegment =
      body.segment ||
      body.segmentName ||
      body.bed ||
      (body.score !== undefined
        ? `${body.multiplier > 1 ? (body.multiplier === 3 ? 'T' : 'D') : 'S'}${body.score}`
        : 'MISS');

    const dart = autodartsPayloadToDart({
      segment: String(rawSegment),
      score: body.score,
      multiplier: body.multiplier,
    });

    const coords =
      body.coords && typeof body.coords.x === 'number' && typeof body.coords.y === 'number'
        ? body.coords
        : getSegmentCenterCoordinates(dart.raw);

    const dartIndex =
      body.dartIndex === 1 || body.dartIndex === 2 || body.dartIndex === 3 ? body.dartIndex : 1;

    const throwPayload: AutodartsThrowPayload = {
      type: 'THROW',
      eventId,
      boardId,
      matchId: body.matchId,
      dartIndex,
      segment: dart.raw,
      score: dart.score,
      multiplier: dart.multiplier as 0 | 1 | 2 | 3,
      points: dart.score * dart.multiplier,
      coords,
      timestamp: Date.now(),
    };

    const fullEvent: AutodartsEvent = {
      ...throwPayload,
      type: 'THROW',
    };

    autodartsBus.dispatch(fullEvent, boardId);
    const realtime = await broadcastToSupabase(boardId, fullEvent);

    return NextResponse.json({
      ok: true,
      dart,
      event: fullEvent,
      realtime,
    });
  } catch (error: unknown) {
    console.error('Failed to process Autodarts webhook throw:', error);
    return NextResponse.json(
      {
        error: 'Invalid throw payload',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}
