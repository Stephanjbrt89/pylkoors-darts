'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ProfileService } from '../lib/services/profileService';
import { StatsService } from '../lib/services/statsService';
import Link from 'next/link';
import { MainLogoBadge } from '../components/MainLogoBadge';
import { ArcadeLogo } from '../components/ArcadeLogo';
import { AutodartsStatusBadge } from '../components/AutodartsStatusBadge';
import {
  Target,
  Skull,
  Shield,
  Globe,
  Swords,
  TrendingDown,
  Flag,
  Wine,
  Trophy,
  ScrollText,
  Play,
} from 'lucide-react';

export default function Home() {
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [activePlayer, setActivePlayer] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const initializeLobby = async () => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('pylkoors_player') : null;
        if (saved && saved !== "[object Object]") {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.username) setActivePlayer(parsed);
          } catch (e) {
            localStorage.removeItem('pylkoors_player');
          }
        }
      } catch (err) {
        console.warn("Storage access restricted:", err);
      }

      try {
        // Fetch via first-party API route with direct Supabase fallback
        const lobbyRes = await fetch('/api/lobby', { cache: 'no-store' });
        if (lobbyRes.ok) {
          const json = await lobbyRes.json();
          if (json.activeMatches) setActiveMatches(json.activeMatches);
          if (json.leaderboard) setLeaderboard(json.leaderboard);
          if (json.records) setRecords(json.records);
        } else {
          throw new Error('API route fallback');
        }
      } catch {
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
            <AutodartsStatusBadge />
            {activePlayer ? (
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 p-2 pr-6 rounded-full shadow-2xl">
                <img src={activePlayer.avatar_url} className="w-10 h-10 rounded-full bg-black border-2 border-cyan-400 object-cover" alt="" />
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase leading-none tracking-tighter">Pilot</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter text-white">{activePlayer.username}</p>
                </div>
                <Link href="/players" className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded font-black transition text-slate-300">CHANGE</Link>
                <button onClick={() => { try { localStorage.removeItem('pylkoors_player'); } catch {} window.location.reload(); }} className="ml-1 text-[10px] bg-red-600 px-3 py-1 rounded font-black transition text-white hover:bg-red-500">EXIT</button>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-5 duration-700">
                <Link href="/players" className="group relative inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-black text-sm lg:text-base uppercase tracking-widest italic transition shadow-2xl border border-white/20 text-white active:scale-95">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Select Gooier
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
              <GameCard title="X01 CLASSIC" subtitle="Competitive" color="from-blue-600/40 to-black" link="/play-test" icon={<Target className="w-16 h-16 text-blue-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(59,130,246,0.35)] border-blue-500/30" />
              <GameCard title="KILLER TACTICS" subtitle="Elimination" color="from-red-600/40 to-black" link="/killer" icon={<Skull className="w-16 h-16 text-rose-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(244,63,94,0.35)] border-rose-500/30" />
              <GameCard title="BAT & BOWL" subtitle="Cricket" color="from-emerald-500/40 to-black" link="/bat-and-bowl" icon={<Shield className="w-16 h-16 text-emerald-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(16,185,129,0.35)] border-emerald-500/30" />
              <GameCard title="ATW JOURNEY" subtitle="Around World" color="from-sky-400/40 to-black" link="/atw" icon={<Globe className="w-16 h-16 text-sky-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(56,189,248,0.35)] border-sky-400/30" />
              <GameCard title="FIGHT GAME" subtitle="Battle Royale" color="from-red-700/40 to-black" link="/fight" icon={<Swords className="w-16 h-16 text-red-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(239,68,68,0.35)] border-red-500/30" />
              <GameCard title="HALFEERTJIES" subtitle="South African" color="from-yellow-600/40 to-black" link="/halfeertjies" icon={<TrendingDown className="w-16 h-16 text-yellow-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(250,204,21,0.35)] border-yellow-500/30" />
              <GameCard title="DARTS GOLF" subtitle="Precision" color="from-emerald-600/40 to-black" link="/golf" icon={<Flag className="w-16 h-16 text-emerald-300" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(52,211,153,0.35)] border-emerald-400/30" />
              
              {/* NEW CABINET: BRANDY SPECIAL */}
              <GameCard title="BRANDY SPECIAL" subtitle="Pub Classic" color="from-amber-600/40 to-black" link="/brandy" icon={<Wine className="w-16 h-16 text-amber-400" strokeWidth={2.2} />} glow="shadow-[0_0_30px_rgba(245,158,11,0.35)] border-amber-500/30" />
            </div>

            {activeMatches.length > 0 && activePlayer && (
              <div className="mt-12">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> Active Sessions
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {activeMatches.map((m) => (
                    <div key={m.id} className="relative flex-shrink-0">
                      <Link href={getMatchLink(m.mode)} className="flex bg-slate-900 border-2 border-slate-800 p-4 rounded-2xl items-center gap-4 hover:border-red-600 transition pr-12 shadow-xl">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-black italic text-white shadow-md">
                          {String(m.mode).charAt(7) || <Target className="w-5 h-5" />}
                        </div>
                        <p className="text-sm font-bold italic uppercase tracking-tighter">
                          {String(m.mode).replace('ARCADE_', '').replace('_', ' ')}
                        </p>
                      </Link>
                      <button 
                        onClick={(e) => abandonMatch(e, m.id)} 
                        title="Abandon Session"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 transition font-black p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR: HALL OF FAME & BAR RECORDS */}
          <div className="w-full xl:w-88 2xl:w-96 flex-shrink-0 xl:mt-[47px] space-y-8">
            
            {/* HALL OF FAME / LEGENDS */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-950 to-black border-2 border-amber-500/30 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px]" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] italic flex items-center gap-2">
                  ★ Hall of Fame
                </h3>
                <span className="text-[9px] font-black uppercase text-amber-500/60 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Top Legends
                </span>
              </div>

              <div className="space-y-6 relative z-10">
                {leaderboard.length > 0 ? (
                  leaderboard.map((player, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between group transition-transform ${
                        i === 0 ? 'bg-amber-950/30 border border-amber-500/40 p-4 rounded-3xl shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.02]' : 'p-2'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-grow min-w-0">
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <div className={`rounded-full p-1 w-full h-full ${
                            i === 0 
                              ? 'bg-gradient-to-tr from-yellow-600 via-yellow-200 to-amber-600 shadow-[0_0_15px_rgba(251,191,36,0.6)]' 
                              : i === 1 
                              ? 'bg-gradient-to-tr from-slate-400 to-slate-200 shadow-md'
                              : i === 2 
                              ? 'bg-gradient-to-tr from-amber-700 to-amber-500'
                              : 'bg-slate-800'
                          }`}>
                            <img 
                              src={player.avatar || '/avatars/1.jpg'} 
                              className="w-full h-full rounded-full bg-black object-cover" 
                              alt={player.username} 
                            />
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full border-2 border-black text-[10px] font-black ${
                            i === 0 
                              ? 'bg-yellow-400 text-black shadow-md' 
                              : i === 1 
                              ? 'bg-slate-300 text-black' 
                              : i === 2 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-700 text-white'
                          }`}>
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className={`font-black italic uppercase tracking-tighter truncate ${
                            i === 0 ? 'text-yellow-400 text-lg' : 'text-slate-200 text-sm'
                          }`}>
                            {player.username}
                          </p>
                          {i === 0 && (
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] mt-0.5 italic">
                              Undisputed King
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`font-black leading-none ${i === 0 ? 'text-3xl text-yellow-400' : 'text-xl text-slate-400'}`}>
                          {player.wins}
                        </p>
                        <p className="text-[8px] font-bold text-amber-600 uppercase mt-1 tracking-wider">Wins</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 opacity-30">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Empty Hall</p>
                    <p className="text-[8px] text-slate-500 mt-1">Finish matches to claim the throne</p>
                  </div>
                )}
              </div>
            </div>

            {/* BAR WORLD RECORDS */}
            <div className="bg-slate-900/40 border-2 border-cyan-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px]" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] italic flex items-center gap-2">
                  <ScrollText className="w-4 h-4" /> Bar Records
                </h3>
                <span className="text-[9px] font-black uppercase text-cyan-400/70 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  Hall Records
                </span>
              </div>
              <div className="space-y-4 relative z-10">
                {records.length > 0 ? records.map((rec, i) => (
                  <div key={rec.id || i} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 group hover:border-cyan-500/50 transition-all">
                    <div className="relative flex-shrink-0">
                      <img src={rec.profiles?.avatar_url || '/avatars/1.jpg'} className="w-12 h-12 rounded-full border-2 border-cyan-500/30 object-cover bg-black" alt="" />
                      {i === 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1 truncate">
                        {String(rec.game_mode).replace('ARCADE_', '').replace('_', ' ')}
                      </p>
                      <p className="text-xs font-bold text-white mb-0.5 truncate">
                        {String(rec.record_type).replace('_', ' ')}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase italic truncate">
                        {rec.profiles?.username || 'ANON'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-2xl font-black text-cyan-400 leading-none">{rec.value}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mt-1">
                        {rec.record_type.includes('DART') ? 'Darts' : rec.record_type === 'ACCURACY' ? '%' : 'Pts'}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-30">
                    <ScrollText className="w-7 h-7 mx-auto mb-1 text-cyan-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-tight">No House Records</p>
                    <p className="text-[8px] text-slate-500 mt-1">Break records in any game to post here</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

function GameCard({ title, color, link, icon, glow, subtitle }: any) {
  return (
    <Link href={link} className="group block relative rounded-[2rem] overflow-hidden border-4 border-slate-900 hover:border-white transition-all duration-500 shadow-2xl h-full flex flex-col min-h-[220px]">
      <div className={`h-40 bg-gradient-to-br ${color} flex items-center justify-center relative overflow-hidden`}>
        <div className={`w-24 h-24 rounded-3xl bg-black/50 border-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${glow}`}>
          {icon}
        </div>
        <div className="absolute top-0 left-0 w-full h-1 bg-white/20 group-hover:bg-white/40 transition-colors" />
      </div>
      <div className="bg-[#111] p-5 flex items-center justify-between border-t border-white/5 flex-grow text-left">
        <div>
          <p className="text-[8px] font-black text-slate-600 uppercase mb-1 tracking-[0.2em] truncate">{subtitle}</p>
          <h4 className="text-[14px] font-black italic tracking-tighter uppercase leading-none truncate">{title}</h4>
        </div>
        <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all rotate-3 group-hover:rotate-12 flex-shrink-0 ml-2">
          <Play className="w-4 h-4 fill-current" />
        </div>
      </div>
    </Link>
  );
}