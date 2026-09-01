'use client';
import React from 'react';
import { HOLE_PARS } from '@/lib/engines/golfConstants';
import { GolfEngine } from '@/lib/engines/golf';

export const GolfScorecard = ({ player, totalHoles, isActive }: any) => {
  const renderRow = (holes: number[], label: string, type: 'hole' | 'par' | 'score') => (
    <div className="flex border-b border-white/5 w-full">
      {/* Label Column - Shrunk to w-12 */}
      <div className="w-12 px-1 py-1.5 bg-black/40 border-r border-white/10 text-[8px] font-black uppercase flex items-center justify-center shrink-0">
        {label}
      </div>
      {/* Hole Columns - Shrunk to fit 480px total width */}
      {holes.map((h) => {
        let val: any = "";
        let colorClass = "text-white";
        
        if (type === 'hole') val = h;
        if (type === 'par') val = HOLE_PARS[h];
        if (type === 'score') {
          const rawScore = player.holeScores[h];
          if (rawScore !== undefined) {
            val = HOLE_PARS[h] + rawScore;
            if (rawScore < 0) colorClass = "text-cyan-400 font-black";
            if (rawScore > 0) colorClass = "text-red-500 font-black";
          }
        }

        return (
          <div key={h} className={`flex-1 border-r border-white/5 py-1 text-center text-[12px] font-bold flex items-center justify-center ${colorClass}`}>
            {val}
          </div>
        );
      })}
      {/* Total Column - Shrunk to w-10 */}
      <div className="w-10 bg-white/5 flex flex-col items-center justify-center border-l border-white/10 shrink-0">
        <span className="font-black text-[11px] text-yellow-500">
          {type === 'par' ? holes.reduce((sum, h) => sum + HOLE_PARS[h], 0) : 
           type === 'score' ? holes.reduce((sum, h) => sum + (player.holeScores[h] !== undefined ? (HOLE_PARS[h] + player.holeScores[h]) : 0), 0) : 
           (holes[0] === 1 ? 'OUT' : 'IN')}
        </span>
      </div>
    </div>
  );

  const firstNine = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const backNine = [10, 11, 12, 13, 14, 15, 16, 17, 18];

  return (
    <div className={`w-full bg-[#0a0a0a] border-2 rounded-[1.5rem] overflow-hidden transition-all duration-700 shadow-2xl ${
      isActive 
        ? 'border-emerald-500 ring-4 ring-emerald-500/10 z-20' 
        : 'border-white/5 opacity-30 grayscale-[0.5] z-10 scale-[0.98]'
    }`}>
      {/* Header */}
      <div className={`p-3 flex justify-between items-center transition-colors ${isActive ? 'bg-[#10b981]' : 'bg-slate-900/50'}`}>
        <div className="flex items-center gap-3">
          <img src={player.avatar_url} className="w-10 h-10 rounded-full border-2 border-white/20 bg-black object-cover" alt="" />
          <h4 className="font-black italic uppercase text-white tracking-tighter text-base leading-none">{player.username}</h4>
        </div>
        <div className="text-right">
            <span className={`text-2xl font-black italic tabular-nums leading-none ${player.totalScore <= 0 ? 'text-white' : 'text-red-900'}`}>
                {GolfEngine.formatGolfScore(player.totalScore)}
            </span>
        </div>
      </div>

      <div className="flex flex-col">
        {renderRow(firstNine, 'Hole', 'hole')}
        {renderRow(firstNine, 'Par', 'par')}
        {renderRow(firstNine, 'Score', 'score')}

        {totalHoles === 18 && (
          <>
            <div className="h-1 bg-white/5" />
            {renderRow(backNine, 'Hole', 'hole')}
            {renderRow(backNine, 'Par', 'par')}
            {renderRow(backNine, 'Score', 'score')}
          </>
        )}
      </div>
    </div>
  );
};