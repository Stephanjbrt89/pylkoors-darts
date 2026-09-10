// components/SquadSelect.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProfileService } from '../lib/services/profileService';

interface Props {
  gameName: string;
  minPlayers?: number;
  maxPlayers?: number;
  onStart: (players: any[]) => void;
  onCancel: () => void;
}

export const SquadSelect = ({ gameName, minPlayers = 1, maxPlayers = 4, onStart, onCancel }: Props) => {
  const [roster, setRoster] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);

  useEffect(() => {
    ProfileService.getPlayers().then(setRoster).catch(() => {});
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('pylkoors_player') : null;
      if (saved && saved !== "[object Object]") {
        const p = JSON.parse(saved);
        if (p && p.username) setSelected([p]);
      }
    } catch {}
  }, []);

  const togglePlayer = (player: any) => {
    const isAlreadySelected = selected.some(p => String(p.id) === String(player.id));
    if (isAlreadySelected) {
      setSelected(selected.filter(p => String(p.id) !== String(player.id)));
    } else if (selected.length < maxPlayers) {
      setSelected([...selected, player]);
    } else if (maxPlayers === 1) {
      // Allow switching player directly in solo modes
      setSelected([player]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center p-8 overflow-y-auto">
      <div className="max-w-4xl w-full text-center pb-20">
        <h2 className="text-5xl font-black italic text-white mb-2 uppercase tracking-tighter">SQUAD SELECT</h2>
        <p className="text-red-600 font-bold tracking-[0.3em] mb-12 uppercase text-xs">Game: {gameName}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[...Array(maxPlayers)].map((_, i) => {
            const p = selected[i];
            return (
              <div 
                key={i} 
                onClick={() => {
                  if (p) setSelected(selected.filter((_, idx) => idx !== i));
                }}
                className={`aspect-[3/4] rounded-[2rem] border-4 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 cursor-pointer ${
                  p ? 'border-red-600 bg-red-950/20 shadow-[0_0_30px_rgba(220,38,38,0.3)] scale-105 hover:border-white' : 'border-slate-800 bg-slate-900/50 grayscale opacity-40'
                }`}
              >
                {p ? (
                  <>
                    <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 w-full bg-red-600 p-2 text-[10px] font-black italic uppercase flex justify-between items-center px-3">
                      <span>Player 0{i+1}</span>
                      <span className="text-[8px] opacity-75">TAP TO REMOVE</span>
                    </div>
                  </>
                ) : (
                  <span className="text-4xl font-black text-slate-800 italic uppercase">P0{i+1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Available Legends ({roster.length})</h3>
          <Link href="/players" className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition">
            + New Player Profile
          </Link>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-16">
          {roster.map(p => {
            const isSelected = selected.some(s => String(s.id) === String(p.id));
            return (
              <button 
                key={p.id} 
                onClick={() => togglePlayer(p)}
                className={`p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-cyan-400 bg-cyan-950/40 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-slate-800 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                }`}
              >
                <img src={p.avatar_url} className="w-full aspect-square rounded-xl object-cover mb-2" alt="" />
                <p className="text-[9px] font-black truncate uppercase tracking-tighter">{p.username}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            {/* FIXED: Changed text to BACK TO LOBBY */}
            <button onClick={onCancel} className="order-2 md:order-1 px-12 py-4 rounded-full font-black text-[10px] text-slate-500 uppercase tracking-widest border-2 border-slate-800 hover:text-white hover:border-white transition">
                BACK TO LOBBY
            </button>
            <button disabled={selected.length < minPlayers} onClick={() => onStart(selected)}
                className="order-1 md:order-2 px-20 py-5 rounded-[2rem] font-black text-2xl bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:bg-red-500 transition disabled:opacity-10 uppercase italic">
                {selected.length === 1 ? 'SOLO RUN' : 'START MATCH'}
            </button>
        </div>
      </div>
    </div>
  );
};