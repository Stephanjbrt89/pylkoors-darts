// lib/engines/golf.ts
import { Dart } from '@/types/schema';

export type GolfHoleOption = 9 | 18;

export interface GolfPlayer {
  id: string;
  username: string;
  avatar_url: string;
  totalScore: number; 
  holeScores: Record<number, number>;
}

export interface GolfState {
  players: GolfPlayer[];
  totalHoles: GolfHoleOption;
  currentHole: number;
  currentTurnIndex: number;
  currentVisitDarts: Dart[];
  isFinished: boolean;
  winnerId: string | null;
}

export const GolfEngine = {
  evalGolfDart: (dart: Dart, targetHole: number): number => {
    const { score, multiplier } = dart;

    // 1. Albatross: Double Bullseye (50 or D25)
    if (score === 50 || (score === 25 && multiplier === 2)) return -3;

    // 2. Target Hole Specifics
    if (score === targetHole) {
      if (multiplier === 3) return -2; // Eagle
      if (multiplier === 2) return -1; // Birdie
      if (multiplier === 1) return 0;  // Par
    }

    // 3. Bogeys
    if (multiplier === 0) return 3;    // Triple Bogey (Miss)
    if (multiplier === -1) return 2;   // Double Bogey (Catch Ring)
    
    // Any other number on the board
    return 1; // Bogey
  },

  formatGolfScore: (score: number): string => {
    if (score === 0) return 'E';
    // Ensure negative numbers show the minus sign and positive show the plus
    return score > 0 ? `+${score}` : `${score}`;
  },

  createInitialState: (players: any[], holes: GolfHoleOption): GolfState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      totalScore: 0, // Everyone starts at Even (0)
      holeScores: {}
    })),
    totalHoles: holes,
    currentHole: 1,
    currentTurnIndex: 0,
    currentVisitDarts: [],
    isFinished: false,
    winnerId: null
  }),

  handleThrow: (state: GolfState, dart: Dart): GolfState => {
    if (state.isFinished) return state;
    const newDarts = [...state.currentVisitDarts, dart];
    if (newDarts.length === 3) {
      return GolfEngine.bankAndAdvance({ ...state, currentVisitDarts: newDarts });
    }
    return { ...state, currentVisitDarts: newDarts };
  },

  bankAndAdvance: (state: GolfState): GolfState => {
    if (state.currentVisitDarts.length === 0) return state;
    
    // Create new state object for React to detect change
    const newState = { 
      ...state, 
      players: state.players.map(p => ({ 
        ...p, 
        holeScores: { ...p.holeScores } 
      })) 
    };
    
    const currentPlayer = newState.players[newState.currentTurnIndex];
    const lastDart = newState.currentVisitDarts[newState.currentVisitDarts.length - 1];
    
    // Calculate the score for this specific hole (-3 to +3)
    const holeScore = GolfEngine.evalGolfDart(lastDart, newState.currentHole);

    // Update Player - ALLOWING NEGATIVE TOTALS
    currentPlayer.holeScores[newState.currentHole] = holeScore;
    currentPlayer.totalScore = currentPlayer.totalScore + holeScore;

    // Logic for next turn
    let nextPlayerIndex = (newState.currentTurnIndex + 1) % newState.players.length;
    let nextHole = newState.currentHole;
    if (nextPlayerIndex === 0) nextHole++;

    let isFinished = false;
    let winnerId = null;
    if (nextHole > newState.totalHoles) {
      isFinished = true;
      winnerId = [...newState.players].sort((a, b) => a.totalScore - b.totalScore)[0].id;
    }

    return { 
      ...newState, 
      currentHole: nextHole, 
      currentTurnIndex: nextPlayerIndex, 
      currentVisitDarts: [], 
      isFinished, 
      winnerId 
    };
  }
};