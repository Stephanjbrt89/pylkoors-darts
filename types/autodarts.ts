// types/autodarts.ts
import { Dart } from './schema';

export const DEFAULT_AUTODARTS_BOARD_ID =
  process.env.NEXT_PUBLIC_AUTODARTS_BOARD_ID ||
  process.env.AUTODARTS_BOARD_ID ||
  'f5d6cd59-8732-4ad4-9e06-80203d1d87e8';

export interface AutodartsCoords {
  x: number; // Normalized -1.0 to 1.0 from board center
  y: number; // Normalized -1.0 to 1.0 from board center
}

export type DartMultiplier = 0 | 1 | 2 | 3;

export interface AutodartsThrowPayload {
  type?: 'THROW';
  eventId?: string;
  boardId?: string;
  matchId?: string;
  dartIndex: 1 | 2 | 3;
  segment: string;          // e.g. "T20", "D16", "S19", "BULL", "25", "MISS"
  score: number;            // Segment base: 20, 16, 25, 0
  multiplier: DartMultiplier; // 0 = miss, 1 = single, 2 = double, 3 = triple
  points: number;           // score * multiplier (e.g. 60 for T20, 50 for BULL)
  coords?: AutodartsCoords; // Physical board coordinates
  timestamp?: number;
}

export interface AutodartsTakeoutPayload {
  type: 'TAKEOUT';
  eventId?: string;
  boardId?: string;
  matchId?: string;
  playerIndex?: number;
  timestamp?: number;
}

export interface AutodartsResetPayload {
  type: 'RESET' | 'UNDO';
  eventId?: string;
  boardId?: string;
  matchId?: string;
  timestamp?: number;
}

export type AutodartsEvent = 
  | ({ type: 'THROW' } & AutodartsThrowPayload)
  | AutodartsTakeoutPayload
  | AutodartsResetPayload;

export interface AutodartsBridgeState {
  isConnected: boolean;
  lastEventTime: number | null;
  boardId: string | null;
  currentTurnDarts: Dart[];
  lastDartCoords: AutodartsCoords | null;
}
