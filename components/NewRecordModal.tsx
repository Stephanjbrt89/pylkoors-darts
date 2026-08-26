'use client';
import React from 'react';
import { ArcadeLogo } from './ArcadeLogo';
import Link from 'next/link';

interface Props {
  show: boolean;
  type: string;
  value: number;
  playerName: string;
}

export const NewRecordModal = ({ show, type, value, playerName }: Props) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
      {/* Golden Shine Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative text-center flex flex-col items-center max-w-xl animate-in zoom-in duration-700 delay-300">
        <div className="mb-8 scale-110">
          <ArcadeLogo />
        </div>
        
        {/* Achievement Badge */}
        <div className="bg-yellow-500 text-black font-black px-8 py-2 rotate-3 text-2xl mb-8 shadow-[0_0_30px_rgba(245,158,11,0.5)] uppercase italic tracking-tighter">
          BAR RECORD BROKEN!
        </div>

        {/* Player Name */}
        <h2 className="text-6xl md:text-8xl font-black italic text-white uppercase tracking-tighter leading-none mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
          {playerName}
        </h2>
        
        {/* Record Type */}
        <p className="text-amber-500 font-black text-2xl uppercase tracking-[0.4em] mb-10 animate-pulse">
          {type.replace('_', ' ')}
        </p>

        {/* The Massive Value */}
        <div className="text-[12rem] font-black leading-none text-white italic drop-shadow-[0_0_60px_rgba(251,191,36,0.7)] mb-12 tabular-nums">
          {value}
        </div>

        {/* THE NEW BUTTON: BACK TO LOBBY */}
        <div className="flex flex-col gap-4 w-full">
          <Link 
            href="/" 
            className="group relative bg-white text-black px-16 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-tighter hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95"
          >
            <span className="relative z-10">Return to Lobby</span>
            <div className="absolute inset-0 bg-yellow-400 rounded-[2rem] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </Link>
          
          <p className="text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">
            Achievement logged to Hall of Fame
          </p>
        </div>
      </div>
    </div>
  );
};