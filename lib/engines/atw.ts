// lib/engines/atw.ts
import { Dart } from '@/types/schema';

export interface ATWPlayerData {
  id: string;
  username: string;
  avatar: string;
  currentTargetIndex: number;
}

export interface ATWState {
  players: ATWPlayerData[];
  targets: number[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  isFinished: boolean;
  winnerId: string | null;
}

export const ATW_TARGETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

export const ATWEngine = {
  createInitialState: (players: any[]): ATWState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar_url,
      currentTargetIndex: 0
    })),
    targets: ATW_TARGETS,
    currentTurnIndex: 0,
    dartsThrown: [],
    isFinished: false,
    winnerId: null
  }),

  handleThrow: (state: ATWState, dart: Dart): ATWState => {
    if (state.isFinished) return state;

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    const targetValue = newState.targets[currentPlayer.currentTargetIndex];

    // Check if the dart hit the correct segment
    if (dart.score === targetValue) {
      // THE SKIP RULE:
      // Single = +1, Double = +2, Triple = +3
      // Bull (25) always finishes the game regardless of multiplier
      if (dart.score === 25) {
        currentPlayer.currentTargetIndex = newState.targets.length;
      } else {
        currentPlayer.currentTargetIndex += dart.multiplier;
      }
      
      // Safety: Don't overshoot the Bullseye index
      if (currentPlayer.currentTargetIndex >= newState.targets.length) {
        currentPlayer.currentTargetIndex = newState.targets.length - 1; 
        // If they hit the target that leads to Bullseye or past it, 
        // we lock them to the final target (25).
      }

      // Check for Win Condition (Winning dart must be the Bullseye)
      if (dart.score === 25) {
        newState.isFinished = true;
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