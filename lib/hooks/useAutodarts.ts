// lib/hooks/useAutodarts.ts
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Dart } from '@/types/schema';
import {
  AutodartsEvent,
  AutodartsThrowPayload,
  DEFAULT_AUTODARTS_BOARD_ID,
} from '@/types/autodarts';
import { autodartsPayloadToDart } from '@/lib/engines/autodartsTranslator';
import { supabase } from '@/lib/supabase';

interface UseAutodartsOptions {
  enabled?: boolean;
  boardId?: string;
  matchId?: string;
  onThrow?: (dart: Dart, payload: AutodartsThrowPayload) => void;
  onTakeout?: () => void;
  onReset?: () => void;
}

export function useAutodarts(options: UseAutodartsOptions = {}) {
  const {
    enabled = true,
    boardId = DEFAULT_AUTODARTS_BOARD_ID,
    matchId,
    onThrow,
    onTakeout,
    onReset,
  } = options;

  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [lastThrow, setLastThrow] = useState<Dart | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string>(boardId);

  const isConnected = sseConnected || realtimeConnected;

  // Store latest callbacks in refs to prevent reconnecting transports on handler updates
  const onThrowRef = useRef(onThrow);
  const onTakeoutRef = useRef(onTakeout);
  const onResetRef = useRef(onReset);
  const matchIdRef = useRef(matchId);
  const seenEventsRef = useRef<string[]>([]);

  useEffect(() => {
    onThrowRef.current = onThrow;
    onTakeoutRef.current = onTakeout;
    onResetRef.current = onReset;
    matchIdRef.current = matchId;
  });

  const handleIncomingEvent = useCallback((data: AutodartsEvent | { type: 'CONNECTED' }) => {
    if (data.type === 'CONNECTED') {
      setSseConnected(true);
      return;
    }

    // Deduplicate across SSE and Supabase Realtime dual-transport
    if ('eventId' in data && data.eventId) {
      if (seenEventsRef.current.includes(data.eventId)) {
        return;
      }
      seenEventsRef.current = [...seenEventsRef.current.slice(-49), data.eventId];
    }

    // Filter by matchId if specific match was passed in options and in payload
    if (
      matchIdRef.current &&
      'matchId' in data &&
      data.matchId &&
      data.matchId !== matchIdRef.current
    ) {
      return;
    }

    setLastEventTime(Date.now());
    if ('boardId' in data && data.boardId) {
      setActiveBoardId(data.boardId);
    }

    if (data.type === 'THROW') {
      const dart = autodartsPayloadToDart(data);
      setLastThrow(dart);
      onThrowRef.current?.(dart, data);
    } else if (data.type === 'TAKEOUT') {
      onTakeoutRef.current?.();
    } else if (data.type === 'RESET' || data.type === 'UNDO') {
      onResetRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isDisposed = false;

    function connectSSE() {
      if (isDisposed) return;
      try {
        eventSource = new EventSource('/api/autodarts/events');

        eventSource.onopen = () => {
          if (!isDisposed) setSseConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (!event.data || isDisposed) return;
          try {
            const data: AutodartsEvent | { type: 'CONNECTED' } = JSON.parse(event.data);
            handleIncomingEvent(data);
          } catch (err) {
            console.error('Failed to parse incoming Autodarts SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          if (isDisposed) return;
          setSseConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.error('EventSource initialization error:', err);
        setSseConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      }
    }

    connectSSE();

    // Also subscribe to Supabase Realtime Broadcast for Vercel serverless multi-instance delivery
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (hasSupabase) {
      realtimeChannel = supabase
        .channel(`autodarts-board:${boardId}`)
        .on('broadcast', { event: 'autodarts' }, ({ payload }) => {
          if (!isDisposed && payload) {
            handleIncomingEvent(payload as AutodartsEvent);
          }
        })
        .subscribe((status) => {
          if (!isDisposed) {
            setRealtimeConnected(status === 'SUBSCRIBED');
          }
        });
    }

    return () => {
      isDisposed = true;
      clearTimeout(reconnectTimeout);
      eventSource?.close();
      setSseConnected(false);
      setRealtimeConnected(false);
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel).catch(() => {});
      }
    };
  }, [enabled, boardId, handleIncomingEvent]);

  // Client-side testing helper to fire simulated throws into the pipeline
  const simulateThrow = useCallback(
    async (segment: string, dartIndex: 1 | 2 | 3 = 1) => {
      try {
        const res = await fetch('/api/autodarts/throw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId,
            segment,
            dartIndex,
            matchId: matchIdRef.current,
          }),
        });
        return await res.json();
      } catch (err) {
        console.error('Simulate throw failed:', err);
      }
    },
    [boardId]
  );

  const simulateTakeout = useCallback(async () => {
    try {
      const res = await fetch('/api/autodarts/throw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TAKEOUT',
          boardId,
          matchId: matchIdRef.current,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('Simulate takeout failed:', err);
    }
  }, [boardId]);

  return {
    isConnected,
    lastThrow,
    lastEventTime,
    activeBoardId,
    simulateThrow,
    simulateTakeout,
  };
}
