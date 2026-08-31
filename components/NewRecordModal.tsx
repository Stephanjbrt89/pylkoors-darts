'use client';
import React from 'react';
import { ArcadeLogo } from './ArcadeLogo';
import Link from 'next/link';

export const NewRecordModal = ({ show, type, value, playerName }: { show: boolean, type: string, value: number, playerName: string }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
      {/* Golden Rays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(251,191,36,0.15)_0%,transparent_70%)] animate-pulse" />
      
      <div className="relative text-center flex flex-col items-center max-w-2xl animate-in zoom-in duration-700">
        <div className="mb-10 scale-125">
          <ArcadeLogo />
        </div>
        
        <div className="bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-black font-black px-10 py-3 rotate-2 text-3xl mb-10 shadow-[0_0_50px_rgba(251,191,36,0.6)] uppercase italic tracking-tighter">
          WORLD RECORD SMASHED!
        </div>

        <h2 className="text-8xl md:text-9xl font-black italic text-white uppercase tracking-tighter leading-none mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
          {playerName}
        </h2>
        
        <p className="text-amber-500 font-black text-3xl uppercase tracking-[0.5em] mb-12 animate-pulse">
          {type.replace('_', ' ')}
        </p>

        <div className="text-[14rem] leading-none font-black text-white italic drop-shadow-[0_0_70px_rgba(251,191,36,0.8)] mb-16 tabular-nums">
          {value}
        </div>

        <Link 
          href="/" 
          className="bg-white text-black px-20 py-8 rounded-full font-black text-3xl uppercase tracking-tighter hover:scale-110 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] italic"
        >
          CLAIM GLORY
        </Link>
      </div>
    </div>
  );
};