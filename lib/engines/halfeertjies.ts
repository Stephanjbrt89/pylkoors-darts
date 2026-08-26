// lib/engines/halfeertjies.ts
import { Dart } from '../types/schema';

export type HalfeertjiesTarget = number | 'ANY_TRIPLE' | 'ANY_DOUBLE' | 'BULL' | 'TARGET_SCORE';

export interface HalfeertjiesPlayer {
  id: string;
  username: string;
  avatar_url: string;
  score: number;
  diddle_score: number | null;
}

export interface HalfeertjiesState {
  players: HalfeertjiesPlayer[];
  roundIndex: number;
  currentTurnIndex: number;
  dartsThrown: Dart[];
  targets: { type: HalfeertjiesTarget; label: string; value?: number }[];
  phase: 'DIDDLE' | 'PLAY' | 'FINISHED';
  winnerId: string | null;
}

export const HalfeertjiesEngine = {
  createInitialState: (players: any[]): HalfeertjiesState => {
    const randomTargetScore = Math.floor(Math.random() * (49 - 35 + 1)) + 35;

    const targets: HalfeertjiesState['targets'] = [
      { type: 20, label: '20' },
      { type: 19, label: '19' },
      { type: 'TARGET_SCORE', label: `EXACT ${randomTargetScore}`, value: randomTargetScore },
      { type: 18, label: '18' },
      { type: 17, label: '17' },
      { type: 16, label: '16' },
      { type: 'ANY_TRIPLE', label: 'ANY TRIPLE' },
      { type: 15, label: '15' },
      { type: 14, label: '14' },
      { type: 13, label: '13' },
      { type: 'ANY_DOUBLE', label: 'ANY DOUBLE' },
      { type: 12, label: '12' },
      { type: 11, label: '11' },
      { type: 10, label: '10' },
      { type: 'BULL', label: 'BULLSEYE' },
    ];

    return {
      players: players.map(p => ({ 
        id: p.id, 
        username: p.username, 
        avatar_url: p.avatar_url, 
        score: 0, 
        diddle_score: null 
      })),
      roundIndex: 0,
      currentTurnIndex: 0,
      dartsThrown: [],
      targets,
      phase: 'DIDDLE',
      winnerId: null
    };
  },

  validateHit: (target: HalfeertjiesState['targets'][0], dart: Dart): boolean => {
    if (typeof target.type === 'number') return dart.score === target.type;
    if (target.type === 'ANY_TRIPLE') return dart.multiplier === 3;
    if (target.type === 'ANY_DOUBLE') return dart.multiplier === 2;
    if (target.type === 'BULL') return dart.score === 25;
    return false; 
  },

  handleThrow: (state: HalfeertjiesState, dart: Dart): HalfeertjiesState => {
    if (state.phase === 'FINISHED') return state;
    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];

    if (newState.phase === 'DIDDLE') {
      currentPlayer.diddle_score = dart.score === 25 ? (dart.multiplier * 25) : 0;
      if (newState.players.every(p => p.diddle_score !== null)) {
        const sorted = [...newState.players].sort((a, b) => b.diddle_score! - a.diddle_score!);
        newState.players = sorted; 
        newState.phase = 'PLAY';
        newState.currentTurnIndex = 0;
      } else {
        newState.currentTurnIndex = (newState.currentTurnIndex + 1) % newState.players.length;
      }
      return newState;
    }

    const currentDarts = [...newState.dartsThrown, dart];
    if (currentDarts.length < 3) {
      newState.dartsThrown = currentDarts;
      return newState;
    }

    const currentTarget = newState.targets[newState.roundIndex];
    let turnTotal = 0;
    let hasHit = false;

    if (currentTarget.type === 'TARGET_SCORE') {
      const sum = currentDarts.reduce((s, d) => s + (d.score * d.multiplier), 0);
      if (sum === currentTarget.value!) {
        turnTotal = sum;
        hasHit = true;
      }
    } else {
      currentDarts.forEach(d => {
        if (HalfeertjiesEngine.validateHit(currentTarget, d)) {
          turnTotal += (d.score * d.multiplier);
          hasHit = true;
        }
      });
    }

    if (hasHit) {
      currentPlayer.score += turnTotal;
    } else {
      currentPlayer.score = Math.floor(currentPlayer.score / 2);
    }

    newState.dartsThrown = [];
    let nextIdx = (newState.currentTurnIndex + 1) % newState.players.length;
    if (nextIdx === 0) {
      newState.roundIndex++;
      if (newState.roundIndex >= newState.targets.length) {
        newState.phase = 'FINISHED';
        newState.winnerId = [...newState.players].sort((a, b) => b.score - a.score)[0].id;
      }
    }
    newState.currentTurnIndex = nextIdx;
    return newState;
  }
};