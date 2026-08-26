// lib/engines/batAndBowl.ts
import { Dart } from '../types/schema';

export type BatBowlRole = 'batting' | 'bowling' | 'pending_bull_choice' | 'diddling';

export interface BatBowlPlayer {
  id: string;
  username: string;
  avatar_url: string; // FIXED: Changed from avatar to avatar_url
  role: BatBowlRole;
  score: number;
  wickets: number;
  diddle_score: number | null;
}

export interface BatAndBowlState {
  players: BatBowlPlayer[];
  innings: 1 | 2;
  innings_1_target: number | null;
  currentTurnIndex: number;
  dartsThrown: Dart[];
  phase: 'DIDDLE' | 'PLAY' | 'FINISHED';
  winnerId: string | null;
}

export const BatAndBowlEngine = {
  createInitialState: (players: any[]): BatAndBowlState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url, // FIXED: Matches database naming
      role: 'diddling',
      score: 0,
      wickets: 0,
      diddle_score: null
    })),
    innings: 1,
    innings_1_target: null,
    currentTurnIndex: 0,
    dartsThrown: [],
    phase: 'DIDDLE',
    winnerId: null
  }),

  handleThrow: (state: BatAndBowlState, dart: Dart): BatAndBowlState => {
    if (state.phase === 'FINISHED') return state;

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];

    if (newState.phase === 'DIDDLE') {
      currentPlayer.diddle_score = dart.score === 25 ? (dart.multiplier === 2 ? 50 : 25) : 0;
      if (newState.players.every(p => p.diddle_score !== null)) {
        const p1 = newState.players[0];
        const p2 = newState.players[1];
        if (p1.diddle_score === p2.diddle_score) {
          newState.players.forEach(p => p.diddle_score = null);
          newState.currentTurnIndex = 0;
        } else {
          const winnerIdx = p1.diddle_score! > p2.diddle_score! ? 0 : 1;
          newState.players[winnerIdx].role = 'pending_bull_choice';
          newState.players[1 - winnerIdx].role = 'diddling';
        }
      } else {
        newState.currentTurnIndex = (newState.currentTurnIndex + 1) % 2;
      }
      return newState;
    }

    const batsman = newState.players.find(p => p.role === 'batting')!;
    const bowler = newState.players.find(p => p.role === 'bowling')!;
    const isBatsmanTurn = currentPlayer.role === 'batting';

    if (isBatsmanTurn) {
      batsman.score += (dart.score * dart.multiplier);
      if (newState.innings === 2 && newState.innings_1_target !== null) {
        if (batsman.score > newState.innings_1_target) {
          newState.phase = 'FINISHED';
          newState.winnerId = batsman.id;
        }
      }
    } else {
      const activeTarget = bowler.wickets + 1;
      if (dart.score === activeTarget) {
        bowler.wickets += dart.multiplier;
      }
      if (bowler.wickets >= 10) {
        bowler.wickets = 10;
        if (newState.innings === 1) {
          newState.innings = 2;
          newState.innings_1_target = batsman.score;
          const oldBatsmanId = batsman.id;
          newState.players.forEach(p => {
            p.role = p.id === oldBatsmanId ? 'bowling' : 'batting';
            p.wickets = 0;
            p.score = 0;
          });
          newState.currentTurnIndex = newState.players.findIndex(p => p.role === 'batting');
          newState.dartsThrown = [];
          return newState;
        } else {
          newState.phase = 'FINISHED';
          newState.winnerId = bowler.id;
        }
      }
    }

    const currentDarts = [...newState.dartsThrown, dart];
    if (currentDarts.length === 3) {
      newState.dartsThrown = [];
      newState.currentTurnIndex = (newState.currentTurnIndex + 1) % 2;
    } else {
      newState.dartsThrown = currentDarts;
    }
    return newState;
  }
};