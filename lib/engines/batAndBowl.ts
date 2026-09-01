// lib/engines/batAndBowl.ts
import { Dart } from '@/types/schema';

export type BatBowlRole = 'batting' | 'bowling' | 'none';

export interface BatBowlPlayer {
  id: string;
  username: string;
  avatar_url: string;
  role: BatBowlRole;
  score: number;
  wickets: number;
  rounds_batting: number;
  rounds_bowling: number;
}

export interface BatAndBowlState {
  players: BatBowlPlayer[];
  innings: 1 | 2;
  innings_1_target: number | null;
  currentTurnIndex: number;
  dartsThrown: Dart[];
  phase: 'ROULETTE' | 'CHOICE' | 'PLAY' | 'FINISHED'; // Added CHOICE
  rouletteWinnerId: string | null;
  winnerId: string | null;
}

export const BatAndBowlEngine = {
  createInitialState: (players: any[]): BatAndBowlState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      role: 'none',
      score: 0,
      wickets: 0,
      rounds_batting: 0,
      rounds_bowling: 0
    })),
    innings: 1,
    innings_1_target: null,
    currentTurnIndex: 0,
    dartsThrown: [],
    phase: 'ROULETTE',
    rouletteWinnerId: null,
    winnerId: null
  }),

  // Sets the roles based on the choice made by the roulette winner
  assignRoles: (state: BatAndBowlState, deciderId: string, chosenRole: 'batting' | 'bowling'): BatAndBowlState => {
    const newState = { ...state, phase: 'PLAY' as const };
    const otherPlayer = newState.players.find(p => p.id !== deciderId);

    newState.players = newState.players.map(p => {
      if (p.id === deciderId) {
        return { ...p, role: chosenRole };
      } else {
        // Assign the opposite role to the opponent
        return { ...p, role: chosenRole === 'batting' ? 'bowling' : 'batting' };
      }
    });

    // Batsman always starts the first turn of the match
    newState.currentTurnIndex = newState.players.findIndex(p => p.role === 'batting');
    return newState;
  },

  handleThrow: (state: BatAndBowlState, dart: Dart): BatAndBowlState => {
    if (state.phase !== 'PLAY') return state;
    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    const batsman = newState.players.find(p => p.role === 'batting')!;
    const bowler = newState.players.find(p => p.role === 'bowling')!;

    if (currentPlayer.role === 'batting') {
      batsman.score += (dart.score * dart.multiplier);
      if (newState.innings === 2 && newState.innings_1_target !== null && batsman.score > newState.innings_1_target) {
        newState.phase = 'FINISHED';
        newState.winnerId = batsman.id;
      }
    } else {
      const activeTarget = bowler.wickets + 1;
      if (dart.score === activeTarget) bowler.wickets += dart.multiplier;
      if (bowler.wickets >= 10) {
        bowler.wickets = 10;
        if (newState.innings === 1) {
          newState.innings = 2;
          newState.innings_1_target = batsman.score;
          const oldBatsmanId = batsman.id;
          newState.players.forEach(p => {
            p.role = p.id === oldBatsmanId ? 'bowling' : 'batting';
            p.wickets = 0; p.score = 0; p.rounds_batting = 0; p.rounds_bowling = 0;
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
      if (currentPlayer.role === 'batting') currentPlayer.rounds_batting += 1;
      else currentPlayer.rounds_bowling += 1;
      newState.dartsThrown = [];
      newState.currentTurnIndex = (newState.currentTurnIndex + 1) % 2;
    } else {
      newState.dartsThrown = currentDarts;
    }
    return newState;
  }
};