'use client';

import { useState, useEffect } from 'react';
import { ATWEngine, ATWState, ATW_TARGETS } from '@/lib/engines/atw';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { StatsService } from '@/lib/services/statsService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { SquadSelect } from '@/components/SquadSelect';
import { ArcadeLogo } from '@/components/ArcadeLogo';
import { GameInfo } from '@/components/GameInfo';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { NewRecordModal } from '@/components/NewRecordModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AroundTheWorldPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ATWState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  
  // RECORD TRACKING STATES
  const [dartCount, setDartCount] = useState(0);
  const [recordData, setRecordData] = useState<any>(null);
  
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const cleaned = selectedPlayers.map(p => ({ id: p.id, username: p.username, avatar_url: p.avatar_url }));
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_ATW', cleaned.map(p => p.id));
      const initialState = ATWEngine.createInitialState(cleaned);
      setMatchId(id);
      setGameState(initialState);
      setDartCount(0);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHit = async (multiplier: number, isMiss: boolean = false) => {
    if (!gameState || !matchId || gameState.isFinished) return;
    
    const currentTotalDarts = dartCount + 1;
    setDartCount(currentTotalDarts);

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const target = ATW_TARGETS[currentPlayer.currentTargetIndex];
    
    const nextState = ATWEngine.handleThrow(gameState, { 
        score: isMiss ? 0 : target, 
        multiplier: multiplier, 
        raw: isMiss ? 'MISS' : (multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S') 
    });

    if (nextState.isFinished && nextState.winnerId) {
      // 1. CHECK FOR NEW BAR RECORD
      const isNewRecord = await StatsService.updateRecord(
        'ARCADE_ATW', 
        'FEWEST_DARTS', 
        nextState.winnerId, 
        currentTotalDarts, 
        matchId
      );
      
      if (isNewRecord) {
        SoundService.play('record');
        setReactionUrl(GifService.getRandomGifUrl('RECORD'));
        setRecordData({ 
          type: 'FEWEST_DARTS', 
          value: currentTotalDarts, 
          name: currentPlayer.username 
        });
      } else {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      }
      
      await MatchService.finishMatch(matchId, nextState.winnerId);
    }

    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) {
    return (
      <div className="relative min-h-screen bg-black">
        <SquadSelect gameName="Around The World" onStart={handleStartGame} onCancel={() => router.push('/')} />
        <div className="fixed bottom-10 right-10 z-[1000]">
          <GameInfo 
            title="Around The World" 
            color="#00f2ff" 
            rules={[
              "Hit numbers 1-20 in order, then Bullseye.",
              "Doubles skip 1 number ahead; Triples skip 2.",
              "Winning on fewer darts sets a Bar Record.",
              "First to hit Bullseye wins the match."
            ]} 
          />
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const currentTarget = ATW_TARGETS[currentPlayer.currentTargetIndex];

  return (
    <main className="min-h-screen bg-[#020817] text-white p-6 flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <Link href="/" className="text-[10px] font-black bg-slate-900 px-6 py-2 rounded-full border border-white/10 uppercase tracking-widest">Quit</Link>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-cyan-400">Around The World</h1>
        <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase">Total Darts</p>
            <p className="text-xl font-black text-white tabular-nums">{dartCount}</p>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {gameState.players.map((p, idx) => (
          <div key={p.id} className={`p-6 rounded-[2rem] border-4 transition-all duration-500 ${idx === gameState.currentTurnIndex && !gameState.isFinished ? 'border-cyan-500 bg-cyan-950/20 shadow-2xl scale-105' : 'border-slate-900 opacity-40'}`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <img src={p.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />
                    <p className="font-black uppercase italic text-xs truncate">{p.username}</p>
                </div>
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-tighter">Target: {ATW_TARGETS[p.currentTargetIndex] === 25 ? 'BULL' : ATW_TARGETS[p.currentTargetIndex]}</p>
            </div>
            <div className="w-full h-2 bg-black rounded-full p-0.5 border border-slate-800 overflow-hidden flex">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-700 shadow-[0_0_10px_cyan]" style={{ width: `${(p.currentTargetIndex / ATW_TARGETS.length) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Target Display */}
      <div className="flex-grow flex flex-col items-center justify-center text-center">
        {gameState.isFinished ? (
            <div className="animate-bounce">
                <h2 className="text-7xl font-black text-green-500 italic uppercase tracking-tighter">World Conquered</h2>
                <Link href="/" className="mt-8 inline-block bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-sm shadow-2xl">Return to Lobby</Link>
            </div>
        ) : (
            <div className="animate-in fade-in zoom-in duration-500">
                <p className="text-xs font-black text-cyan-400 uppercase tracking-[0.5em] mb-4 opacity-50">Locked Target</p>
                <h2 className="text-[14rem] leading-none font-black italic text-white drop-shadow-[0_0_50px_rgba(0,242,255,0.4)]">
                  {currentTarget === 25 ? 'BULL' : currentTarget}
                </h2>
            </div>
        )}
      </div>

      {/* Input Console */}
      {!gameState.isFinished && (
        <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-t-[4rem] border-t-4 border-cyan-600 w-full max-w-md mt-auto shadow-2xl">
          <div className="flex gap-2 mb-6 justify-center h-10">
            {gameState.dartsThrown.map((d, i) => (
              <div key={i} className="bg-cyan-600 px-5 py-2 rounded-full font-black italic text-xs animate-in zoom-in">HIT</div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleHit(1)} className="bg-slate-800 hover:bg-slate-700 p-6 rounded-2xl font-black text-sm text-white">SINGLE</button>
            <button onClick={() => handleHit(2)} className="bg-slate-700 hover:bg-slate-600 p-6 rounded-2xl font-black text-sm text-blue-400">DOUBLE</button>
            <button onClick={() => handleHit(3)} className="bg-slate-700 hover:bg-slate-600 p-6 rounded-2xl font-black text-sm text-red-400">TRIPLE</button>
            <button onClick={() => handleHit(1, true)} className="col-span-3 bg-black border-2 border-slate-800 p-4 rounded-2xl font-black text-slate-500 hover:text-white uppercase text-xs transition">Miss Target</button>
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