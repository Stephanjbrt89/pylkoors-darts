'use client';
import React from 'react';
import { Dart } from '@/types/schema';

// The standard clockwise dartboard sequence starting from the top (20)
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

interface Props {
  lastDarts: Dart[];
  highlight?: number | string | null; // Supports 20, 'BULL', 'ANY_DOUBLE', 'ANY_TRIPLE'
  className?: string;
}

export const VisualDartboard = ({ lastDarts, highlight, className = '' }: Props) => {
  // Helper to convert polar coordinates (angle/radius) to SVG X/Y
  const getCoordinates = (angle: number, radius: number) => {
    // -90 degrees offset to ensure 20 is at the 12 o'clock position
    const adjustedAngle = angle - 90;
    const x = 250 + radius * Math.cos((adjustedAngle * Math.PI) / 180);
    const y = 250 + radius * Math.sin((adjustedAngle * Math.PI) / 180);
    return { x, y };
  };

  return (
    <div className={`relative aspect-square w-full h-full flex items-center justify-center overflow-visible select-none ${className}`}>
      <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_12px_45px_rgba(0,0,0,0.9)] overflow-visible">
        <defs>
          {/* Subtle LED Light Ring Halo */}
          <filter id="ledHalo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Neon Glow for Targets */}
          <filter id="targetGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Sharper Glow for Hit Markers */}
          <filter id="hitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Surround & Emerald-Teal LED Ring */}
        <circle cx="250" cy="250" r="244" fill="#090c12" stroke="#34d399" strokeWidth="3.5" strokeOpacity="0.85" filter="url(#ledHalo)" />
        <circle cx="250" cy="250" r="238" fill="#0b0e14" stroke="#1e293b" strokeWidth="1" />

        {BOARD_ORDER.map((num, i) => {
          const angleStart = i * 18 - 9;
          const angleEnd = (i + 1) * 18 - 9;
          const isDark = i % 2 === 0;
          const isTargeted = highlight === num;

          const sectorFill = isTargeted
            ? isDark
              ? '#065f46'
              : '#10b981'
            : isDark
            ? '#111318'
            : '#f1e5cd';

          const ringFill = isDark ? '#dc2638' : '#118f4e';

          return (
            <g key={num}>
              {/* 1. Target Lane Highlight */}
              {isTargeted && (
                <path
                  d={`M250,250 L${getCoordinates(angleStart, 198).x},${getCoordinates(angleStart, 198).y} A198,198 0 0,1 ${getCoordinates(angleEnd, 198).x},${getCoordinates(angleEnd, 198).y} Z`}
                  fill="#34d399"
                  fillOpacity="0.28"
                  filter="url(#targetGlow)"
                  className="animate-pulse"
                />
              )}

              {/* 2. Main Segment Wedge (Single Outer + Inner) */}
              <path
                d={`M250,250 L${getCoordinates(angleStart, 192).x},${getCoordinates(angleStart, 192).y} A192,192 0 0,1 ${getCoordinates(angleEnd, 192).x},${getCoordinates(angleEnd, 192).y} Z`}
                fill={sectorFill}
                stroke={isTargeted ? '#6ee7b7' : '#cbd5e1'}
                strokeWidth={isTargeted ? '1.8' : '0.85'}
              />

              {/* 3. Double Ring (Outer) */}
              <path
                d={`M${getCoordinates(angleStart, 192).x},${getCoordinates(angleStart, 192).y} 
                   A192,192 0 0,1 ${getCoordinates(angleEnd, 192).x},${getCoordinates(angleEnd, 192).y} 
                   L${getCoordinates(angleEnd, 175).x},${getCoordinates(angleEnd, 175).y} 
                   A175,175 0 0,0 ${getCoordinates(angleStart, 175).x},${getCoordinates(angleStart, 175).y} Z`}
                fill={highlight === 'ANY_DOUBLE' ? '#34d399' : ringFill}
                stroke="#cbd5e1"
                strokeWidth="0.85"
                className={highlight === 'ANY_DOUBLE' ? 'animate-pulse' : ''}
              />

              {/* 4. Triple Ring (Inner) */}
              <path
                d={`M${getCoordinates(angleStart, 121).x},${getCoordinates(angleStart, 121).y} 
                   A121,121 0 0,1 ${getCoordinates(angleEnd, 121).x},${getCoordinates(angleEnd, 121).y} 
                   L${getCoordinates(angleEnd, 104).x},${getCoordinates(angleEnd, 104).y} 
                   A104,104 0 0,0 ${getCoordinates(angleStart, 104).x},${getCoordinates(angleStart, 104).y} Z`}
                fill={highlight === 'ANY_TRIPLE' ? '#34d399' : ringFill}
                stroke="#cbd5e1"
                strokeWidth="0.85"
                className={highlight === 'ANY_TRIPLE' ? 'animate-pulse' : ''}
              />

              {/* 5. Crisp Metallic Number Ring */}
              <text
                {...getCoordinates(i * 18, 217)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isTargeted ? '#4ade80' : '#d1d5db'}
                fontSize="24"
                fontWeight="800"
                className="font-sans tracking-tight"
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* Outer Catch Wire Ring */}
        <circle cx="250" cy="250" r="192" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />

        {/* 6. Outer Bull (Green) */}
        <circle
          cx="250"
          cy="250"
          r="20"
          fill={highlight === 'BULL' ? '#34d399' : '#118f4e'}
          className={highlight === 'BULL' ? 'animate-pulse' : ''}
          stroke="#e2e8f0"
          strokeWidth="1.1"
        />

        {/* 7. Inner Bullseye (Red) */}
        <circle
          cx="250"
          cy="250"
          r="9"
          fill={highlight === 'BULL' ? '#ffffff' : '#dc2638'}
          stroke="#e2e8f0"
          strokeWidth="1.1"
        />

        {/* 8. HIT MARKERS */}
        {lastDarts.map((d, i) => {
          const isMiss = d.score === 0 || d.multiplier <= 0;
          if (isMiss) {
            const missCoord = getCoordinates(30 + i * 28, 212);
            return (
              <g key={i} className="animate-in zoom-in duration-300">
                <circle cx={missCoord.x} cy={missCoord.y} r="9" fill="#ef4444" fillOpacity="0.85" stroke="#ffffff" strokeWidth="1.5" filter="url(#hitGlow)" />
                <circle cx={missCoord.x} cy={missCoord.y} r="3" fill="#ffffff" />
              </g>
            );
          }

          const isBull = d.score === 25 || d.score === 50;
          const segmentIdx = BOARD_ORDER.indexOf(isBull ? 20 : d.score);
          const angle = segmentIdx >= 0 ? segmentIdx * 18 : 0;

          // Determine the radius based on Multiplier
          let rad = 148; // Default outer single
          if (d.score === 50 || (d.score === 25 && d.multiplier === 2)) {
            rad = 0; // Inner Double Bull
          } else if (d.score === 25) {
            rad = 14.5; // Outer Bull
          } else if (d.multiplier === 2) {
            rad = 183.5; // Double ring center
          } else if (d.multiplier === 3) {
            rad = 112.5; // Triple ring center
          }

          const coord = getCoordinates(angle, rad);

          return (
            <g key={i} className="animate-in zoom-in duration-300">
              <circle cx={coord.x} cy={coord.y} r="10" fill="#22d3ee" fillOpacity="0.45" filter="url(#hitGlow)" />
              <circle cx={coord.x} cy={coord.y} r="5.5" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.8" />
              <circle cx={coord.x} cy={coord.y} r="2" fill="#090c12" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};