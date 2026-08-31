// lib/engines/fight.ts
import { Dart } from '@/types/schema';

export interface FightPlayer {
  id: string;
  username: string;
  avatar_url: string;
  lives: number;
  sectors: number[];
  isEliminated: boolean;
  // --- STAT TRACKING ---
  totalDarts: number;
  effectiveDarts: number;
}

export interface FightState {
  players: FightPlayer[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  isFinished: boolean;
  winnerId: string | null;
  lastAction: { 
    type: 'DAMAGE' | 'HEAL' | 'MISS'; 
    targetId: string | null; 
    value: number;
  } | null;
  phase: 'ASSIGNING' | 'PLAY';
}

export const FightEngine = {
  createInitialState: (players: any[]): FightState => ({
    players: players.map((p) => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      lives: 9,
      sectors: [],
      isEliminated: false,
      totalDarts: 0,
      effectiveDarts: 0
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

    const newState = { ...state, players: state.players.map(p => ({ ...p, sectors: [...p.sectors] })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    let action: FightState['lastAction'] = { type: 'MISS', targetId: null, value: 0 };

    // 1. TRACK TOTAL THROWS
    currentPlayer.totalDarts += 1;

    const hitPlayer = newState.players.find(p => p.sectors.includes(dart.score) && !p.isEliminated);

    if (hitPlayer) {
      // 2. TRACK EFFECTIVE THROWS (Hit or Heal)
      currentPlayer.effectiveDarts += 1;

      if (hitPlayer.id === currentPlayer.id) {
        const oldLives = currentPlayer.lives;
        currentPlayer.lives = Math.min(9, currentPlayer.lives + dart.multiplier);
        const gained = currentPlayer.lives - oldLives;
        if (gained > 0) action = { type: 'HEAL', targetId: currentPlayer.id, value: gained };
      } else {
        const oldLives = hitPlayer.lives;
        hitPlayer.lives = Math.max(0, hitPlayer.lives - dart.multiplier);
        const lost = oldLives - hitPlayer.lives;
        action = { type: 'DAMAGE', targetId: hitPlayer.id, value: lost };
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