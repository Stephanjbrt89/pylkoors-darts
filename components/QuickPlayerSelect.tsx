'use client';

import { useEffect, useState } from 'react';
import { ProfileService } from '../lib/services/profileService';

export const QuickPlayerSelect = ({ onSelect }: { onSelect: (player: any) => void }) => {
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    ProfileService.getPlayers().then(setPlayers);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <h2 className="text-4xl font-black italic text-white mb-2 uppercase tracking-tighter">Who's Shooting?</h2>
      <p className="text-slate-500 mb-12 uppercase font-bold text-xs tracking-widest">Select a gooier to start the match</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {players.map((p) => (
          <button 
            key={p.id}
            onClick={() => {
              localStorage.setItem('pylkoors_player', JSON.stringify(p));
              onSelect(p);
            }}
            className="group bg-slate-900 border-4 border-slate-800 p-4 rounded-[2rem] hover:border-red-600 transition-all"
          >
            <img src={p.avatar_url} className="w-full aspect-square mb-4 rounded-xl" alt="" />
            <p className="font-black uppercase italic tracking-tighter text-sm truncate">{p.username}</p>
          </button>
        ))}
        <a href="/players" className="bg-slate-900/30 border-4 border-dashed border-slate-800 p-4 rounded-[2rem] flex items-center justify-center font-black text-slate-700 hover:text-white transition">
           + NEW
        </a>
      </div>
    </div>
  );
};