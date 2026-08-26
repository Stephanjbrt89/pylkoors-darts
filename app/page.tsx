'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProfileService } from '../lib/services/profileService';
import { StatsService } from '../lib/services/statsService';
import Link from 'next/link';
import { MainLogoBadge } from '../components/MainLogoBadge';

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
      'ARCADE_HALFEERTJIES': '/halfeertjies'
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
      
      {/* 1. HERO SECTION */}
      <section className="relative w-full">
        <MainLogoBadge />
        
        {/* NAV AREA - Old logo removed from left */}
        <nav className="absolute top-0 w-full z-50 p-6 md:p-12 flex justify-end items-start pointer-events-none">
          <div className="flex flex-col items-end pointer-events-auto">
            {activePlayer ? (
              /* ACTIVE GOOIER STATUS */
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 p-2 pr-6 rounded-full shadow-2xl">
                <img src={activePlayer.avatar_url} className="w-10 h-10 rounded-full bg-black border-2 border-cyan-400 object-cover" alt="" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase leading-none tracking-tighter">Pilot</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter text-white">{activePlayer.username}</p>
                </div>
                <button onClick={() => { localStorage.removeItem('pylkoors_player'); window.location.reload(); }} className="ml-4 text-[10px] bg-red-600 px-3 py-1 rounded font-black transition text-white hover:bg-red-500">EXIT</button>
              </div>
            ) : (
              /* LOWERED SIDE BUTTON (Gooier Selection) */
              <div className="mt-48 lg:mt-64 mr-4 flex flex-col items-end animate-in slide-in-from-right-10 duration-1000">
                <Link href="/players" className="group relative block">
                    <div className="absolute -inset-1 bg-red-600 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                    <button className="relative px-12 py-5 bg-red-600 rounded-2xl font-black text-xl lg:text-2xl uppercase tracking-[0.2em] italic transition-all transform hover:scale-105 active:scale-95 shadow-2xl border-2 border-white/20 text-white">
                        Select Gooier
                    </button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </section>

      {/* 2. DASHBOARD CONTENT */}
      <div className="max-w-[1850px] mx-auto px-6 md:px-10 pb-24 -mt-16 lg:-mt-24 relative z-10">
        <div className="flex flex-col xl:flex-row gap-10 items-start">
          
          {/* GAMES GRID */}
          <div className="w-full xl:flex-grow">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Select Experience
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-6">
              <GameCard title="X01 CLASSIC" subtitle="Competitive" color="from-blue-600/40 to-black" link="/play-test" imageText="🎯" />
              <GameCard title="KILLER TACTICS" subtitle="Elimination" color="from-red-600/40 to-black" link="/killer" imageText="💀" />
              <GameCard title="BAT & BOWL" subtitle="Cricket" color="from-emerald-500/40 to-black" link="/bat-and-bowl" imageText="🏏" />
              <GameCard title="ATW JOURNEY" subtitle="Around World" color="from-sky-400/40 to-black" link="/atw" imageText="🌍" />
              <GameCard title="FIGHT GAME" subtitle="Battle Royale" color="from-red-700/40 to-black" link="/fight" imageText="⚔️" />
              <GameCard title="HALFEERTJIES" subtitle="South African" color="from-yellow-600/40 to-black" link="/halfeertjies" imageText="📉" />
            </div>

            {/* BAR RECORDS */}
            <div className="mt-16 bg-slate-900/40 border-2 border-cyan-500/10 p-8 rounded-[3rem]">
              <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-8">📜 Bar Records</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {records.length > 0 ? records.slice(0, 6).map((rec, i) => (
                  <div key={i} className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                    <img src={rec.profiles?.avatar_url} className="w-12 h-12 rounded-full border-2 border-cyan-500/30 object-cover" alt="" />
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1">{rec.game_mode.replace('ARCADE_', '').replace('_', ' ')}</p>
                      <p className="text-xs font-bold text-white mb-1">{rec.record_type.replace('_', ' ')}</p>
                      <p className="text-2xl font-black text-cyan-400 leading-none">{rec.value} <span className="text-[10px] text-slate-600 uppercase">{rec.record_type.includes('DART') ? 'Darts' : 'Pts'}</span></p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 italic">{rec.profiles?.username}</p>
                    </div>
                  </div>
                )) : <p className="opacity-20 italic text-xs px-4">Hall is currently empty...</p>}
              </div>
            </div>

            {activeMatches.length > 0 && activePlayer && (
              <div className="mt-16">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">Active Sessions</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {activeMatches.map((m) => (
                    <div key={m.id} className="relative flex-shrink-0">
                      <Link href={getMatchLink(m.mode)} className="flex bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl items-center gap-4 hover:border-red-600 transition pr-12 shadow-xl">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-black italic text-white shadow-md">{String(m.mode).charAt(7)}</div>
                        <p className="text-sm font-bold italic uppercase">{String(m.mode).replace('ARCADE_', '')}</p>
                      </Link>
                      <button onClick={(e) => abandonMatch(e, m.id)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-red-500 transition font-black">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* HALL OF FAME */}
          <div className="w-full xl:w-80 flex-shrink-0 lg:mt-[52px] bg-gradient-to-b from-amber-900/30 to-black border-2 border-amber-500/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px]" />
            <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] mb-10 italic">★ Legends</h3>
            <div className="space-y-8 relative z-10">
              {leaderboard.length > 0 ? leaderboard.map((player, i) => (
                <div key={i} className={`flex items-center justify-between group ${i === 0 ? 'scale-105 mb-4' : ''}`}>
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div className={`rounded-full p-1 w-full h-full ${i === 0 ? 'bg-gradient-to-tr from-yellow-600 via-yellow-200 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-slate-800'}`}>
                        <img src={player.avatar} className="w-full h-full rounded-full bg-black object-cover" alt="" />
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-[10px] font-black ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>{i + 1}</span>
                    </div>
                    <div className="flex flex-col">
                      <p className={`font-black italic uppercase tracking-tighter leading-none ${i === 0 ? 'text-yellow-400 text-lg' : 'text-slate-200 text-sm'}`}>{player.username}</p>
                      {i === 0 && <p className="text-[7px] font-black text-amber-600 uppercase tracking-[0.2em] mt-1 italic leading-none">Hall of Fame</p>}
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <p className={`font-black leading-none ${i === 0 ? 'text-3xl text-yellow-400' : 'text-xl text-slate-500'}`}>{player.wins}</p>
                    <p className="text-[8px] font-bold text-amber-700 uppercase mt-1">Wins</p>
                  </div>
                </div>
              )) : <p className="text-center py-20 opacity-20 text-[10px] font-black uppercase tracking-widest leading-tight">Empty Hall</p>}
            </div>
          </div>

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
      <div className="bg-[#111] p-5 flex items-center justify-between border-t border-white/5 flex-grow">
        <div className="overflow-hidden text-left">
          <p className="text-[8px] font-black text-slate-600 uppercase mb-1 tracking-[0.2em] truncate">{subtitle}</p>
          <h4 className="text-[14px] font-black italic tracking-tighter uppercase leading-none">{title}</h4>
        </div>
        <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all rotate-3 group-hover:rotate-12 flex-shrink-0 ml-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
        </div>
      </div>
    </Link>
  );
}