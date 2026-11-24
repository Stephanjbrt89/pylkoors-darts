'use client';
import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dart } from '@/types/schema';

interface Props {
  activeGooierName: string;
  dartsThrownCount: number;
  lastDarts?: Dart[];
  dartsStatus?: ('hit' | 'miss' | 'none')[];
  canUndo?: boolean;
  onUndo?: () => void;
  onThrow: (score: number, multiplier: number, label: string) => void;
  onEndTurn: () => void;
  onToggle?: (expanded: boolean) => void;
  color?: string;
  showGolfHazards?: boolean;
}

export const ArcadeNumpad = ({
  activeGooierName,
  dartsThrownCount,
  lastDarts = [],
  dartsStatus = [],
  canUndo = false,
  onUndo,
  onThrow,
  onEndTurn,
  onToggle,
  color = "#ef4444",
  showGolfHazards,
}: Props) => {
  const [pendingNum, setPendingNum] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { if (onToggle) onToggle(isExpanded); }, [isExpanded, onToggle]);

  const addDigit = (digit: string) => {
    const nextValue = pendingNum + digit;
    const num = parseInt(nextValue);
    if (num > 20 && num !== 25 && nextValue.length >= 2) return;
    if (nextValue.length > 2) return;
    setPendingNum(nextValue);
  };

  const handleAction = (multiplier: number, overrideLabel?: string) => {
    const score = parseInt(pendingNum) || 0;
    if (score === 25 && multiplier === 3) return; // Illegal Triple Bull

    if (multiplier === -1 || multiplier === 0) {
      onThrow(0, multiplier, overrideLabel || "MISS");
    } else if (score === 25) {
      if (multiplier === 2) onThrow(25, 2, "D-BULL");
      else onThrow(25, 1, "BULL");
    } else {
      onThrow(score, multiplier, `${multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S'}${score}`);
    }
    setPendingNum("");
  };

  const handleUndoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canUndo || !onUndo) return;
    onUndo();
    setIsExpanded(true);
  };

  return (
    <div 
      className={`w-full max-w-lg bg-black/95 border-t-4 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-in-out flex flex-col items-center ${
        isExpanded ? 'pt-1 px-6 pb-2 rounded-t-[2.5rem]' : 'pt-0 px-6 pb-0 rounded-t-xl'
      }`} 
      style={{ borderColor: color, height: isExpanded ? 'auto' : '55px' }}
    >
      {/* TOGGLE HANDLE */}
      <div onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between cursor-pointer py-3 gap-2">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => {
            const dart = lastDarts[i];
            const hasDart = i < dartsThrownCount || Boolean(dart);
            return (
              <div
                key={i}
                className={`h-5 min-w-[20px] ${dart ? 'px-1.5' : 'w-5'} rounded-full flex items-center justify-center border transition-all ${
                  dartsStatus[i] === 'hit'
                    ? 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                    : dartsStatus[i] === 'miss'
                    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]'
                    : hasDart
                    ? 'bg-cyan-400 border-cyan-200 text-black shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                    : 'bg-white/5 border-white/20 text-white/30'
                }`}
              >
                {dart ? (
                  <span className="text-[9px] font-black font-mono leading-none">{dart.raw}</span>
                ) : (
                  hasDart && <span className="w-2 h-2 rounded-full bg-black" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center min-w-0">
          <div className={`w-10 h-1 rounded-full mb-0.5 ${isExpanded ? 'bg-white/10' : 'bg-white animate-pulse'}`} />
          <p className="text-[9px] font-black uppercase text-cyan-400 tracking-widest truncate max-w-[140px]">{activeGooierName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onUndo && (
            <button
              onClick={handleUndoClick}
              disabled={!canUndo}
              title="Undo previous dart so you can re-enter it"
              className={`flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded border transition-all ${
                canUndo
                  ? 'text-amber-300 border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/30 active:scale-95'
                  : 'text-white/20 border-white/5 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              UNDO
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEndTurn(); }} className="text-[8px] font-black uppercase text-white/40 hover:text-white border border-white/10 px-2 py-1 rounded">END</button>
        </div>
      </div>

      {/* EXPANDABLE CONSOLE */}
      <div className={`flex flex-col items-center w-full transition-all duration-500 overflow-hidden ${
        isExpanded ? 'opacity-100 max-h-[400px] mb-2' : 'opacity-0 max-h-0'
      }`}>
        <div className="flex gap-4 items-center justify-center w-full">
            <div className="w-20 h-14 bg-slate-900 border-2 border-white/10 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-inner">{pendingNum || "00"}</div>
            <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => addDigit(n.toString())} className="w-10 h-10 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black active:translate-y-0.5">{n}</button>))}
                <button onClick={() => setPendingNum("")} className="w-10 h-10 bg-red-900 rounded-lg font-black text-[9px] border-b-2 border-black">CLR</button>
                <button onClick={() => addDigit("0")} className="w-10 h-10 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black">0</button>
                <button onClick={() => setPendingNum("25")} className="w-10 h-10 bg-white text-black rounded-lg font-black text-[9px] border-b-2 border-slate-400">BULL</button>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={() => handleAction(1)} className="w-24 py-3 bg-slate-700 rounded-lg font-black text-[9px] uppercase italic">Single</button>
                <button onClick={() => handleAction(2)} className="w-24 py-3 bg-blue-600 rounded-lg font-black text-[9px] uppercase italic">Double</button>
                <button onClick={() => handleAction(3)} disabled={pendingNum === "25"} className={`w-24 py-3 rounded-lg font-black text-[9px] uppercase italic ${pendingNum === "25" ? 'bg-slate-900 text-slate-700' : 'bg-red-600 text-white'}`}>Triple</button>
            </div>
        </div>

        {onUndo && (
          <button
            onClick={handleUndoClick}
            disabled={!canUndo}
            className={`mt-2 w-full py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              canUndo
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 active:scale-[0.99]'
                : 'bg-slate-900/40 border-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Undo Previous Dart (Fix Misread)
          </button>
        )}

        {showGolfHazards && (
            <div className="grid grid-cols-2 gap-2 w-full mt-2">
                <button onClick={() => handleAction(-1, 'BUNKER')} className="bg-amber-700 p-2 rounded-xl font-black text-[10px] italic">BUNKER (+2)</button>
                <button onClick={() => handleAction(0, 'WATER')} className="bg-blue-800 p-2 rounded-xl font-black text-[10px] italic">WATER (+3)</button>
            </div>
        )}
      </div>
    </div>
  );
};