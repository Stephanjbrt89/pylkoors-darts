// lib/hooks/useTurnHold.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_POST_TURN_DELAY_MS = 1800;

/**
 * Coordinates the post-3rd-dart visibility hold so players can see all 3 darts
 * on the TV before resetting/advancing, and only advances once darts have been
 * removed (hardware TAKEOUT) or manually confirmed.
 */
export function useTurnHold(
  onAdvanceTurn: () => void,
  minDisplayMs: number = DEFAULT_POST_TURN_DELAY_MS
) {
  const [isHoldingTurn, setIsHoldingTurn] = useState(false);
  const turnCompletedAtRef = useRef<number | null>(null);
  const pendingAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const advanceRef = useRef(onAdvanceTurn);

  useEffect(() => {
    advanceRef.current = onAdvanceTurn;
  });

  const clearPendingTimer = useCallback(() => {
    if (pendingAdvanceTimerRef.current) {
      clearTimeout(pendingAdvanceTimerRef.current);
      pendingAdvanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPendingTimer();
  }, [clearPendingTimer]);

  const markTurnComplete = useCallback(() => {
    clearPendingTimer();
    turnCompletedAtRef.current = Date.now();
    isHoldingRef.current = true;
    setIsHoldingTurn(true);
  }, [clearPendingTimer]);

  const cancelTurnHold = useCallback(() => {
    clearPendingTimer();
    turnCompletedAtRef.current = null;
    isHoldingRef.current = false;
    setIsHoldingTurn(false);
  }, [clearPendingTimer]);

  const requestTakeoutAdvance = useCallback(() => {
    const completedAt = turnCompletedAtRef.current;
    const elapsed = completedAt ? Date.now() - completedAt : minDisplayMs;
    const remaining = Math.max(0, minDisplayMs - elapsed);

    clearPendingTimer();
    if (remaining > 0) {
      pendingAdvanceTimerRef.current = setTimeout(() => {
        pendingAdvanceTimerRef.current = null;
        turnCompletedAtRef.current = null;
        isHoldingRef.current = false;
        setIsHoldingTurn(false);
        advanceRef.current();
      }, remaining);
    } else {
      turnCompletedAtRef.current = null;
      isHoldingRef.current = false;
      setIsHoldingTurn(false);
      advanceRef.current();
    }
  }, [clearPendingTimer, minDisplayMs]);

  const advanceImmediately = useCallback(() => {
    clearPendingTimer();
    turnCompletedAtRef.current = null;
    isHoldingRef.current = false;
    setIsHoldingTurn(false);
    advanceRef.current();
  }, [clearPendingTimer]);

  return {
    isHoldingTurn,
    isHoldingRef,
    markTurnComplete,
    cancelTurnHold,
    requestTakeoutAdvance,
    advanceImmediately,
  };
}
