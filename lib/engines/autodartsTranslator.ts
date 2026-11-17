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
 * - "T20", "t20" -> Triple 20
 * - "D16", "d16" -> Double 16
 * - "S5", "5" -> Single 5
 * - "BULL", "DBULL", "50" -> Double Bull (50 pts, mult 2)
 * - "25", "SBULL" -> Single Bull (25 pts, mult 1)
 * - "MISS", "OUT", "0" -> Miss (0 pts, mult 0)
 */
export function parseAutodartsSegment(segment: string): { score: number; multiplier: number; raw: string } {
  if (!segment || typeof segment !== 'string') {
    return { score: 0, multiplier: 0, raw: 'MISS' };
  }

  const clean = segment.trim().toUpperCase();

  // Miss / Out of bounds
  if (clean === 'MISS' || clean === 'OUT' || clean === '0') {
    return { score: 0, multiplier: 0, raw: 'MISS' };
  }

  // Bullseye cases
  if (clean === 'BULL' || clean === 'DBULL' || clean === '50') {
    return { score: 50, multiplier: 2, raw: 'BULL' };
  }
  if (clean === '25' || clean === 'SBULL' || clean === 'OBULL') {
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
  const score = Number(payload.score) || 0;
  const multiplier = (Number(payload.multiplier) || (score > 0 ? 1 : 0)) as 0 | 1 | 2 | 3;
  let raw = 'MISS';
  if (multiplier === 0 || score === 0) {
    raw = 'MISS';
  } else if (score === 50) {
    raw = 'BULL';
  } else if (score === 25) {
    raw = '25';
  } else {
    const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S';
    raw = `${prefix}${score}`;
  }

  return { score, multiplier, raw };
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
