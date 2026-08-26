// lib/engines/x01.ts
import { Dart } from '@/types/schema';

export interface X01State {
  targetScore: number;
  remainingScore: number;
  dartsThrown: Dart[];
  isBust: boolean;
  isWin: boolean;
}

export const X01Engine = {
  // 1. Calculate the value of a single dart (e.g., T20 = 60)
  getDartValue: (dart: Dart): number => {
    return dart.score * dart.multiplier;
  },

  // 2. Check if a throw is a "Bust"
  checkBust: (remaining: number, dart: Dart, doubleOut: boolean): boolean => {
    const scoreAfterDart = remaining - (dart.score * dart.multiplier);
    
    // Standard Bust: Score goes below 0
    if (scoreAfterDart < 0) return true;
    
    // Double Out Bust: You can't leave a score of 1
    if (doubleOut && scoreAfterDart === 1) return true;
    
    // Double Out Bust: You hit 0 but it wasn't a double
    if (doubleOut && scoreAfterDart === 0 && dart.multiplier !== 2) return true;

    return false;
  },

  // 3. Check if a throw is a "Win"
  checkWin: (remaining: number, dart: Dart, doubleOut: boolean): boolean => {
    const scoreAfterDart = remaining - (dart.score * dart.multiplier);
    
    if (scoreAfterDart !== 0) return false;
    if (doubleOut && dart.multiplier !== 2) return false;
    
    return true;
  }
};