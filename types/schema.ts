// types/schema.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MatchStatus = 'PREGAME' | 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
export type GameCategory = 'X01' | 'CRICKET' | 'ARCADE';

export type GameMode = 
  | 'X01_301' | 'X01_501' 
  | 'CRICKET_STANDARD' 
  | 'ARCADE_KILLER' | 'ARCADE_TIC_TAC_TOE' | 'ARCADE_BERMUDA' | 'ARCADE_SHANGHAI'
  | 'ARCADE_FIGHT' | 'ARCADE_ATW' | 'bat_and_bowl' | 'ARCADE_HALFEERTJIES';

export interface Dart {
  score: number;
  multiplier: number;
  raw: string;
}

export interface Match {
  id: string;
  created_by: string;
  category: GameCategory;
  mode: string;
  status: MatchStatus;
  settings: any;
  winning_player_id: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  match_id: string;
  player_id: string;
  round_number: number;
  darts: Dart[];
  total_score: number;
  is_bust: boolean;
}