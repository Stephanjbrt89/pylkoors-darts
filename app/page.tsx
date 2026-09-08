'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProfileService } from '../lib/services/profileService';
import { StatsService } from '../lib/services/statsService';
import Link from 'next/link';
import { MainLogoBadge } from '../components/MainLogoBadge';
import { ArcadeLogo } from '../components/ArcadeLogo';

export default function Home() {
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [activePlayer, setActivePlayer] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const initializeLobby = async () => {
      const saved = localStorage.getItem('pylkoors_player');
      if (saved && saved !== "[object Object]") {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username) setActivePlayer(parsed);
        } catch (e) {
          localStorage.removeItem('pylkoors_player');
        }
      }

      try {
        const [matchData, leaderData, recordData] = await Promise.all([
          supabase.from('matches').select('*').eq('status', 'IN_PROGRESS').order('created_at', { ascending: false }).limit(6),
          ProfileService.getLeaderboard(),
          StatsService.getGlobalRecords()
        ]);

        if (matchData.data) setActiveMatches(matchData.data);
        setLeaderboard(leaderData || []);
        setRecords(recordData || []);
      } catch (err) {
        console.error("Lobby Load Error:", err);
      }
    };
    initializeLobby();
  }, []);

  const getMatchLink = (mode: string) => {
    const links: Record<string, string> = {
      'X01_501': '/play-test',
      'ARCADE_KILLER': '/killer',
      'ARCADE_ATW': '/atw',
      'bat_and_bowl': '/bat-and-bowl',
      'ARCADE_FIGHT': '/fight',
      'ARCADE_HALFEERTJIES': '/halfeertjies',
      'ARCADE_GOLF': '/golf',
      'ARCADE_BRANDY': '/brandy'
    };
    return links[mode] || '/';
  };

  const abandonMatch = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("End this match session?")) {
      const { error } = await supabase.from('matches').update({ status: 'ABANDONED' }).eq('id', id);
      if (!error) setActiveMatches(prev => prev.filter(m => m.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      
      <section className="relative w-full">
        <MainLogoBadge />
        <nav className="absolute top-0 w-full z-50 p-6 md:p-10 flex justify-end items-center pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            {activePlayer ? (
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 p-2 pr-6 rounded-full shadow-2xl">
                <img src={activePlayer.avatar_url} className="w-10 h-10 rounded-full bg-black border-2 border-cyan-400 object-cover" alt="" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase leading-none tracking-tighter">Pilot</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter text-white">{activePlayer.username}</p>
                </div>
                <button onClick={() => { localStorage.removeItem('pylkoors_player'); window.location.reload(); }} className="ml-4 text-[10px] bg-red-600 px-3 py-1 rounded font-black transition text-white hover:bg-red-500">EXIT</button>
              </div>
            ) : (
              <div className="mt-64 mr-4 animate-in slide-in-from-right-10 duration-1000">
                <Link href="/players" className="group relative block">
                    <div className="absolute -inset-1 bg-red-600 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <button className="relative px-12 py-5 bg-red-600 rounded-2xl font-black text-xl lg:text-2xl uppercase tracking-[0.2em] italic transition shadow-2xl border-2 border-white/20 text-white">
                        Select Gooier
                    </button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </section>

      <div className="max-w-[1850px] mx-auto px-6 md:px-10 pb-24 -mt-24 relative z-10">
        <div className="flex flex-col xl:flex-row gap-10 items-start">
          
          <div className="w-full xl:flex-grow">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Select Experience
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              <GameCard title="X01 CLASSIC" subtitle="Competitive" color="from-blue-600/40 to-black" link="/play-test" imageText="🎯" />
              <GameCard title="KILLER TACTICS" subtitle="Elimination" color="from-red-600/40 to-black" link="/killer" imageText="💀" />
              <GameCard title="BAT & BOWL" subtitle="Cricket" color="from-emerald-500/40 to-black" link="/bat-and-bowl" imageText="🏏" />
              <GameCard title="ATW JOURNEY" subtitle="Around World" color="from-sky-400/40 to-black" link="/atw" imageText="🌍" />
              <GameCard title="FIGHT GAME" subtitle="Battle Royale" color="from-red-700/40 to-black" link="/fight" imageText="⚔️" />
              <GameCard title="HALFEERTJIES" subtitle="South African" color="from-yellow-600/40 to-black" link="/halfeertjies" imageText="📉" />
              <GameCard title="DARTS GOLF" subtitle="Precision" color="from-emerald-600/40 to-black" link="/golf" imageText="⛳" />
              
              {/* NEW CABINET: BRANDY SPECIAL */}
              <GameCard title="BRANDY SPECIAL" subtitle="Pub Classic" color="from-amber-600/40 to-black" link="/brandy" imageText="🥃" />
            </div>

            <div className="mt-16 bg-slate-900/40 border-2 border-cyan-500/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px]" />
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-8 relative z-10">📜 Bar World Records</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {records.length > 0 ? records.map((rec, i) => (
                  <div key={rec.id} className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-cyan-500/50 transition-all">
                    <div className="relative">
                        <img src={rec.profiles?.avatar_url || '/avatars/1.jpg'} className="w-14 h-14 rounded-full border-2 border-cyan-500/30 object-cover bg-black" alt="" />
                        {i === 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span></span>}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">{String(rec.game_mode).replace('ARCADE_', '').replace('_', ' ')}</p>
                      <p className="text-xs font-bold text-white mb-1">{String(rec.record_type).replace('_', ' ')}</p>
                      <p className="text-2xl font-black text-cyan-400 leading-none">{rec.value} <span className="text-[10px] text-slate-600 uppercase">{rec.record_type.includes('DART') ? 'Darts' : rec.record_type === 'ACCURACY' ? '%' : 'Pts'}</span></p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 italic">{rec.profiles?.username}</p>
                    </div>
                  </div>
                )) : <p className="opacity-20 italic text-xs px-4">Awaiting house records...</p>}
              </div>
            </div>
            {/* ... rest of page ... */}
          </div>
          {/* ... hall of fame ... */}
        </div>
      </div>
    </main>
  );
}

function GameCard({ title, color, link, imageText, subtitle }: any) {
  return (
    <Link href={link} className="group block relative rounded-[2rem] overflow-hidden border-4 border-slate-900 hover:border-white transition-all duration-500 shadow-2xl h-full flex flex-col min-h-[220px]">
      <div className={`h-40 bg-gradient-to-br ${color} flex items-center justify-center relative overflow-hidden`}>
        <span className="text-7xl group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] select-none">{imageText}</span>
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 group-hover:bg-white/40 transition-colors" />
      </div>
      <div className="bg-[#111] p-5 flex items-center justify-between border-t border-white/5 flex-grow text-left">
        <div>
          <p className="text-[8px] font-black text-slate-600 uppercase mb-1 tracking-[0.2em] truncate">{subtitle}</p>
          <h4 className="text-[14px] font-black italic tracking-tighter uppercase leading-none truncate">{title}</h4>
        </div>
        <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all rotate-3 group-hover:rotate-12 flex-shrink-0 ml-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
        </div>
      </div>
    </Link>
  );
}