'use client';

import { useState, useEffect, useMemo } from 'react';
import { X01Engine } from '@/lib/engines/x01';
import { MatchService } from '@/lib/services/matchService';
import { StatsService } from '@/lib/services/statsService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { VisualDartboard } from '@/components/VisualDartboard';
import { X01ScoreSidebar } from '@/components/X01ScoreSidebar';
import { ArcadeNumpad } from '@/components/ArcadeNumpad';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { NewRecordModal } from '@/components/NewRecordModal';
import { SquadSelect } from '@/components/SquadSelect';
import { GameInfo } from '@/components/GameInfo';
import { Dart } from '@/types/schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function X01PlayTest() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dartsThrown, setDartsThrown] = useState<Dart[]>([]);
  const [isWin, setIsWin] = useState(false);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [targetScore, setTargetScore] = useState<number>(501);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [recordData, setRecordData] = useState<any>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [playerStats, setPlayerStats] = useState<Record<string, { totalScored: number, dartCount: number }>>({});
  
  // NEW: Track numpad expansion for board scaling
  const [isPadExpanded, setIsPadExpanded] = useState(false);

  const router = useRouter();

  const handleSquadConfirmed = (players: any[]) => {
    setActivePlayers(players);
    setShowSquadSelect(false);
    setShowTargetSelect(true);
  };

  const handleStartGame = async (selectedTarget: number) => {
    setTargetScore(selectedTarget);
    setShowTargetSelect(false);
    const initialScores: Record<string, number> = {};
    const initialStats: Record<string, { totalScored: number, dartCount: number }> = {};
    activePlayers.forEach(p => { 
      initialScores[p.id] = selectedTarget; 
      initialStats[p.id] = { totalScored: 0, dartCount: 0 };
    });
    setScores(initialScores);
    setPlayerStats(initialStats);
    try {
      const id = await MatchService.createMatch(activePlayers[0].id);
      setMatchId(id);
    } catch (err) { console.error(err); }
  };

  const triggerHype = (cat: 'BOOM' | 'WINNER' | 'RECORD') => {
    setIsShaking(true);
    setReactionUrl(GifService.getRandomGifUrl(cat));
    setTimeout(() => setIsShaking(false), 1000);
  };

  const handleThrow = async (score: number, multiplier: number, label: string) => {
    if (!matchId || isWin || isTransitioning) return;
    const currentPlayer = activePlayers[currentTurnIndex];
    const currentScore = scores[currentPlayer.id];
    const dart: Dart = { score, multiplier, raw: label };
    const willWin = X01Engine.checkWin(currentScore, dart, true);
    const willBust = X01Engine.checkBust(currentScore, dart, true);
    const newDarts = [...dartsThrown, dart];

    setPlayerStats(prev => ({
      ...prev,
      [currentPlayer.id]: {
        totalScored: prev[currentPlayer.id].totalScored + (willBust ? 0 : (score * multiplier)),
        dartCount: prev[currentPlayer.id].dartCount + 1
      }
    }));

    if (willWin) {
      setIsWin(true);
      setScores(prev => ({ ...prev, [currentPlayer.id]: 0 }));
      const totalDarts = (playerStats[currentPlayer.id]?.dartCount || 0) + 1;
      const wasRecord = await StatsService.updateRecord(`X01_${targetScore}`, 'FEWEST_DARTS', currentPlayer.id, totalDarts, matchId);
      if (wasRecord) {
        SoundService.play('record');
        triggerHype('RECORD');
        setRecordData({ type: 'FEWEST_DARTS', value: totalDarts, name: currentPlayer.username });
      } else {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      }
      await MatchService.finishMatch(matchId, currentPlayer.id);
    } else if (willBust) {
      setIsTransitioning(true);
      SoundService.play('bust');
      setReactionUrl(GifService.getRandomGifUrl('BUST'));
      await MatchService.saveVisit(matchId, currentPlayer.id, newDarts, true);
      setTimeout(() => {
        setDartsThrown([]);
        setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
        setIsTransitioning(false);
      }, 2000);
    } else {
      setScores(prev => ({ ...prev, [currentPlayer.id]: prev[currentPlayer.id] - (score * multiplier) }));
      setDartsThrown(newDarts);
      if (newDarts.length === 3) {
        setIsTransitioning(true);
        if (newDarts.reduce((s, d) => s + (d.score * d.multiplier), 0) === 180) { SoundService.play('180'); triggerHype('BOOM'); }
        await MatchService.saveVisit(matchId, currentPlayer.id, newDarts, false);
        setTimeout(() => {
            setDartsThrown([]);
            setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
            setIsTransitioning(false);
        }, 2000);
      }
    }
  };

  if (showSquadSelect) return <SquadSelect gameName="X01 Classic" onStart={handleSquadConfirmed} onCancel={() => router.push('/')} />;
  if (showTargetSelect) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
      <h2 className="text-5xl font-black italic text-white mb-2 uppercase tracking-tighter">SET DISTANCE</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-12">
        <button onClick={() => handleStartGame(301)} className="bg-slate-900 border-4 border-slate-800 p-12 rounded-[3rem] text-center hover:border-blue-500 transition-all active:scale-95 shadow-2xl">
          <h3 className="text-8xl font-black italic text-white mb-2">301</h3>
        </button>
        <button onClick={() => handleStartGame(501)} className="bg-slate-900 border-4 border-slate-800 p-12 rounded-[3rem] text-center hover:border-blue-500 transition-all active:scale-95 shadow-2xl">
          <h3 className="text-8xl font-black italic text-white mb-2">501</h3>
        </button>
      </div>
    </main>
  );

  if (!matchId) return null;
  const activeUser = activePlayers[currentTurnIndex];

  return (
    <main className={`h-screen w-full grid grid-rows-[80px_1fr_min-content] bg-[#020205] text-white overflow-hidden relative transition-all duration-500 ${isShaking ? 'animate-shake' : ''}`}>
      
      {/* 1. HUD */}
      <div className="w-full bg-black/40 border-b border-white/5 p-4 z-20 shrink-0 overflow-hidden">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center gap-10 h-full">
          <Link href="/" className="bg-red-600 hover:bg-red-500 border-2 border-red-400 px-8 py-3 rounded-full text-xs font-black uppercase italic tracking-widest text-white shrink-0 shadow-lg">Quit</Link>
          <div className="flex-grow flex justify-center gap-6">
            {activePlayers.map((p, idx) => {
              const isActive = idx === currentTurnIndex;
              return (
                <div key={p.id} className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[220px] ${isActive && !isWin ? 'border-blue-500 bg-blue-900/20 shadow-lg scale-105' : 'border-slate-800 bg-slate-900/40 opacity-40'}`}>
                  <img src={p.avatar_url} className="w-12 h-12 rounded-full border-2 border-white/20 object-cover bg-black" alt="" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">{p.username}</p>
                    <p className="text-4xl font-black tabular-nums tracking-tighter leading-none">{scores[p.id]}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="shrink-0 flex gap-4 items-center"><GameInfo title="X01" color="#2563eb" rules={[`Start at ${targetScore}.`, "First to 0 wins.", "Must finish on a DOUBLE."]} /></div>
        </div>
      </div>

      {/* 2. ARENA (Responsive scaling based on Numpad) */}
      <div className="relative z-10 flex flex-row items-center justify-between px-12 h-full overflow-hidden">
        <div className="w-[340px] hidden xl:block shrink-0" />

        <div className="flex-grow flex items-center justify-center h-full">
            <div className={`transition-all duration-1000 drop-shadow-[0_0_80px_rgba(0,0,0,1)] ${
                isPadExpanded ? 'scale-[1.1] lg:scale-[1.3]' : 'scale-[1.5] lg:scale-[1.8]'
            }`}>
                <VisualDartboard lastDarts={dartsThrown} />
            </div>
        </div>

        <div className="w-[340px] flex flex-col gap-4 p-6 bg-black/40 border-l border-white/5 h-full justify-center shrink-0">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 px-2 border-l-4 border-blue-600 pl-4 italic">Round Strength (PPR)</h3>
          {activePlayers.map((p, idx) => {
            const stat = playerStats[p.id];
            const ppr = stat && stat.dartCount > 0 ? ((stat.totalScored / stat.dartCount) * 3).toFixed(1) : "0.0";
            return (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all duration-500 ${idx === currentTurnIndex ? 'bg-cyan-500/10 border-cyan-400 shadow-md' : 'bg-black/20 border-white/5 opacity-50'}`}>
                <div className="flex items-center gap-3">
                  <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover bg-black" alt="" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{p.username}</p>
                    <p className="text-2xl font-black italic text-white tabular-nums mt-1 leading-none">{ppr}</p>
                  </div>
                </div>
                {idx === currentTurnIndex && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COLLAPSIBLE CONSOLE */}
      {!isWin && (
        <div className="w-full flex justify-center z-30 pb-0 shrink-0">
          <ArcadeNumpad 
            activeGooierName={activeUser?.username || "Gooier"}
            dartsThrownCount={dartsThrown.length}
            onThrow={handleThrow}
            onEndTurn={() => { if(!isTransitioning) { setDartsThrown([]); setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length); } }}
            onToggle={(expanded) => setIsPadExpanded(expanded)}
            color="#2563eb"
          />
        </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal show={!!recordData} type={recordData?.type} value={recordData?.value} playerName={recordData?.name} />

      {isWin && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
              <h2 className="text-[12rem] font-black italic text-blue-500 uppercase mb-8 tracking-tighter">FINISH!</h2>
              <div className="flex flex-col items-center mb-12">
                  <img src={activeUser?.avatar_url} className="w-56 h-56 rounded-full border-8 border-blue-500 shadow-2xl mb-8 object-cover bg-black" alt="" />
                  <p className="text-5xl font-black text-white uppercase italic tracking-tighter">{activeUser?.username} Dominates</p>
              </div>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-16 py-6 rounded-full font-black text-2xl hover:scale-110 transition shadow-lg uppercase italic tracking-tighter">Rematch</button>
          </div>
      )}
    </main>
  );
}