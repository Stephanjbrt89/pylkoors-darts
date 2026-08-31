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
  totalDarts: number;
  effectiveDarts: number;
}

export interface KillerState {
  players: KillerPlayerData[];
  currentTurnIndex: number;
  dartsThrown: Dart[];
  isFinished: boolean;
  winnerId: string | null;
  difficulty: 'EASY' | 'HARD';
  phase: 'DIDDLE' | 'PLAY';
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
      totalDarts: 0,
      effectiveDarts: 0,
      hits: KILLER_TARGETS.reduce((acc, target) => ({ ...acc, [target.toString()]: 0 }), {})
    })),
    currentTurnIndex: 0,
    dartsThrown: [],
    isFinished: false,
    winnerId: null,
    difficulty,
    // AUTO-SKIP DIDDLE IF SOLO
    phase: players.length === 1 ? 'PLAY' : 'DIDDLE',
    pendingChoice: null
  }),

  getTargetOptions: (state: KillerState, dart: Dart): string[] => {
    const options: string[] = [];
    const val = dart.score;
    const isTargetRange = (val >= 10 && val <= 20);
    const isBull = val === 25;

    if (isTargetRange) options.push(val.toString());
    if (isBull) options.push('B');

    const canUseMultiplierRow = state.difficulty === 'EASY' || isTargetRange;
    if (dart.multiplier === 2 && canUseMultiplierRow) options.push('D');
    if (dart.multiplier === 3 && canUseMultiplierRow) options.push('T');

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

    const options = KillerEngine.getTargetOptions(newState, dart);
    if (options.length > 1) {
      newState.pendingChoice = { dart, options };
      return newState;
    }

    return KillerEngine.applyHit(newState, dart, options[0] || null);
  },

  applyHit: (state: KillerState, dart: Dart, chosenTarget: string | null): KillerState => {
    const newState = { ...state, pendingChoice: null, players: state.players.map(p => ({ ...p, hits: { ...p.hits } })) };
    const currentPlayer = newState.players[newState.currentTurnIndex];
    
    currentPlayer.totalDarts += 1;

    if (chosenTarget) {
      currentPlayer.effectiveDarts += 1;
      const isMultiplierRow = chosenTarget === 'D' || chosenTarget === 'T';
      const marksToAdd = isMultiplierRow ? 1 : dart.multiplier;

      for (let i = 0; i < marksToAdd; i++) {
        if (currentPlayer.hits[chosenTarget] < 3) {
          currentPlayer.hits[chosenTarget]++;
        } else {
            // SOLO SCORING: If alone, you can score points on anything you've opened
            const isSolo = newState.players.length === 1;
            const anyOpponentOpen = newState.players.some(p => p.id !== currentPlayer.id && p.hits[chosenTarget] < 3);
            
            if (isSolo || anyOpponentOpen) {
                if (dart.score >= 10 && dart.score <= 20) currentPlayer.score += dart.score;
                else if (dart.score === 25) currentPlayer.score += 25;
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

    const allClosed = KILLER_TARGETS.every(t => currentPlayer.hits[t.toString()] >= 3);
    
    // WIN CONDITION: If solo, just close all. If multi, score must be highest.
    const hasHighestScore = newState.players.every(p => currentPlayer.score >= p.score);
    
    if (allClosed && (newState.players.length === 1 || hasHighestScore)) {
      newState.isFinished = true;
      newState.winnerId = currentPlayer.id;
    }

    return newState;
  }
};