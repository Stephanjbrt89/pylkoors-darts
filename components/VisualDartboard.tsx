'use client';
import React from 'react';

// The standard clockwise dartboard sequence starting from the top (20)
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

interface Props {
  lastDarts: any[];
  highlight?: number | string | null; // Supports 20, 'BULL', 'ANY_DOUBLE', 'ANY_TRIPLE'
}

export const VisualDartboard = ({ lastDarts, highlight }: Props) => {
  
  // Helper to convert polar coordinates (angle/radius) to SVG X/Y
  const getCoordinates = (angle: number, radius: number) => {
    // -90 degrees offset to ensure 20 is at the 12 o'clock position
    const adjustedAngle = angle - 90;
    const x = 250 + radius * Math.cos((adjustedAngle * Math.PI) / 180);
    const y = 250 + radius * Math.sin((adjustedAngle * Math.PI) / 180);
    return { x, y };
  };

  return (
    <div className="relative w-full aspect-square max-w-[800px] flex items-center justify-center p-0 overflow-visible">
      <svg viewBox="0 0 500 500" className="w-full h-full drop-shadow-[0_0_60px_rgba(0,0,0,1)] overflow-visible">
        <defs>
          {/* Neon Glow for Targets */}
          <filter id="targetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Sharper Glow for Hit Markers */}
          <filter id="hitGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Background / Wire Frame */}
        <circle cx="250" cy="250" r="225" fill="#050505" stroke="#111" strokeWidth="2" />

        {BOARD_ORDER.map((num, i) => {
          const angleStart = i * 18 - 9;
          const angleEnd = (i + 1) * 18 - 9;
          const isDark = i % 2 === 0;
          const isTargeted = highlight === num;

          return (
            <g key={num}>
              {/* 1. Target Lane Highlight (Glow behind the wedge) */}
              {isTargeted && (
                <path
                  d={`M250,250 L${getCoordinates(angleStart, 210).x},${getCoordinates(angleStart, 210).y} A210,210 0 0,1 ${getCoordinates(angleEnd, 210).x},${getCoordinates(angleEnd, 210).y} Z`}
                  fill="#00FF66"
                  fillOpacity="0.3"
                  filter="url(#targetGlow)"
                  className="animate-pulse"
                />
              )}

              {/* 2. Main Segment Wedge */}
              <path
                d={`M250,250 L${getCoordinates(angleStart, 200).x},${getCoordinates(angleStart, 200).y} A200,200 0 0,1 ${getCoordinates(angleEnd, 200).x},${getCoordinates(angleEnd, 200).y} Z`}
                fill={isTargeted ? '#064e3b' : isDark ? '#0f172a' : '#1e293b'}
                stroke={isTargeted ? '#00FF66' : '#334155'}
                strokeWidth={isTargeted ? '2' : '0.5'}
              />

              {/* 3. Double Ring (Outer) */}
              <path
                d={`M${getCoordinates(angleStart, 200).x},${getCoordinates(angleStart, 200).y} 
                   A200,200 0 0,1 ${getCoordinates(angleEnd, 200).x},${getCoordinates(angleEnd, 200).y} 
                   L${getCoordinates(angleEnd, 185).x},${getCoordinates(angleEnd, 185).y} 
                   A185,185 0 0,0 ${getCoordinates(angleStart, 185).x},${getCoordinates(angleStart, 185).y} Z`}
                fill={highlight === 'ANY_DOUBLE' ? '#00FF66' : (isDark ? '#be123c' : '#15803d')}
                className={highlight === 'ANY_DOUBLE' ? 'animate-pulse shadow-lg' : ''}
              />

              {/* 4. Triple Ring (Inner) */}
              <path
                d={`M${getCoordinates(angleStart, 120).x},${getCoordinates(angleStart, 120).y} 
                   A120,120 0 0,1 ${getCoordinates(angleEnd, 120).x},${getCoordinates(angleEnd, 120).y} 
                   L${getCoordinates(angleEnd, 105).x},${getCoordinates(angleEnd, 105).y} 
                   A105,105 0 0,0 ${getCoordinates(angleStart, 105).x},${getCoordinates(angleStart, 105).y} Z`}
                fill={highlight === 'ANY_TRIPLE' ? '#00FF66' : (isDark ? '#be123c' : '#15803d')}
                className={highlight === 'ANY_TRIPLE' ? 'animate-pulse shadow-lg' : ''}
              />

              {/* 5. Numbering */}
              <text
                {...getCoordinates(i * 18, 235)}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="white"
                className={`text-[16px] font-black italic tracking-tighter ${isTargeted ? 'opacity-100 fill-green-400' : 'opacity-20'}`}
              >
                {num}
              </text>
            </g>
          );
        })}

        {/* 6. Outer Bull (Green) */}
        <circle 
          cx="250" 
          cy="250" 
          r="18" 
          fill={highlight === 'BULL' ? '#00FF66' : '#15803d'} 
          className={highlight === 'BULL' ? 'animate-pulse' : ''} 
          stroke="#050505"
          strokeWidth="1"
        />

        {/* 7. Inner Bullseye (Red) */}
        <circle 
          cx="250" 
          cy="250" 
          r="8" 
          fill={highlight === 'BULL' ? '#FFFFFF' : '#be123c'} 
          stroke="#050505"
          strokeWidth="1"
        />

        {/* 8. HIT MARKERS (Green Glowing Dots) */}
        {lastDarts.map((d, i) => {
          // Find the angle of the segment based on the numerical value
          const segmentIdx = BOARD_ORDER.indexOf(d.score === 25 || d.score === 50 ? 20 : d.score);
          const angle = segmentIdx * 18;
          
          // Determine the radius based on Multiplier
          let rad = 150; // Default single
          if (d.multiplier === 2) rad = 192;
          if (d.multiplier === 3) rad = 112;
          if (d.score === 25) rad = 13; // Outer Bull
          if (d.score === 50) rad = 0;  // Dead center

          const coord = getCoordinates(angle, rad);
          
          return (
            <g key={i} className="animate-in zoom-in duration-300">
              {/* Hit Glow */}
              <circle cx={coord.x} cy={coord.y} r="10" fill="#00FF66" filter="url(#hitGlow)" className="animate-pulse" />
              {/* Hit Center */}
              <circle cx={coord.x} cy={coord.y} r="3" fill="white" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};