// lib/hooks/useAutodarts.ts
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Dart } from '@/types/schema';
import { AutodartsEvent, AutodartsThrowPayload } from '@/types/autodarts';
import { autodartsPayloadToDart } from '@/lib/engines/autodartsTranslator';

interface UseAutodartsOptions {
  enabled?: boolean;
  matchId?: string;
  onThrow?: (dart: Dart, payload: AutodartsThrowPayload) => void;
  onTakeout?: () => void;
  onReset?: () => void;
}

export function useAutodarts(options: UseAutodartsOptions = {}) {
  const { enabled = true, matchId, onThrow, onTakeout, onReset } = options;

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastThrow, setLastThrow] = useState<Dart | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // Store latest callbacks in refs to prevent reconnecting SSE on handler updates
  const onThrowRef = useRef(onThrow);
  const onTakeoutRef = useRef(onTakeout);
  const onResetRef = useRef(onReset);
  const matchIdRef = useRef(matchId);

  useEffect(() => {
    onThrowRef.current = onThrow;
    onTakeoutRef.current = onTakeout;
    onResetRef.current = onReset;
    matchIdRef.current = matchId;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      try {
        eventSource = new EventSource('/api/autodarts/events');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (!event.data) return;
          try {
            const data: AutodartsEvent | { type: 'CONNECTED' } = JSON.parse(event.data);

            if (data.type === 'CONNECTED') {
              setIsConnected(true);
              return;
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
          } catch (err) {
            console.error('Failed to parse incoming Autodarts event:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          // Attempt reconnection after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('EventSource initialization error:', err);
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSource?.close();
      setIsConnected(false);
    };
  }, [enabled]);

  // Client-side testing helper to fire simulated throws into the pipeline
  const simulateThrow = useCallback(
    async (segment: string, dartIndex: 1 | 2 | 3 = 1) => {
      try {
        const res = await fetch('/api/autodarts/throw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
    []
  );

  const simulateTakeout = useCallback(async () => {
    try {
      const res = await fetch('/api/autodarts/throw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TAKEOUT',
          matchId: matchIdRef.current,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('Simulate takeout failed:', err);
    }
  }, []);

  return {
    isConnected,
    lastThrow,
    lastEventTime,
    activeBoardId,
    simulateThrow,
    simulateTakeout,
  };
}
