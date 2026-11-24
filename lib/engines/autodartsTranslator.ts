// lib/engines/autodartsTranslator.ts
import { Dart } from '@/types/schema';
import { AutodartsThrowPayload, AutodartsCoords } from '@/types/autodarts';

/**
 * Standard dartboard number sequence starting from the top (12 o'clock = 20)
 * in clockwise order.
 */
export const DARTBOARD_NUMBERS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
] as const;

/**
 * Normalizes Autodarts segment identifiers into a clean internal representation.
 * Handles variations like:
 * - "T20", "t20" -> Triple 20 (score 20, mult 3 = 60 pts)
 * - "D16", "d16" -> Double 16 (score 16, mult 2 = 32 pts)
 * - "S5", "5" -> Single 5 (score 5, mult 1 = 5 pts)
 * - "BULL", "DBULL", "D25", "50" -> Double Bull (score 25, mult 2 = 50 pts)
 * - "25", "SBULL", "S25", "OBULL" -> Single Bull (score 25, mult 1 = 25 pts)
 * - "MISS", "OUT", "0", "M20" -> Miss (score 0, mult 0 = 0 pts)
 */
export function parseAutodartsSegment(segment: string): { score: number; multiplier: number; raw: string } {
  if (!segment || typeof segment !== 'string') {
    return { score: 0, multiplier: 0, raw: 'MISS' };
  }

  const clean = segment.trim().toUpperCase();

  // Miss / Out of bounds (including Autodarts v2 catch-ring misses like "M20", "M1", "M25")
  if (clean === 'MISS' || clean === 'OUT' || clean === '0' || clean === 'M' || /^M\d+$/.test(clean)) {
    return { score: 0, multiplier: 0, raw: 'MISS' };
  }

  // Bullseye cases (Double Bull = score 25 * multiplier 2 = 50 pts)
  if (
    clean === 'BULL' ||
    clean === 'DBULL' ||
    clean === 'D-BULL' ||
    clean === 'D25' ||
    clean === '50' ||
    clean === 'BULLSEYE'
  ) {
    return { score: 25, multiplier: 2, raw: 'BULL' };
  }

  // Outer Bull (Single Bull = score 25 * multiplier 1 = 25 pts)
  if (
    clean === '25' ||
    clean === 'SBULL' ||
    clean === 'S-BULL' ||
    clean === 'OBULL' ||
    clean === 'S25' ||
    clean === 'OUTER BULL'
  ) {
    return { score: 25, multiplier: 1, raw: '25' };
  }

  // Multiplier prefixes: T, D, S
  const prefix = clean.charAt(0);
  const remainder = clean.slice(1);
  const remainderNum = parseInt(remainder, 10);

  if (prefix === 'T' && !isNaN(remainderNum) && remainderNum >= 1 && remainderNum <= 20) {
    return { score: remainderNum, multiplier: 3, raw: `T${remainderNum}` };
  }

  if (prefix === 'D' && !isNaN(remainderNum) && remainderNum >= 1 && remainderNum <= 20) {
    return { score: remainderNum, multiplier: 2, raw: `D${remainderNum}` };
  }

  if (prefix === 'S' && !isNaN(remainderNum) && remainderNum >= 1 && remainderNum <= 20) {
    return { score: remainderNum, multiplier: 1, raw: `S${remainderNum}` };
  }

  // Direct number without prefix (e.g. "20")
  const directNum = parseInt(clean, 10);
  if (!isNaN(directNum) && directNum >= 1 && directNum <= 20) {
    return { score: directNum, multiplier: 1, raw: `S${directNum}` };
  }

  return { score: 0, multiplier: 0, raw: 'MISS' };
}

/**
 * Converts an incoming Autodarts throw payload into our standard Dart model.
 */
export function autodartsPayloadToDart(payload: Partial<AutodartsThrowPayload>): Dart {
  // If segment is provided, prefer segment parsing for certainty
  if (payload.segment) {
    const parsed = parseAutodartsSegment(payload.segment);
    return {
      score: parsed.score,
      multiplier: parsed.multiplier,
      raw: parsed.raw,
    };
  }

  // Fallback if raw score and multiplier are provided directly
  const rawScore = Number(payload.score) || 0;
  const rawMultiplier = (Number(payload.multiplier) || (rawScore > 0 ? 1 : 0)) as 0 | 1 | 2 | 3;

  if (rawMultiplier === 0 || rawScore === 0) {
    return { score: 0, multiplier: 0, raw: 'MISS' };
  }
  if (rawScore === 50 || (rawScore === 25 && rawMultiplier === 2)) {
    return { score: 25, multiplier: 2, raw: 'BULL' };
  }
  if (rawScore === 25) {
    return { score: 25, multiplier: 1, raw: '25' };
  }

  const prefix = rawMultiplier === 3 ? 'T' : rawMultiplier === 2 ? 'D' : 'S';
  return { score: rawScore, multiplier: rawMultiplier, raw: `${prefix}${rawScore}` };
}

/**
 * Calculates synthetic normalized board coordinates (-1.0 to 1.0)
 * for segments when physical camera coordinates are not provided.
 * Useful for rendering hits onto the VisualDartboard SVG canvas.
 */
export function getSegmentCenterCoordinates(segment: string): AutodartsCoords {
  const parsed = parseAutodartsSegment(segment);
  if (parsed.raw === 'MISS' || parsed.score === 0) {
    return { x: 0.9, y: -0.9 }; // Out of board perimeter
  }
  if (parsed.raw === 'BULL') {
    return { x: 0, y: 0 };
  }
  if (parsed.raw === '25') {
    return { x: 0.04, y: 0.04 };
  }

  const index = DARTBOARD_NUMBERS.indexOf(parsed.score as any);
  if (index === -1) return { x: 0, y: 0 };

  // Angle: 20 is at top (-90 degrees / -PI/2 radians). Clockwise 18 degrees per slice.
  const angleDeg = -90 + index * 18;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Normalized radiuses (approximate standard dartboard rings)
  // Inner Bull = 0.03, Outer Bull = 0.07, Triple Ring = 0.55, Double Ring = 0.85
  let r = 0.35; // Default Single Inner
  if (parsed.multiplier === 3) {
    r = 0.55; // Triple bed
  } else if (parsed.multiplier === 2) {
    r = 0.85; // Double bed
  }

  return {
    x: Math.cos(angleRad) * r,
    y: Math.sin(angleRad) * r,
  };
}
