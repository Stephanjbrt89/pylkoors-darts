'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Dart } from '@/types/schema';

interface VisitDartsBarProps {
  darts: Dart[];
  maxDarts?: number;
  accentColor?: string;
  showTotal?: boolean;
  onUndoLast?: () => void;
  canUndo?: boolean;
  awaitingTakeout?: boolean;
  onNextTurn?: () => void;
  compact?: boolean;
}

function DartSilhouette() {
  return (
    <div className="flex items-center justify-center opacity-85" aria-hidden="true">
      {/* Flight */}
      <div className="w-2.5 h-3 bg-white [clip-path:polygon(0%_0%,75%_20%,100%_50%,75%_80%,0%_100%,25%_50%)]" />
      {/* Shaft */}
      <div className="w-3 h-[2px] bg-white/90" />
      {/* Barrel */}
      <div className="w-3.5 h-1 rounded-full bg-white" />
      {/* Point */}
      <div className="w-2.5 h-[1px] bg-white/75" />
    </div>
  );
}

export function VisitDartsBar({
  darts,
  maxDarts = 3,
  showTotal = false,
  onUndoLast,
  canUndo = false,
  awaitingTakeout = false,
  onNextTurn,
  compact = false,
}: VisitDartsBarProps) {
  const visitTotal = darts.reduce((sum, d) => sum + Math.max(0, d.score * d.multiplier), 0);
  const isWaitingForRemoval = awaitingTakeout || darts.length >= maxDarts;

  return (
    <div
      className={`w-full ${
        compact ? 'max-w-2xl' : 'max-w-4xl'
      } mx-auto bg-[#0d111a]/95 border rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.65)] backdrop-blur-md px-3 ${
        compact ? 'py-2' : 'py-2.5'
      } flex items-center gap-3 transition-colors ${
        isWaitingForRemoval ? 'border-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.2)]' : 'border-white/10'
      }`}
    >
      <div className="grid grid-cols-3 gap-2.5 flex-1">
        {Array.from({ length: maxDarts }).map((_, idx) => {
          const dart = darts[idx];
          const isLastThrown = idx === darts.length - 1 && Boolean(dart);

          if (!dart) {
            return (
              <div
                key={idx}
                className={`${
                  compact ? 'h-10' : 'h-12'
                } rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center`}
              >
                <DartSilhouette />
              </div>
            );
          }

          const isMiss = dart.score === 0 || dart.multiplier <= 0;
          const isTriple = dart.multiplier === 3;
          const isDouble = dart.multiplier === 2;
          const isBull = dart.score === 25;
          const pts = Math.max(0, dart.score * dart.multiplier);

          const styleClass = isMiss
            ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            : isTriple || (isBull && isDouble)
            ? 'bg-emerald-950/70 border-emerald-400/50 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
            : isDouble || isBull
            ? 'bg-blue-950/70 border-blue-400/50 text-blue-200'
            : 'bg-slate-800/80 border-white/20 text-white';

          const content = (
            <div className="flex items-center justify-center gap-2.5 w-full">
              <span className={`${compact ? 'text-lg' : 'text-2xl'} font-black tracking-tight leading-none`}>
                {dart.raw}
              </span>
              {!isMiss && (
                <span className="text-xs font-bold tabular-nums opacity-70 leading-none">
                  {pts}
                </span>
              )}
            </div>
          );

          if (isLastThrown && canUndo && onUndoLast) {
            return (
              <button
                key={idx}
                type="button"
                onClick={onUndoLast}
                title="Click to undo this dart"
                className={`${
                  compact ? 'h-10' : 'h-12'
                } rounded-xl border flex items-center justify-center px-3 transition-all hover:brightness-125 active:scale-95 ${styleClass}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={idx}
              className={`${
                compact ? 'h-10' : 'h-12'
              } rounded-xl border flex items-center justify-center px-3 transition-all ${styleClass}`}
            >
              {content}
            </div>
          );
        })}
      </div>

      {showTotal && (
        <div className="shrink-0 pl-3 border-l border-white/10 text-right min-w-[68px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
            Visit
          </p>
          <p className="text-2xl font-black tabular-nums text-white leading-none">
            {visitTotal}
          </p>
        </div>
      )}

      {isWaitingForRemoval && (
        onNextTurn ? (
          <button
            type="button"
            onClick={onNextTurn}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30 active:scale-95 transition-all"
          >
            <span className="text-[10px] font-black uppercase tracking-wider leading-none animate-pulse">
              Remove Darts
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-[10px] font-black uppercase tracking-wider leading-none animate-pulse">
            Remove Darts
          </div>
        )
      )}
    </div>
  );
}
