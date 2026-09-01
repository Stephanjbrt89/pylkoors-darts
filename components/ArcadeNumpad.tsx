'use client';
import { useState, useEffect } from 'react';

interface Props {
  activeGooierName: string;
  dartsThrownCount: number;
  dartsStatus?: ('hit' | 'miss' | 'none')[];
  onThrow: (score: number, multiplier: number, label: string) => void;
  onEndTurn: () => void;
  onToggle?: (expanded: boolean) => void;
  color?: string;
  showGolfHazards?: boolean; // NEW
}

export const ArcadeNumpad = ({ activeGooierName, dartsThrownCount, dartsStatus = [], onThrow, onEndTurn, onToggle, color = "#ef4444", showGolfHazards }: Props) => {
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
    let score = parseInt(pendingNum) || 0;
    
    if (multiplier === -1 || multiplier === 0) {
        onThrow(0, multiplier, overrideLabel || "MISS");
        setPendingNum("");
        return;
    }

    if (score === 25) {
      if (multiplier === 3) return; 
      if (multiplier === 2) onThrow(50, 2, "D-BULL");
      else onThrow(25, 1, "BULL");
    } else {
      onThrow(score, multiplier, `${multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S'}${score}`);
    }
    setPendingNum("");
  };

  return (
    <div className={`w-full max-w-lg bg-black/95 border-t-4 shadow-2xl backdrop-blur-xl transition-all duration-500 flex flex-col items-center ${isExpanded ? 'pt-2 px-6 pb-4 rounded-t-[2.5rem]' : 'pt-0 px-6 pb-0 rounded-t-xl'}`} style={{ borderColor: color, height: isExpanded ? 'auto' : '65px' }}>
      <div onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between cursor-pointer py-4">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${dartsStatus[i] === 'hit' ? 'bg-green-500 border-green-300' : dartsStatus[i] === 'miss' ? 'bg-red-600 border-red-400' : 'bg-transparent border-white/10'}`}>
              {i < dartsThrownCount && <span className="text-[8px]">{dartsStatus[i] === 'hit' ? '✔' : '✖'}</span>}
            </div>
          ))}
        </div>
        <p className="text-[10px] font-black uppercase text-cyan-400 tracking-widest italic">{activeGooierName}&apos;S TURN</p>
        <button onClick={(e) => { e.stopPropagation(); onEndTurn(); }} className="text-[8px] font-black uppercase text-white/30 border border-white/10 px-2 py-1 rounded">BANK</button>
      </div>

      <div className={`flex flex-col items-center w-full transition-all duration-500 overflow-hidden ${isExpanded ? 'opacity-100 max-h-[600px] mb-4' : 'opacity-0 max-h-0'}`}>
        <div className="flex gap-4 items-center justify-center w-full mt-2">
            <div className="w-24 h-16 bg-slate-900 border-2 border-white/10 rounded-xl flex items-center justify-center text-4xl font-black text-white shadow-inner">{pendingNum || "00"}</div>
            <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => addDigit(n.toString())} className="w-11 h-11 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black active:translate-y-0.5">{n}</button>))}
                <button onClick={() => setPendingNum("")} className="w-11 h-11 bg-red-900 rounded-lg font-black text-[9px] border-b-2 border-black">CLR</button>
                <button onClick={() => addDigit("0")} className="w-11 h-11 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black">0</button>
                <button onClick={() => setPendingNum("25")} className="w-11 h-11 bg-white text-black rounded-lg font-black text-[9px] border-b-2 border-slate-400">BULL</button>
            </div>
            <div className="flex flex-col gap-1">
                <button onClick={() => handleAction(1)} className="w-28 py-3 bg-slate-700 rounded-lg font-black text-[9px] uppercase italic text-white">Single</button>
                <button onClick={() => handleAction(2)} className="w-28 py-3 bg-blue-600 rounded-lg font-black text-[9px] uppercase italic text-white">Double</button>
                <button onClick={() => handleAction(3)} disabled={pendingNum === "25"} className={`w-28 py-3 rounded-lg font-black text-[9px] uppercase italic transition-all ${pendingNum === "25" ? 'bg-slate-900 text-slate-700' : 'bg-red-600 text-white shadow-lg'}`}>Triple</button>
            </div>
        </div>

        {/* GOLF SPECIFIC HAZARDS */}
        {showGolfHazards && (
            <div className="grid grid-cols-2 gap-2 w-full mt-4">
                <button onClick={() => handleAction(-1, 'BUNKER')} className="bg-amber-700 hover:bg-amber-600 p-4 rounded-xl font-black text-xs italic tracking-tighter shadow-lg flex flex-col items-center">
                    BUNKER <span className="text-[8px] opacity-60">+2 STROKES</span>
                </button>
                <button onClick={() => handleAction(0, 'WATER')} className="bg-blue-800 hover:bg-blue-700 p-4 rounded-xl font-black text-xs italic tracking-tighter shadow-lg flex flex-col items-center">
                    WATER SHOT <span className="text-[8px] opacity-60">+3 STROKES</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};