// lib/engines/fight.ts
import { Dart } from '@/types/schema';

export interface FightPlayer {
  id: string;
  username: string;
  avatar_url: string; // Changed from avatar to avatar_url
  lives: number;
  sectors: number[];
  isEliminated: boolean;
}

export interface FightState {
  players: FightPlayer[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  isFinished: boolean;
  winnerId: string | null;
  lastAction: { type: 'DAMAGE' | 'HEAL' | 'MISS'; targetId: string | null } | null;
  phase: 'ASSIGNING' | 'PLAY';
}

export const FightEngine = {
  createInitialState: (players: any[]): FightState => ({
    players: players.map((p) => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url, // Standardized
      lives: 9,
      sectors: [],
      isEliminated: false
    })),
    currentTurnIndex: 0,
    dartsThrown: [],
    isFinished: false,
    winnerId: null,
    lastAction: null,
    phase: 'ASSIGNING'
  }),

  handleThrow: (state: FightState, dart: Dart): FightState => {
    if (state.isFinished) return state;

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    let action: FightState['lastAction'] = { type: 'MISS', targetId: null };

    const hitPlayer = newState.players.find(p => p.sectors.includes(dart.score) && !p.isEliminated);

    if (hitPlayer) {
      if (hitPlayer.id === currentPlayer.id) {
        if (currentPlayer.lives < 9) {
          currentPlayer.lives = Math.min(9, currentPlayer.lives + 1);
          action = { type: 'HEAL', targetId: currentPlayer.id };
        }
      } else {
        hitPlayer.lives = Math.max(0, hitPlayer.lives - dart.multiplier);
        action = { type: 'DAMAGE', targetId: hitPlayer.id };
        if (hitPlayer.lives === 0) hitPlayer.isEliminated = true;
      }
    }

    const newDarts = [...newState.dartsThrown, dart];
    const alivePlayers = newState.players.filter(p => !p.isEliminated);
    
    if (alivePlayers.length === 1) {
      newState.isFinished = true;
      newState.winnerId = alivePlayers[0].id;
    }

    if (newDarts.length === 3) {
      newState.dartsThrown = [];
      let nextIdx = (newState.currentTurnIndex + 1) % newState.players.length;
      while (newState.players[nextIdx].isEliminated && !newState.isFinished) {
        nextIdx = (nextIdx + 1) % newState.players.length;
      }
      newState.currentTurnIndex = nextIdx;
    } else {
      newState.dartsThrown = newDarts;
    }

    newState.lastAction = action;
    return newState;
  }
};