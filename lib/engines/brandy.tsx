// lib/engines/brandy.ts
import { Dart } from '@/types/schema';

export interface BrandyPlayer {
  id: string;
  username: string;
  avatar_url: string;
  completedGlasses: number;
  currentGlassMl: number;
  totalDarts: number;
}

export interface BrandyState {
  players: BrandyPlayer[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  targetMl: number;
  totalGlasses: number;
  isFinished: boolean;
  winnerId: string | null;
  phase: 'PLAY' | 'FINISHED'; // Simplified: no more roulette or choice
  lastActionSummary: string | null;
  lastActionType: 'OVERPOUR' | 'CAP' | 'POUR' | 'NONE';
}

export const BrandyEngine = {
  createInitialState: (players: any[]): BrandyState => {
    // RANDOMIZE STARTING PLAYER IMMEDIATELY
    const randomIndex = Math.floor(Math.random() * players.length);

    return {
      players: players.map(p => ({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        completedGlasses: 0,
        currentGlassMl: 0,
        totalDarts: 0
      })),
      currentTurnIndex: randomIndex,
      dartsThrown: [],
      targetMl: 500,
      totalGlasses: 4,
      isFinished: false,
      winnerId: null,
      phase: 'PLAY',
      lastActionSummary: null,
      lastActionType: 'NONE'
    };
  },

  handleThrow: (state: BrandyState, dart: Dart): BrandyState => {
    if (state.phase !== 'PLAY' || state.isFinished) return state;

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    const mlAdded = dart.score * dart.multiplier * 10;
    const newVolume = currentPlayer.currentGlassMl + mlAdded;
    
    currentPlayer.totalDarts += 1;
    newState.lastActionSummary = null;

    if (newVolume > state.targetMl) {
      currentPlayer.currentGlassMl = Math.floor(currentPlayer.currentGlassMl / 2);
      newState.lastActionSummary = `OVERPOUR! Glass halved to ${currentPlayer.currentGlassMl}ml`;
      newState.lastActionType = 'OVERPOUR';
    } 
    else if (newVolume === state.targetMl) {
      currentPlayer.completedGlasses += 1;
      currentPlayer.currentGlassMl = 0;
      newState.lastActionSummary = `CAPPED! Glass #${currentPlayer.completedGlasses} complete!`;
      newState.lastActionType = 'CAP';

      if (currentPlayer.completedGlasses === state.totalGlasses) {
        newState.isFinished = true;
        newState.winnerId = currentPlayer.id;
        newState.phase = 'FINISHED';
      }
    } 
    else {
      currentPlayer.currentGlassMl = newVolume;
      newState.lastActionType = 'POUR';
    }

    const currentDarts = [...newState.dartsThrown, dart];
    if (currentDarts.length === 3 || newState.isFinished || newState.lastActionType === 'OVERPOUR') {
      newState.dartsThrown = [];
      newState.currentTurnIndex = (newState.currentTurnIndex + 1) % newState.players.length;
    } else {
      newState.dartsThrown = currentDarts;
    }

    return newState;
  }
};