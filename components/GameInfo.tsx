'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface GameInfoProps {
  title: string;
  rules: string[];
  color: string;
}

export const GameInfo = ({ title, rules, color }: GameInfoProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // This ensures the portal only runs on the client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const modalContent = (
    <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center p-6" style={{ zIndex: 999999 }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md" 
        onClick={() => setIsOpen(false)} 
      />

      {/* The Content Box - FORCED WIDTH */}
      <div 
        className="relative bg-[#0f172a] border-4 p-8 md:p-12 rounded-[3rem] shadow-2xl overflow-hidden"
        style={{ 
            borderColor: color,
            width: 'min(500px, 90vw)', // Forces it to be wide
            maxHeight: '90vh'
        }}
      >
        <h3 className="text-4xl font-black italic mb-2 uppercase tracking-tighter" style={{ color }}>
          {title}
        </h3>
        <p className="text-white/50 text-xs font-black tracking-[0.3em] mb-10 uppercase italic">Ground Rules</p>
        
        <div className="space-y-6 mb-12">
          {rules.map((rule, i) => (
            <div key={i} className="flex gap-5 items-start">
              <span className="text-xl font-black italic opacity-40" style={{ color }}>
                0{i + 1}
              </span>
              <p className="text-lg font-bold text-slate-100 leading-tight tracking-tight">
                {rule}
              </p>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setIsOpen(false)}
          className="w-full py-6 rounded-2xl font-black text-2xl uppercase tracking-widest bg-white text-black hover:bg-slate-200 transition-all shadow-xl"
        >
          LEKKER
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 rounded-full border-2 border-white/20 text-white flex items-center justify-center font-serif italic text-2xl bg-black/40 hover:bg-white/10 transition-all"
      >
        i
      </button>

      {/* If open and on client-side, teleport the modal to the body tag */}
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
};