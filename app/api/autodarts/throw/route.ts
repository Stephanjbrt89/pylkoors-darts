// app/api/autodarts/throw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { autodartsBus } from '@/lib/services/autodartsBus';
import { autodartsPayloadToDart, getSegmentCenterCoordinates } from '@/lib/engines/autodartsTranslator';
import { AutodartsEvent, AutodartsThrowPayload } from '@/types/autodarts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Optional Pre-Shared Secret Authentication
    const configuredSecret = process.env.AUTODARTS_WEBHOOK_SECRET;
    if (configuredSecret) {
      const authHeader = req.headers.get('x-autodarts-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (authHeader !== configuredSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid Autodarts secret' }, { status: 401 });
      }
    }

    const body = await req.json();

    // 2. Handle Takeout / Next Turn Event
    if (body.type === 'TAKEOUT' || body.isTakeout === true || body.event === 'TAKEOUT') {
      const takeoutEvent: AutodartsEvent = {
        type: 'TAKEOUT',
        boardId: body.boardId || 'pi-board-1',
        matchId: body.matchId,
        playerIndex: body.playerIndex,
        timestamp: Date.now(),
      };
      autodartsBus.dispatch(takeoutEvent, body.boardId);
      return NextResponse.json({ ok: true, event: takeoutEvent });
    }

    // 3. Handle Reset / Undo Event
    if (body.type === 'RESET' || body.type === 'UNDO' || body.event === 'RESET') {
      const resetEvent: AutodartsEvent = {
        type: 'RESET',
        boardId: body.boardId || 'pi-board-1',
        matchId: body.matchId,
        timestamp: Date.now(),
      };
      autodartsBus.dispatch(resetEvent, body.boardId);
      return NextResponse.json({ ok: true, event: resetEvent });
    }

    // 4. Handle Standard Dart Throw Event
    const segment = body.segment || body.bed || (body.score !== undefined ? `${body.multiplier > 1 ? (body.multiplier === 3 ? 'T' : 'D') : 'S'}${body.score}` : 'MISS');
    const dart = autodartsPayloadToDart({
      segment: String(segment),
      score: body.score,
      multiplier: body.multiplier,
    });

    const coords = body.coords && typeof body.coords.x === 'number' && typeof body.coords.y === 'number'
      ? body.coords
      : getSegmentCenterCoordinates(dart.raw);

    const dartIndex = (body.dartIndex === 1 || body.dartIndex === 2 || body.dartIndex === 3) 
      ? body.dartIndex 
      : 1;

    const throwPayload: AutodartsThrowPayload = {
      type: 'THROW',
      boardId: body.boardId || 'pi-board-1',
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

    autodartsBus.dispatch(fullEvent, body.boardId);

    return NextResponse.json({
      ok: true,
      dart,
      event: fullEvent,
    });
  } catch (error: any) {
    console.error('Failed to process Autodarts webhook throw:', error);
    return NextResponse.json(
      { error: 'Invalid throw payload', details: error?.message },
      { status: 400 }
    );
  }
}
