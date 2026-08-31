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
import { ArcadeNumpad } from '@/components/ArcadeNumpad'; // FIXED: Added missing import
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AroundTheWorldPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ATWState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  
  const [dartCount, setDartCount] = useState(0);
  const [recordData, setRecordData] = useState<any>(null);
  
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const cleaned = selectedPlayers.map(p => ({ 
        id: String(p.id), 
        username: String(p.username), 
        avatar_url: String(p.avatar_url) 
      }));
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

  const handleHit = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.isFinished) return;
    // Increment session dart counter
    const currentTotalDarts = dartCount + 1;
    setDartCount(currentTotalDarts);

    // Pass the dart to the engine
    const nextState = ATWEngine.handleThrow(gameState, { 
        score, 
        multiplier, 
        raw: label 
    });

    if (nextState.isFinished && nextState.winnerId) {
      // Check for World Record
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
          name: nextState.players.find(p => p.id === nextState.winnerId)?.username || 'Gooier'
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
        <SquadSelect 
          gameName="ATW Journey" 
          minPlayers={1} 
          maxPlayers={4} 
          onStart={handleStartGame} 
          onCancel={() => router.push('/')} 
        />
        <div className="fixed bottom-10 right-10 z-[1000]">
          <GameInfo 
            title="ATW Journey" 
            color="#00f2ff" 
            rules={[
              "Hit numbers 1-20 in order, then Bullseye.",
              "Doubles skip 1 number; Triples skip 2.",
              "Darts outside your current target score 0.",
              "Finish on fewer darts to set a Bar Record."
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
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#020817] text-white overflow-hidden relative">
      
      {/* 1. HUD HEADER */}
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">LOBBY</Link>
        <div className="text-center">
            <h1 className="text-xl font-black italic tracking-[0.3em] uppercase text-cyan-400">ATW Journey</h1>
        </div>
        <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase">Turn Darts</p>
            <p className="text-xl font-black text-white tabular-nums">{dartCount}</p>
        </div>
      </div>

      {/* 2. PROGRESS ARENA */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 h-full">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {gameState.players.map((p, idx) => (
            <div key={p.id} className={`p-4 rounded-3xl border-2 transition-all duration-500 ${idx === gameState.currentTurnIndex && !gameState.isFinished ? 'border-cyan-500 bg-cyan-950/20 shadow-2xl scale-105' : 'border-slate-900 opacity-40'}`}>
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <img src={p.avatar} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
                        <p className="font-black uppercase italic text-[10px] truncate">{p.username}</p>
                    </div>
                    <span className="bg-cyan-500 text-black px-2 py-0.5 rounded text-[10px] font-black italic">TGT: {ATW_TARGETS[p.currentTargetIndex] === 25 ? 'BULL' : ATW_TARGETS[p.currentTargetIndex]}</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden flex">
                    <div className="h-full bg-cyan-500 transition-all duration-700 shadow-[0_0_10px_cyan]" style={{ width: `${(p.currentTargetIndex / ATW_TARGETS.length) * 100}%` }} />
                </div>
            </div>
            ))}
        </div>

        <div className="text-center">
            {gameState.isFinished ? (
                <div className="animate-bounce">
                    <h2 className="text-8xl font-black text-green-500 italic uppercase tracking-tighter">Conquered!</h2>
                </div>
            ) : (
                <div className="animate-in zoom-in duration-500">
                    <p className="text-xs font-black text-cyan-400 uppercase tracking-[0.6em] mb-4 opacity-50">Locked Target</p>
                    <h2 className="text-[14rem] leading-none font-black italic text-white drop-shadow-[0_0_50px_rgba(0,242,255,0.4)] tabular-nums">
                    {currentTarget === 25 ? 'BULL' : currentTarget}
                    </h2>
                </div>
            )}
        </div>
      </div>

      {/* 3. ARCADE CONSOLE */}
      {!gameState.isFinished && (
        <div className="w-full flex justify-center z-30">
          <ArcadeNumpad 
            activeGooierName={currentPlayer.username}
            dartsThrownCount={gameState.dartsThrown.length}
            onThrow={handleHit}
            onEndTurn={() => {
                setGameState(prev => ({ 
                    ...prev!, 
                    currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, 
                    dartsThrown: [] 
                }));
            }}
            color="#00f2ff"
          />
        </div>
      )}

      {/* 4. MODALS */}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal 
        show={!!recordData} 
        type={recordData?.type} 
        value={recordData?.value} 
        playerName={recordData?.name} 
      />

      {gameState.isFinished && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
              <h2 className="text-9xl font-black italic text-cyan-400 uppercase mb-8 tracking-tighter italic">World Traveler</h2>
              <p className="text-3xl font-black text-white uppercase mb-12">{gameState.players.find(p => p.id === gameState.winnerId)?.username} Finished the Map</p>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-16 py-6 rounded-full font-black text-xl hover:scale-110 transition shadow-2xl">NEW JOURNEY</button>
          </div>
      )}
    </main>
  );
}