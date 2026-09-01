// lib/engines/atw.ts
import { Dart } from '@/types/schema';

export interface ATWPlayerData {
  id: string;
  username: string;
  avatar_url: string;
  currentTargetIndex: number;
}

export interface ATWState {
  players: ATWPlayerData[];
  targets: number[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  phase: 'DIDDLE' | 'PLAY' | 'FINISHED'; // ADDED THIS
  isFinished: boolean;
  winnerId: string | null;
}

export const ATW_TARGETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

export const ATWEngine = {
  createInitialState: (players: any[]): ATWState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      currentTargetIndex: 0
    })),
    targets: ATW_TARGETS,
    currentTurnIndex: 0,
    dartsThrown: [],
    phase: players.length === 1 ? 'PLAY' : 'DIDDLE', // Initialize phase
    isFinished: false,
    winnerId: null
  }),

  handleThrow: (state: ATWState, dart: Dart): ATWState => {
    if (state.isFinished) return state;

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    const targetValue = newState.targets[currentPlayer.currentTargetIndex];

    if (dart.score === targetValue) {
      if (dart.score === 25) {
        currentPlayer.currentTargetIndex = newState.targets.length;
      } else {
        currentPlayer.currentTargetIndex += dart.multiplier;
      }
      
      if (currentPlayer.currentTargetIndex >= newState.targets.length) {
        currentPlayer.currentTargetIndex = newState.targets.length - 1; 
      }

      if (dart.score === 25) {
        newState.isFinished = true;
        newState.phase = 'FINISHED'; // Update phase
        newState.winnerId = currentPlayer.id;
        return newState;
      }
    }

    const newDarts = [...newState.dartsThrown, dart];
    
    if (newDarts.length === 3) {
      newState.dartsThrown = [];
      newState.currentTurnIndex = (newState.currentTurnIndex + 1) % newState.players.length;
    } else {
      newState.dartsThrown = newDarts;
    }

    return newState;
  }
};