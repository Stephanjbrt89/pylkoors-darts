'use client';

import { useState, useEffect } from 'react';
import { BatAndBowlEngine, BatAndBowlState } from '@/lib/engines/batAndBowl';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { SquadSelect } from '@/components/SquadSelect';
import { ArcadeLogo } from '@/components/ArcadeLogo';
import { GameInfo } from '@/components/GameInfo';
import { ArcadeNumpad } from '@/components/ArcadeNumpad';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BatAndBowlPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<BatAndBowlState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const playerIds = selectedPlayers.map(p => p.id);
      const id = await ArcadeService.createMultiplayerMatch('bat_and_bowl', playerIds);
      
      const gamePlayers = selectedPlayers.length === 1 
        ? [selectedPlayers[0], { ...selectedPlayers[0], id: 'solo-self', username: selectedPlayers[0].username + ' (Self)', avatar_url: selectedPlayers[0].avatar_url }]
        : selectedPlayers;

      const initialState = BatAndBowlEngine.createInitialState(gamePlayers);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) {
      console.error(err);
    }
  };

  const onThrow = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.phase === 'FINISHED') return;
    
    const nextState = BatAndBowlEngine.handleThrow(gameState, { score, multiplier, raw: label });
    
    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) MatchService.finishMatch(matchId, nextState.winnerId);
    }
    
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const setRoles = async (battingId: string) => {
    if (!gameState || !matchId) return;
    const nextState = { ...gameState, phase: 'PLAY' as const };
    nextState.players.forEach(p => p.role = p.id === battingId ? 'batting' : 'bowling');
    nextState.currentTurnIndex = nextState.players.findIndex(p => p.role === 'batting');
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return (
    <div className="relative min-h-screen bg-black">
      <SquadSelect gameName="Bat & Bowl" minPlayers={1} maxPlayers={2} onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo title="Bat & Bowl" color="#00FF66" rules={["Batsman: Type score 1-20/25 to score runs.","Bowler: Hit targets 1-10 in order to take wickets.","Innings swap at 10 wickets."]} />
      </div>
    </div>
  );

  if (!gameState) return null;

  const batsman = gameState.players.find(p => p.role === 'batting');
  const bowler = gameState.players.find(p => p.role === 'bowling');
  const decider = gameState.players.find(p => p.role === 'pending_bull_choice');
  const currentPlayer = gameState.players[gameState.currentTurnIndex];

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#020617] text-white overflow-hidden relative">
      
      {/* 1. Header */}
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">LOBBY</Link>
        <p className="text-[#00FF66] font-black uppercase text-[10px] tracking-[0.3em] italic">
          {gameState.phase === 'DIDDLE' ? 'Selection Phase' : gameState.innings === 1 ? 'Innings 1: Setting Target' : `Innings 2: The Chase`}
        </p>
        <div className="w-20" />
      </div>

      {/* 2. Gameplay Stage */}
      <div className="relative z-10 flex items-center justify-center p-4 h-full overflow-hidden">
        
        {/* PHASE: DIDDLE */}
        {gameState.phase === 'DIDDLE' && (
            <div className="flex flex-col items-center animate-in zoom-in">
                <h2 className="text-4xl font-black italic mb-12 uppercase text-cyan-400">Diddle For Bull</h2>
                <div className="flex gap-12">
                    {gameState.players.map((p, i) => (
                        <div key={p.id} className={`p-8 rounded-[3rem] border-4 transition-all ${gameState.currentTurnIndex === i ? 'border-cyan-400 bg-cyan-900/20 shadow-2xl scale-105' : 'border-slate-800 opacity-40'}`}>
                            <img src={p.avatar_url} className="w-24 h-24 rounded-full border-2 border-white/20 object-cover bg-black mb-4 shadow-xl" alt="" />
                            <p className="text-center font-black uppercase text-sm">{p.username}</p>
                            <p className="text-center text-5xl font-mono mt-4 text-cyan-400">{p.diddle_score ?? '??'}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* PHASE: CHOICE */}
        {decider && (
            <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in">
                <img src={decider.avatar_url} className="w-40 h-40 rounded-full border-4 border-[#00FF66] mb-6 object-cover bg-black shadow-2xl" alt="" />
                <h2 className="text-4xl font-black italic mb-12 uppercase text-white">{decider.username} WINS BULL!</h2>
                <div className="flex gap-6">
                    <button onClick={() => setRoles(decider.id)} className="bg-white text-black px-16 py-8 rounded-3xl font-black text-2xl hover:scale-110 transition shadow-2xl uppercase italic">BAT FIRST</button>
                    <button onClick={() => setRoles(gameState.players.find(p => p.id !== decider.id)!.id)} className="bg-red-600 text-white px-16 py-8 rounded-3xl font-black text-2xl hover:scale-110 transition shadow-2xl uppercase italic">BOWL FIRST</button>
                </div>
            </div>
        )}

        {/* PHASE: PLAY */}
        {gameState.phase === 'PLAY' && batsman && bowler && (
            <div className="w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full pb-8">
                {/* BATSMAN CARD */}
                <div className={`p-8 rounded-[4rem] border-8 transition-all h-[55vh] flex flex-col items-center justify-center ${currentPlayer.role === 'batting' ? 'border-[#00FF66] bg-[#00FF66]/5 shadow-2xl' : 'border-slate-900 opacity-40'}`}>
                    <div className="flex items-center gap-6 mb-6 w-full px-10">
                        <img src={batsman.avatar_url} className="w-20 h-20 rounded-full border-4 border-white/10 object-cover bg-black shadow-lg" alt="" />
                        <div className="text-left">
                            <p className="text-[#00FF66] font-black uppercase text-xs tracking-[0.2em]">Active Batsman</p>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">{batsman.username}</h3>
                        </div>
                    </div>

                    <div className="text-[12rem] font-black leading-none tracking-tighter tabular-nums text-white text-center drop-shadow-[0_0_50px_rgba(0,255,102,0.2)]">
                        {batsman.score}
                    </div>
                    <p className="text-slate-500 font-black text-xl uppercase italic tracking-[0.3em]">Total Runs</p>

                    {/* NEW: RUNS NEEDED VISIBLE AT ALL TIMES (Innings 2) */}
                    {gameState.innings === 2 && gameState.innings_1_target !== null && (
                        <div className="mt-8 flex flex-col items-center animate-in slide-in-from-bottom-5 duration-500">
                            <div className="bg-[#00FF66]/10 border-2 border-[#00FF66] px-10 py-4 rounded-[2rem] shadow-[0_0_30px_rgba(0,255,102,0.3)]">
                                <p className="text-white/60 text-[10px] font-black uppercase text-center tracking-[0.4em] mb-1">Target: {gameState.innings_1_target + 1}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white tabular-nums">
                                        {Math.max(0, (gameState.innings_1_target + 1) - batsman.score)}
                                    </span>
                                    <span className="text-[#00FF66] font-black text-sm uppercase italic">Runs Needed</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOWLER CARD */}
                <div className={`p-8 rounded-[4rem] border-8 transition-all h-[55vh] flex flex-col items-center justify-center ${currentPlayer.role === 'bowling' ? 'border-red-600 bg-red-950/10 shadow-2xl' : 'border-slate-900 opacity-40'}`}>
                    <div className="flex items-center gap-6 mb-8 w-full px-10">
                        <img src={bowler.avatar_url} className="w-20 h-20 rounded-full border-4 border-white/10 object-cover bg-black shadow-lg" alt="" />
                        <div className="text-left">
                            <p className="text-red-500 font-black uppercase text-xs tracking-[0.2em]">Active Bowler</p>
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">{bowler.username}</h3>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-3 mb-8 px-10">
                        {[1,2,3,4,5,6,7,8,9,10].map(w => (
                            <div key={w} className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-black border-2 transition-all ${
                                w <= bowler.wickets ? 'bg-red-600 border-red-500 text-white shadow-lg' : 
                                w === bowler.wickets + 1 ? 'border-[#00FF66] text-[#00FF66] animate-pulse scale-110' : 
                                'border-slate-800 text-slate-800'
                            }`}>
                                {w <= bowler.wickets ? 'X' : w}
                            </div>
                        ))}
                    </div>
                    <div className="text-center text-2xl font-black uppercase italic text-red-500 tracking-widest leading-none">
                        {bowler.wickets} / 10 Wickets
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* 3. ARCADE NUMPAD CONSOLE */}
      {!gameState.winnerId && (
        <div className="w-full flex justify-center z-30">
          <ArcadeNumpad 
            activeGooierName={currentPlayer?.username || "Gooier"}
            dartsThrownCount={gameState.dartsThrown.length}
            onThrow={onThrow}
            onEndTurn={() => setGameState(prev => ({...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, dartsThrown: []}))}
            color={gameState.phase === 'DIDDLE' ? "#00f2ff" : (currentPlayer?.role === 'batting' ? "#00FF66" : "#dc2626")}
          />
        </div>
      )}

      {/* WIN MODAL */}
      {gameState.winnerId && (
         <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
             <div className="relative bg-[#0a0a1a] border-4 border-[#00FF66] p-12 rounded-[4rem] max-w-2xl w-full text-center shadow-2xl">
                <h2 className="text-9xl font-black italic text-[#00FF66] uppercase mb-4 tracking-tighter">VICTORY</h2>
                <img src={gameState.players.find(p => p.id === gameState.winnerId)?.avatar_url} className="w-48 h-48 rounded-full border-8 border-[#00FF66] mx-auto mb-6 object-cover bg-black shadow-2xl" alt="" />
                <p className="text-4xl font-black text-white uppercase italic">{gameState.players.find(p => p.id === gameState.winnerId)?.username}</p>
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={() => window.location.reload()} className="bg-white text-black py-6 rounded-3xl font-black text-2xl hover:scale-105 transition shadow-lg uppercase italic">REMATCH</button>
                    <button onClick={() => router.push('/')} className="bg-slate-900 text-white border-2 border-slate-700 py-6 rounded-3xl font-black text-2xl hover:bg-red-600 transition shadow-lg uppercase italic">LOBBY</button>
                </div>
             </div>
         </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}