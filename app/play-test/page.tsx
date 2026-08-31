'use client';

import { useState, useEffect } from 'react';
import { X01Engine, X01State } from '@/lib/engines/x01';
import { MatchService } from '@/lib/services/matchService';
import { StatsService } from '@/lib/services/statsService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { ArcadeLogo } from '@/components/ArcadeLogo';
import { GameInfo } from '@/components/GameInfo';
import { SquadSelect } from '@/components/SquadSelect';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { NewRecordModal } from '@/components/NewRecordModal';
import { ArcadeNumpad } from '@/components/ArcadeNumpad';
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
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [dartCount, setDartCount] = useState(0);
  const [recordData, setRecordData] = useState<any>(null);
  const router = useRouter();

  const triggerHype = (cat: 'BOOM' | 'WINNER' | 'RECORD') => {
    setIsShaking(true);
    setReactionUrl(GifService.getRandomGifUrl(cat));
    setTimeout(() => setIsShaking(false), 1000);
  };

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    setActivePlayers(selectedPlayers);
    setDartCount(0);
    try {
      const id = await MatchService.createMatch(selectedPlayers[0].id);
      setMatchId(id);
      const initialScores: Record<string, number> = {};
      selectedPlayers.forEach(p => { initialScores[p.id] = 501; });
      setScores(initialScores);
    } catch (err) { console.error(err); }
  };

  const handleThrow = async (score: number, multiplier: number, label: string) => {
    if (!matchId || isWin) return;
    const currentPlayer = activePlayers[currentTurnIndex];
    const currentScore = scores[currentPlayer.id];
    const dart: Dart = { score, multiplier, raw: label };
    const willWin = X01Engine.checkWin(currentScore, dart, true);
    const willBust = X01Engine.checkBust(currentScore, dart, true);
    const newDarts = [...dartsThrown, dart];
    const currentTotalDarts = dartCount + 1;
    setDartCount(currentTotalDarts);

    if (willWin) {
      setIsWin(true);
      setScores(prev => ({ ...prev, [currentPlayer.id]: 0 }));
      const isDartsRecord = await StatsService.updateRecord('X01_501', 'FEWEST_DARTS', currentPlayer.id, currentTotalDarts, matchId);
      if (isDartsRecord) {
        SoundService.play('record');
        triggerHype('RECORD');
        setRecordData({ type: 'FEWEST_DARTS', value: currentTotalDarts, name: currentPlayer.username });
      } else {
        SoundService.play('win');
        triggerHype('WINNER');
      }
      await MatchService.finishMatch(matchId, currentPlayer.id);
    } 
    else if (willBust) {
      SoundService.play('bust');
      setReactionUrl(GifService.getRandomGifUrl('BUST'));
      await MatchService.saveVisit(matchId, currentPlayer.id, newDarts, true);
      setDartsThrown([]);
      setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
    } 
    else {
      setScores(prev => ({ ...prev, [currentPlayer.id]: prev[currentPlayer.id] - (score * multiplier) }));
      setDartsThrown(newDarts);
      if (newDarts.length === 3) {
        const turnTotal = newDarts.reduce((s, d) => s + (d.score * d.multiplier), 0);
        if (turnTotal === 180) { SoundService.play('180'); triggerHype('BOOM'); }
        await MatchService.saveVisit(matchId, currentPlayer.id, newDarts, false);
        setDartsThrown([]);
        setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
      }
    }
  };

  if (showSquadSelect) return <SquadSelect gameName="X01 Classic" onStart={handleStartGame} onCancel={() => router.push('/')} />;
  if (!matchId) return null;

  const activeUser = activePlayers[currentTurnIndex];

  return (
    <main className={`h-screen w-full grid grid-rows-[auto_1fr_min-content] bg-[#020205] text-white overflow-hidden relative transition-all duration-500 ${isShaking ? 'animate-shake' : ''}`}>
      
      {/* 1. TOP HUD (Scoreboard) */}
      <div className="w-full bg-black/40 border-b border-white/5 p-6 z-20 shrink-0">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center gap-8">
          <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition shrink-0">QUIT</Link>
          
          {/* LARGE AVATAR SCORECARDS */}
          <div className="flex-grow flex justify-center gap-4 overflow-x-auto no-scrollbar">
            {activePlayers.map((p, idx) => (
              <div key={p.id} className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[220px] ${idx === currentTurnIndex && !isWin ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105' : 'border-slate-800 bg-slate-900/40 opacity-60'}`}>
                <img src={p.avatar_url} className="w-16 h-16 rounded-full border-2 border-white/20 object-cover shadow-lg" alt="" />
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1">{p.username}</p>
                  <p className="text-4xl font-black tabular-nums tracking-tighter">{scores[p.id]}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0"><GameInfo title="X01" color="#2563eb" rules={["Reach exactly 0.", "Finish on a DOUBLE.", "Fewest darts sets the record."]} /></div>
        </div>
      </div>

      {/* 2. THE STAGE (Giant Score Display) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-10">
        {!isWin ? (
          <div className="animate-in fade-in zoom-in duration-500">
            <p className="text-slate-500 font-black uppercase tracking-[0.5em] mb-4 text-xs italic">Waiting for Gooi...</p>
            <div className="text-[15rem] leading-none font-black italic text-white drop-shadow-[0_0_50px_rgba(59,130,246,0.4)] tabular-nums">
                {scores[activeUser?.id]}
            </div>
            <div className="mt-8 flex flex-col items-center">
                <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-sm mb-1">{activeUser?.username}</p>
                <p className="text-slate-600 font-bold text-[10px] uppercase">Session Darts: {dartCount}</p>
            </div>
          </div>
        ) : (
          <div className="animate-bounce">
            <h2 className="text-9xl font-black text-green-500 italic uppercase tracking-tighter">FINISH!</h2>
          </div>
        )}
      </div>

      {/* 3. ARCADE CONSOLE (Fixed Bottom) */}
      {!isWin && (
        <div className="w-full flex justify-center z-30 pb-0 shrink-0">
          <ArcadeNumpad 
            activeGooierName={activeUser?.username || "Gooier"}
            dartsThrownCount={dartsThrown.length}
            onThrow={(score, multiplier, label) => handleThrow(score, multiplier, label)}
            onEndTurn={() => {
                setDartsThrown([]);
                setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
            }}
            color="#2563eb"
          />
        </div>
      )}

      {/* Winner Modal & Reaction Overlays */}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal show={!!recordData} type={recordData?.type} value={recordData?.value} playerName={recordData?.name} />
    </main>
  );
}