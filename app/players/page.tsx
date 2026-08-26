'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileService } from '../../lib/services/profileService';
import { ArcadeLogo } from '../../components/ArcadeLogo';
import { PlayerStatsModal } from '../../components/PlayerStatsModal';
import Link from 'next/link';

const LOCAL_AVATARS = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, url: `/avatars/${i + 1}.jpg` }));

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(LOCAL_AVATARS[0].url);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<any>(null);
  const router = useRouter();

  useEffect(() => { loadPlayers(); }, []);

  const loadPlayers = async () => {
    try {
      const p = await ProfileService.getPlayers();
      setPlayers(p || []);
    } catch (e) { console.error(e); }
  };

  const addPlayer = async () => {
    if (!name || isAdding) return;
    setIsAdding(true);
    try {
      await ProfileService.createPlayer(name, selectedAvatar);
      setName('');
      await loadPlayers();
    } catch (err) { console.error(err); } 
    finally { setIsAdding(false); }
  };

  const selectPlayer = (player: any) => {
    // ENSURE WE ONLY SAVE STRINGS, NOT OBJECTS
    const safePlayer = {
        id: String(player.id),
        username: String(player.username),
        avatar_url: String(player.avatar_url)
    };
    localStorage.setItem('pylkoors_player', JSON.stringify(safePlayer));
    router.push('/');
  };

  const handleDelete = async (id: string) => {
    try {
      await ProfileService.deletePlayer(String(id));
      setSelectedPlayerForStats(null);
      loadPlayers();
    } catch (e) { alert("Could not delete. Active matches might be linked."); }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-12 max-w-5xl">
          <Link href="/" className="bg-slate-900 border-2 border-slate-800 px-6 py-2 rounded-full text-[10px] font-black tracking-widest hover:border-white transition">BACK TO LOBBY</Link>
          <div className="scale-50"><ArcadeLogo /></div>
          <div className="w-20" />
        </div>

        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-12 animate-pulse">Choose Your Legend</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full mb-20 max-w-5xl">
          {players.map((p) => (
            <button 
                key={p.id} 
                onClick={() => setSelectedPlayerForStats(p)}
                className="w-full bg-slate-900 border-4 border-slate-800 p-4 rounded-[2rem] transition-all shadow-xl flex flex-col items-center hover:border-cyan-500 hover:scale-105 active:scale-95 group"
            >
                <div className="w-full aspect-square mb-4 rounded-xl overflow-hidden bg-black border-2 border-white/5 group-hover:border-cyan-500/50 transition-colors">
                    <img src={String(p.avatar_url)} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="font-black truncate w-full uppercase italic tracking-tighter text-[11px] text-center text-slate-400 group-hover:text-white">
                    {String(p.username)}
                </p>
            </button>
          ))}
        </div>

        <div className="bg-slate-900/50 p-10 rounded-[3.5rem] border-4 border-slate-800/50 w-full max-w-4xl shadow-2xl">
            <h3 className="text-center font-black uppercase mb-10 text-slate-600 tracking-[0.4em] text-xs">New Gooier Entry</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="grid grid-cols-4 gap-3">
                    {LOCAL_AVATARS.map((avatar) => (
                        <button key={avatar.id} onClick={() => setSelectedAvatar(avatar.url)} className={`aspect-square rounded-2xl border-4 transition-all overflow-hidden bg-black ${selectedAvatar === avatar.url ? 'border-red-600 scale-110 shadow-lg shadow-red-600/30' : 'border-slate-800 opacity-30 hover:opacity-100'}`}>
                            <img src={avatar.url} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                </div>
                <div className="flex flex-col items-center justify-center border-l border-slate-800/50 pl-0 lg:pl-12">
                    <div className="w-32 h-32 bg-black rounded-[2.5rem] border-4 border-red-600 p-2 mb-8 shadow-2xl overflow-hidden"><img src={selectedAvatar} className="w-full h-full object-cover rounded-[1.5rem]" alt="" /></div>
                    <input type="text" placeholder="NICKNAME" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} maxLength={12} className="w-full bg-black border-2 border-slate-800 p-4 rounded-2xl font-black text-center text-xl mb-6 outline-none focus:border-red-600 text-white placeholder:text-slate-800" />
                    <button onClick={addPlayer} disabled={!name || isAdding} className="w-full bg-red-600 p-6 rounded-2xl font-black text-2xl hover:bg-red-500 active:scale-95 transition-all shadow-xl disabled:opacity-20 uppercase italic italic tracking-tighter text-white">Join Roster</button>
                </div>
            </div>
        </div>

        {selectedPlayerForStats && (
            <PlayerStatsModal 
                player={selectedPlayerForStats} 
                onClose={() => setSelectedPlayerForStats(null)} 
                onSelect={selectPlayer}
                onDelete={handleDelete}
            />
        )}
      </div>
    </main>
  );
}