// lib/engines/killer.ts
import { Dart } from '@/types/schema';

export type KillerTarget = number | 'D' | 'T' | 'B';

export interface KillerPlayerData {
  id: string;
  username: string;
  avatar_url: string;
  score: number;
  hits: Record<string, number>;
  diddle_score: number | null;
}

export interface KillerState {
  players: KillerPlayerData[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  isFinished: boolean;
  winnerId: string | null;
  difficulty: 'EASY' | 'HARD';
  phase: 'DIDDLE' | 'PLAY';
  // If a hit can go in two places, we pause for user choice
  pendingChoice: { dart: Dart; options: string[] } | null;
}

export const KILLER_TARGETS: KillerTarget[] = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 'D', 'T', 'B'];

export const KillerEngine = {
  createInitialState: (players: any[], difficulty: 'EASY' | 'HARD' = 'EASY'): KillerState => ({
    players: players.map(p => ({
      id: p.id,
      username: p.username,
      avatar_url: p.avatar_url,
      score: 0,
      diddle_score: null,
      hits: KILLER_TARGETS.reduce((acc, target) => ({ ...acc, [target.toString()]: 0 }), {})
    })),
    currentTurnIndex: 0,
    dartsThrown: [],
    isFinished: false,
    winnerId: null,
    difficulty,
    phase: 'DIDDLE',
    pendingChoice: null
  }),

  // Helper to calculate available options for a dart
  getTargetOptions: (state: KillerState, dart: Dart): string[] => {
    const options: string[] = [];
    const val = dart.score;
    const isTargetRange = val >= 10 && val <= 20;

    // Option A: The Number itself
    if (isTargetRange) options.push(val.toString());
    if (val === 25) options.push('B');

    // Option B: The Multiplier row (D or T)
    const isEasy = state.difficulty === 'EASY';
    if (dart.multiplier === 2 && (isEasy || isTargetRange)) options.push('D');
    if (dart.multiplier === 3 && (isEasy || isTargetRange)) options.push('T');

    return options;
  },

  handleThrow: (state: KillerState, dart: Dart): KillerState => {
    if (state.isFinished) return state;
    const newState = { ...state, players: state.players.map(p => ({ ...p, hits: { ...p.hits } })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];

    if (newState.phase === 'DIDDLE') {
      currentPlayer.diddle_score = dart.score === 25 ? (dart.multiplier * 25) : 0;
      if (newState.players.every(p => p.diddle_score !== null)) {
        newState.players.sort((a, b) => b.diddle_score! - a.diddle_score!);
        newState.phase = 'PLAY';
        newState.currentTurnIndex = 0;
      } else {
        newState.currentTurnIndex = (newState.currentTurnIndex + 1) % newState.players.length;
      }
      return newState;
    }

    // Check for Overlap Choice
    const options = KillerEngine.getTargetOptions(newState, dart);
    if (options.length > 1) {
      newState.pendingChoice = { dart, options };
      return newState;
    }

    return KillerEngine.applyHit(newState, dart, options[0] || null);
  },

  applyHit: (state: KillerState, dart: Dart, chosenTarget: string | null): KillerState => {
    const newState = { ...state, pendingChoice: null };
    const currentPlayer = newState.players[state.currentTurnIndex];
    const opponent = newState.players.find(p => p.id !== currentPlayer.id)!;

    if (chosenTarget) {
      // Logic: Multiplier only applies if hitting the specific number row
      // If hitting 'D' or 'T' rows, it's always just 1 mark per dart
      const isMultiplierRow = chosenTarget === 'D' || chosenTarget === 'T';
      const marksToAdd = isMultiplierRow ? 1 : dart.multiplier;

      for (let i = 0; i < marksToAdd; i++) {
        if (currentPlayer.hits[chosenTarget] < 3) {
          currentPlayer.hits[chosenTarget]++;
        } else if (opponent.hits[chosenTarget] < 3) {
          // SCORING: Points = face value of segment hit (only for 10-20 and Bull)
          if (dart.score >= 10 && dart.score <= 20) {
            currentPlayer.score += dart.score;
          } else if (dart.score === 25) {
            currentPlayer.score += 25;
          }
        }
      }
    }

    const newDarts = [...newState.dartsThrown, dart];
    if (newDarts.length === 3) {
      newState.dartsThrown = [];
      newState.currentTurnIndex = (newState.currentTurnIndex + 1) % newState.players.length;
    } else {
      newState.dartsThrown = newDarts;
    }

    // WIN CONDITION: All 14 closed AND score >= opponent
    const allClosed = KILLER_TARGETS.every(t => currentPlayer.hits[t.toString()] >= 3);
    if (allClosed && currentPlayer.score >= opponent.score) {
      newState.isFinished = true;
      newState.winnerId = currentPlayer.id;
    }

    return newState;
  }
};