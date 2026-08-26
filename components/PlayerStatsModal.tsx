'use client';
import { useEffect, useState } from 'react';
import { ProfileService } from '../lib/services/profileService';

export const PlayerStatsModal = ({ player, onClose, onSelect, onDelete }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure we are passing a string ID
    ProfileService.getPlayerStats(String(player.id)).then(res => {
      setStats(res);
      setLoading(false);
    });
  }, [player.id]);

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative bg-[#0a0f1a] border-4 border-slate-800 p-8 md:p-12 rounded-[3.5rem] max-w-xl w-full shadow-2xl overflow-hidden">
        
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-10">
          <img src={String(player.avatar_url)} className="w-24 h-24 rounded-full border-4 border-cyan-500 shadow-lg object-cover bg-black" alt="" />
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
              {String(player.username)}
            </h2>
            <p className="text-cyan-500 font-black uppercase text-[10px] tracking-[0.4em] mt-2">Verified Legend</p>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
             <p className="font-black italic text-slate-700 animate-pulse uppercase tracking-widest">Scanning History...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatBox label="Wins" value={String(stats.won)} color="text-green-400" />
              <StatBox label="Win Rate" value={`${String(stats.winRate)}%`} color="text-cyan-400" />
              <StatBox label="Matches" value={String(stats.played)} color="text-white" />
              <StatBox label="Losses" value={String(stats.lost)} color="text-red-500" />
            </div>

            {/* Records List */}
            <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Bar Records Held</h3>
              {stats.records && stats.records.length > 0 ? (
                <div className="space-y-2">
                  {stats.records.map((r: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{String(r.game_mode).replace('ARCADE_', '')}</p>
                      <p className="text-xs font-black text-yellow-500 uppercase italic">
                        {String(r.record_type).replace('_', ' ')}: {String(r.value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700 italic">No records in the database.</p>
              )}
            </div>

            {/* Battle Actions */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <button 
                onClick={() => onSelect(player)} 
                className="bg-cyan-600 hover:bg-cyan-500 p-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition active:scale-95 text-white"
              >
                ENGAGE gooier
              </button>
              <button 
                onClick={onClose} 
                className="bg-slate-800 hover:bg-slate-700 p-5 rounded-2xl font-black uppercase text-xs tracking-widest transition text-slate-300"
              >
                GO BACK
              </button>
              <button 
                onClick={() => { if(confirm("PERMANENTLY DELETE THIS gooier?")) onDelete(player.id); }} 
                className="col-span-2 text-[9px] font-black text-red-900 hover:text-red-500 transition-colors uppercase tracking-[0.5em] py-2"
              >
                Terminate Roster Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center shadow-inner">
    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
  </div>
);