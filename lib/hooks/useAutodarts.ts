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

interface ManagerState {
  sseConnected: boolean;
  realtimeConnected: boolean;
  realtimeStatus: string;
  lastError: string | null;
}

type Subscriber = {
  onEvent: (event: AutodartsEvent) => void;
  onState: (state: ManagerState) => void;
};

interface BoardManager {
  boardId: string;
  subscribers: Set<Subscriber>;
  seenEvents: string[];
  state: ManagerState;
  eventSource: EventSource | null;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  realtimeChannel: ReturnType<typeof supabase.channel> | null;
  teardownTimeout: ReturnType<typeof setTimeout> | null;
  emit: (event: AutodartsEvent) => void;
  destroy: () => void;
}

const boardManagers = new Map<string, BoardManager>();

function getOrCreateBoardManager(boardId: string): BoardManager {
  const existing = boardManagers.get(boardId);
  if (existing) {
    if (existing.teardownTimeout) {
      clearTimeout(existing.teardownTimeout);
      existing.teardownTimeout = null;
    }
    return existing;
  }

  const manager: BoardManager = {
    boardId,
    subscribers: new Set(),
    seenEvents: [],
    state: {
      sseConnected: false,
      realtimeConnected: false,
      realtimeStatus: 'CONNECTING',
      lastError: null,
    },
    eventSource: null,
    reconnectTimeout: null,
    realtimeChannel: null,
    teardownTimeout: null,
    emit(data: AutodartsEvent) {
      if ('eventId' in data && data.eventId) {
        if (manager.seenEvents.includes(data.eventId)) return;
        manager.seenEvents = [...manager.seenEvents.slice(-99), data.eventId];
      }
      manager.subscribers.forEach((sub) => {
        try {
          sub.onEvent(data);
        } catch (err) {
          console.error('Autodarts subscriber error:', err);
        }
      });
    },
    destroy() {
      if (manager.reconnectTimeout) clearTimeout(manager.reconnectTimeout);
      if (manager.eventSource) {
        manager.eventSource.close();
        manager.eventSource = null;
      }
      if (manager.realtimeChannel) {
        supabase.removeChannel(manager.realtimeChannel).catch(() => {});
        manager.realtimeChannel = null;
      }
      boardManagers.delete(boardId);
    },
  };

  const notifyState = (patch: Partial<ManagerState>) => {
    manager.state = { ...manager.state, ...patch };
    manager.subscribers.forEach((sub) => sub.onState(manager.state));
  };

  function connectSSE() {
    if (!boardManagers.has(boardId)) return;
    try {
      const es = new EventSource('/api/autodarts/events');
      manager.eventSource = es;

      es.onopen = () => notifyState({ sseConnected: true });

      es.onmessage = (msg) => {
        if (!msg.data) return;
        try {
          const data: AutodartsEvent | { type: 'CONNECTED' } = JSON.parse(msg.data);
          if (data.type === 'CONNECTED') {
            notifyState({ sseConnected: true });
            return;
          }
          manager.emit(data);
        } catch (err) {
          console.error('Failed to parse Autodarts SSE event:', err);
        }
      };

      es.onerror = () => {
        notifyState({ sseConnected: false });
        es.close();
        if (boardManagers.has(boardId)) {
          manager.reconnectTimeout = setTimeout(connectSSE, 3000);
        }
      };
    } catch {
      notifyState({ sseConnected: false });
      manager.reconnectTimeout = setTimeout(connectSSE, 3000);
    }
  }

  connectSSE();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const channel = supabase
      .channel(`autodarts-board:${boardId}`, {
        config: { broadcast: { self: true } },
      })
      .on('broadcast', { event: 'autodarts' }, ({ payload }) => {
        if (payload) {
          manager.emit(payload as AutodartsEvent);
        }
      })
      .subscribe((status, err) => {
        notifyState({
          realtimeConnected: status === 'SUBSCRIBED',
          realtimeStatus: status,
          lastError: err ? err.message : status === 'SUBSCRIBED' ? null : manager.state.lastError,
        });
      });

    manager.realtimeChannel = channel;
  } else {
    notifyState({
      realtimeConnected: false,
      realtimeStatus: 'UNCONFIGURED',
    });
  }

  boardManagers.set(boardId, manager);
  return manager;
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

  const [transportState, setTransportState] = useState<ManagerState>({
    sseConnected: false,
    realtimeConnected: false,
    realtimeStatus: 'CONNECTING',
    lastError: null,
  });
  const [lastThrow, setLastThrow] = useState<Dart | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string>(boardId);

  const isConnected = transportState.realtimeConnected || transportState.sseConnected;

  // Store latest callbacks in refs to avoid resubscribing on state renders
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

    let cancelled = false;
    const manager = getOrCreateBoardManager(boardId);

    const subscriber: Subscriber = {
      onState: (next) => {
        if (!cancelled) setTransportState(next);
      },
      onEvent: (data) => {
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
      },
    };

    manager.subscribers.add(subscriber);
    queueMicrotask(() => {
      if (!cancelled) setTransportState(manager.state);
    });

    return () => {
      cancelled = true;
      manager.subscribers.delete(subscriber);
      if (manager.subscribers.size === 0) {
        manager.teardownTimeout = setTimeout(() => {
          if (manager.subscribers.size === 0) {
            manager.destroy();
          }
        }, 1500);
      }
    };
  }, [enabled, boardId]);

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
        const json = await res.json();
        if (json?.event) {
          boardManagers.get(boardId)?.emit(json.event as AutodartsEvent);
        }
        return json;
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
      const json = await res.json();
      if (json?.event) {
        boardManagers.get(boardId)?.emit(json.event as AutodartsEvent);
      }
      return json;
    } catch (err) {
      console.error('Simulate takeout failed:', err);
    }
  }, [boardId]);

  return {
    isConnected,
    sseConnected: transportState.sseConnected,
    realtimeConnected: transportState.realtimeConnected,
    realtimeStatus: transportState.realtimeStatus,
    lastError: transportState.lastError,
    lastThrow,
    lastEventTime,
    activeBoardId,
    simulateThrow,
    simulateTakeout,
  };
}
