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
import { Dart } from '@/types/schema';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function X01PlayTest() {
  // --- 1. HOOKS (MUST BE AT THE TOP) ---
  const [matchId, setMatchId] = useState<string | null>(null);
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dartsThrown, setDartsThrown] = useState<Dart[]>([]);
  const [isWin, setIsWin] = useState(false);
  
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // World Record Tracking
  const [dartCount, setDartCount] = useState(0);
  const [recordData, setRecordData] = useState<any>(null);
  
  const router = useRouter();

  // --- 2. LOGIC FUNCTIONS ---

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
      selectedPlayers.forEach(p => {
        initialScores[p.id] = 501;
      });
      setScores(initialScores);
    } catch (err) {
      console.error(err);
      alert("Database Connection Error");
    }
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
      
      // Check for records
      const isDartsRecord = await StatsService.updateRecord('X01_501', 'FEWEST_DARTS', currentPlayer.id, currentTotalDarts, matchId);
      const isCheckoutRecord = await StatsService.updateRecord('X01_501', 'HIGHEST_CHECKOUT', currentPlayer.id, score * multiplier, matchId);

      if (isDartsRecord || isCheckoutRecord) {
        SoundService.play('record');
        triggerHype('RECORD');
        setRecordData({ 
          type: isDartsRecord ? 'FEWEST_DARTS' : 'HIGHEST_CHECKOUT', 
          value: isDartsRecord ? currentTotalDarts : score * multiplier, 
          name: currentPlayer.username 
        });
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
      const dartValue = X01Engine.getDartValue(dart);
      setScores(prev => ({ ...prev, [currentPlayer.id]: prev[currentPlayer.id] - dartValue }));
      setDartsThrown(newDarts);

      if (newDarts.length === 3) {
        const turnTotal = newDarts.reduce((s, d) => s + (d.score * d.multiplier), 0);
        if (turnTotal === 180) {
          SoundService.play('180');
          triggerHype('BOOM');
        }
        await MatchService.saveVisit(matchId, currentPlayer.id, newDarts, false);
        setDartsThrown([]);
        setCurrentTurnIndex((currentTurnIndex + 1) % activePlayers.length);
      }
    }
  };

  // --- 3. RENDER GATES ---

  if (showSquadSelect) {
    return (
      <div className="relative min-h-screen bg-black">
        <SquadSelect gameName="X01 Classic" onStart={handleStartGame} onCancel={() => router.push('/')} />
        <div className="fixed bottom-10 right-10 z-[1000]">
          <GameInfo title="X01" color="#2563eb" rules={["Reach exactly 0.", "Finish on a DOUBLE.", "Fewest darts sets the record."]} />
        </div>
      </div>
    );
  }

  const activeUser = activePlayers[currentTurnIndex];

  return (
    <main className={`min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center transition-all ${isShaking ? 'animate-shake' : ''}`}>
      
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <Link href="/" className="text-[10px] font-black bg-slate-900 border border-slate-800 px-6 py-2 rounded-full uppercase hover:bg-red-600">Quit</Link>
        <div className="text-center">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">X01 Classic</h1>
            <p className="text-blue-500 font-bold text-[10px] tracking-[0.4em] uppercase">Dart Count: {dartCount}</p>
        </div>
        <div className="w-20" />
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-6xl mb-12">
        {activePlayers.map((p, idx) => (
          <div key={p.id} className={`p-6 rounded-[2rem] border-4 transition-all duration-500 ${idx === currentTurnIndex && !isWin ? 'border-blue-600 bg-blue-900/10 shadow-2xl scale-105' : 'border-slate-900 opacity-40'}`}>
            <div className="flex items-center gap-3 mb-4">
              <img src={p.avatar_url} className="w-10 h-10 rounded-full border border-white/20" alt="" />
              <p className="font-black uppercase italic text-xs truncate">{p.username}</p>
            </div>
            <p className="text-6xl font-black tabular-nums">{scores[p.id]}</p>
          </div>
        ))}
      </div>

      {/* Center Stage */}
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        {!isWin ? (
          <div className="animate-in fade-in zoom-in">
            <p className="text-slate-500 font-black uppercase tracking-[0.5em] mb-4 text-xs italic">Waiting for {activeUser?.username}</p>
            <div className="text-[12rem] leading-none font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                {scores[activeUser?.id]}
            </div>
          </div>
        ) : (
          <div className="animate-bounce">
            <h2 className="text-8xl font-black text-green-500 italic uppercase">Game Over</h2>
          </div>
        )}
      </div>

      {!isWin && (
        <div className="w-full max-w-md bg-slate-900/90 p-8 rounded-t-[4rem] border-t-4 border-blue-600 shadow-2xl mt-8 backdrop-blur-md">
            <div className="flex gap-2 justify-center mb-6 h-10">
                {dartsThrown.map((d, i) => (<div key={i} className="bg-blue-600 px-5 py-2 rounded-full font-black italic text-xs animate-in zoom-in">{d.raw}</div>))}
                {[...Array(3 - dartsThrown.length)].map((_, i) => (<div key={i} className="w-10 h-10 border-2 border-slate-800 rounded-full" />))}
            </div>
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleThrow(20, 3, 'T20')} className="bg-red-600 p-5 rounded-2xl font-black text-sm">T20</button>
                <button onClick={() => handleThrow(20, 1, 'S20')} className="bg-slate-800 p-5 rounded-2xl font-black text-sm">S20</button>
                <button onClick={() => handleThrow(20, 2, 'D20')} className="bg-blue-600 p-5 rounded-2xl font-black text-sm">D20</button>
                <button onClick={() => handleThrow(25, 2, 'DB')} className="col-span-3 bg-white text-black p-4 rounded-2xl font-black text-sm uppercase italic">Bullseye</button>
            </div>
        </div>
      )}

      {/* OVERLAYS */}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal 
        show={!!recordData} 
        type={recordData?.type} 
        value={recordData?.value} 
        playerName={recordData?.name} 
      />
    </main>
  );
}