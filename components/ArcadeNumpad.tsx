'use client';
import { useState } from 'react';

interface Props {
  activeGooierName: string;
  dartsThrownCount: number;
  onThrow: (score: number, multiplier: number, label: string) => void;
  onEndTurn: () => void;
  color?: string;
}

export const ArcadeNumpad = ({ activeGooierName, dartsThrownCount, onThrow, onEndTurn, color = "#ef4444" }: Props) => {
  const [pendingNum, setPendingNum] = useState("");

  const addDigit = (digit: string) => {
    const nextValue = pendingNum + digit;
    const num = parseInt(nextValue);

    // Guard: Max 20 (except for the 25 Bullseye case)
    if (num > 20 && num !== 25 && nextValue.length >= 2) return;
    if (nextValue.length > 2) return;

    setPendingNum(nextValue);
  };

  const handleAction = (multiplier: number) => {
    let score = parseInt(pendingNum);
    if (isNaN(score)) return;

    // --- BULLSEYE SAFETY LOGIC ---
    if (score === 25) {
      // TRIPLE BULL IS ILLEGAL: Ignore the click if someone tries to throw a 75
      if (multiplier === 3) return; 

      if (multiplier === 2) {
        // Red Bullseye (Inner)
        onThrow(50, 2, "D-BULL");
      } else {
        // Green Bullseye (Outer)
        onThrow(25, 1, "BULL");
      }
    } else {
      // Standard Number Logic (1-20)
      const label = `${multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S'}${score}`;
      onThrow(score, multiplier, label);
    }

    setPendingNum("");
  };

  return (
    <div className="w-full max-w-lg bg-black/95 border-t-4 pt-2 px-6 pb-2 flex flex-col items-center shadow-2xl backdrop-blur-xl rounded-t-[2.5rem]" style={{ borderColor: color }}>
      
      {/* 1. COMPACT HEADER */}
      <div className="flex items-center justify-between w-full mb-1">
        <div className="flex gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
              i < dartsThrownCount ? 'bg-red-600 border-white scale-110 shadow-lg' : 'bg-transparent border-white/10'
            }`}>
              {i < dartsThrownCount && <span className="text-[8px]">🎯</span>}
            </div>
          ))}
        </div>

        <p className="text-cyan-400 font-black uppercase text-[10px] tracking-widest italic">
          {activeGooierName}'S TURN
        </p>

        <button onClick={onEndTurn} className="text-[8px] font-black uppercase text-white/30 hover:text-white border border-white/10 px-2 py-1 rounded">
          END TURN
        </button>
      </div>

      {/* 2. THE CONSOLE */}
      <div className="flex gap-4 items-center justify-center w-full">
        
        {/* BIG DISPLAY */}
        <div className="w-24 h-16 bg-slate-900 border-2 border-white/10 rounded-xl flex items-center justify-center text-4xl font-black text-white shadow-inner tabular-nums">
          {pendingNum || "00"}
        </div>

        {/* NUMPAD GRID */}
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => addDigit(n.toString())} className="w-11 h-11 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black active:translate-y-0.5 transition-all text-white">{n}</button>
          ))}
          <button onClick={() => setPendingNum("")} className="w-11 h-11 bg-red-900 rounded-lg font-black text-[9px] border-b-2 border-black text-white">CLR</button>
          <button onClick={() => addDigit("0")} className="w-11 h-11 bg-slate-800 rounded-lg font-black text-lg border-b-2 border-black text-white">0</button>
          <button onClick={() => setPendingNum("25")} className="w-11 h-11 bg-white text-black rounded-lg font-black text-[9px] border-b-2 border-slate-400 uppercase italic">Bull</button>
        </div>

        {/* MULTIPLIERS */}
        <div className="flex flex-col gap-1">
          <button onClick={() => handleAction(1)} className="w-24 py-3.5 bg-slate-700 rounded-lg font-black text-[9px] uppercase italic hover:bg-slate-600 text-white">Single</button>
          <button onClick={() => handleAction(2)} className="w-24 py-3.5 bg-blue-600 rounded-lg font-black text-[9px] uppercase italic hover:bg-blue-500 shadow-lg text-white">Double</button>
          <button 
            onClick={() => handleAction(3)} 
            disabled={pendingNum === "25"}
            className={`w-24 py-3.5 rounded-lg font-black text-[9px] uppercase italic transition-all ${
              pendingNum === "25" ? 'bg-slate-900 text-slate-700 opacity-50 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500 shadow-lg'
            }`}
          >
            Triple
          </button>
        </div>
      </div>
    </div>
  );
};