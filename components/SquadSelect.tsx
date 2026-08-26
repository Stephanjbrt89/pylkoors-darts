// components/SquadSelect.tsx
'use client';
import { useState, useEffect } from 'react';
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
    ProfileService.getPlayers().then(setRoster);
    const saved = localStorage.getItem('pylkoors_player');
    if (saved && saved !== "[object Object]") {
      const p = JSON.parse(saved);
      setSelected([p]);
    }
  }, []);

  const togglePlayer = (player: any) => {
    if (selected.find(p => p.id === player.id)) {
      setSelected(selected.filter(p => p.id !== player.id));
    } else if (selected.length < maxPlayers) {
      setSelected([...selected, player]);
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
              <div key={i} className={`aspect-[3/4] rounded-[2rem] border-4 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
                p ? 'border-red-600 bg-red-950/20 shadow-[0_0_30px_rgba(220,38,38,0.3)] scale-105' : 'border-slate-800 bg-slate-900/50 grayscale opacity-40'
              }`}>
                {p ? (
                  <>
                    <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 w-full bg-red-600 p-2 text-[10px] font-black italic uppercase">Player 0{i+1}</div>
                  </>
                ) : (
                  <span className="text-4xl font-black text-slate-800 italic uppercase">P0{i+1}</span>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="text-left text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6">Available Legends</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-16">
          {roster.map(p => (
            <button key={p.id} onClick={() => togglePlayer(p)}
                className={`p-2 rounded-2xl border-2 transition-all ${
                    selected.find(s => s.id === p.id) ? 'border-white bg-white/10 scale-110' : 'border-slate-800 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                }`}>
              <img src={p.avatar_url} className="w-full aspect-square rounded-xl object-cover mb-2" alt="" />
              <p className="text-[9px] font-black truncate uppercase tracking-tighter">{p.username}</p>
            </button>
          ))}
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