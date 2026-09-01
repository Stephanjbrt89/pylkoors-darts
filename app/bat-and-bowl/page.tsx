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
import { VisualDartboard } from '@/components/VisualDartboard';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { GooierRoulette } from '@/components/GooierRoulette';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BatAndBowlPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<BatAndBowlState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [isPadExpanded, setIsPadExpanded] = useState(false);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const cleaned = selectedPlayers.map(p => ({ id: String(p.id), username: String(p.username), avatar_url: String(p.avatar_url) }));
      const id = await ArcadeService.createMultiplayerMatch('bat_and_bowl', cleaned.map(p => p.id));
      const gamePlayers = cleaned.length === 1 
        ? [cleaned[0], { ...cleaned[0], id: 'solo-self', username: cleaned[0].username + ' (Self)', avatar_url: cleaned[0].avatar_url }]
        : cleaned;
      const initialState = BatAndBowlEngine.createInitialState(gamePlayers);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) { console.error(err); }
  };

  const handleRouletteComplete = async (winnerId: string) => {
    if (!gameState || !matchId) return;
    const nextState = { ...gameState, phase: 'CHOICE' as const, rouletteWinnerId: winnerId };
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const handleChoice = async (role: 'batting' | 'bowling') => {
    if (!gameState || !matchId || !gameState.rouletteWinnerId) return;
    const nextState = BatAndBowlEngine.assignRoles(gameState, gameState.rouletteWinnerId, role);
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const onThrow = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.phase !== 'PLAY') return;
    const nextState = BatAndBowlEngine.handleThrow(gameState, { score, multiplier, raw: label });
    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) MatchService.finishMatch(matchId, nextState.winnerId);
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return (
    <div className="relative min-h-screen bg-black">
      <SquadSelect gameName="Bat & Bowl" minPlayers={1} maxPlayers={2} onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo title="Bat & Bowl" color="#00FF66" rules={["Roulette winner chooses role.","Batsman: score on any segment.","Bowler: hit 1-10 in order.","Roles swap at 10 wickets."]} />
      </div>
    </div>
  );

  if (!gameState) return null;

  if (gameState.phase === 'ROULETTE') return <GooierRoulette players={gameState.players} onComplete={handleRouletteComplete} />;

  if (gameState.phase === 'CHOICE') {
    const tossWinner = gameState.players.find(p => p.id === gameState.rouletteWinnerId);
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
        <div className="relative z-10 flex flex-col items-center">
            <img src={tossWinner?.avatar_url} className="w-48 h-48 rounded-full border-8 border-cyan-400 object-cover bg-black mb-8 shadow-2xl" />
            <h2 className="text-6xl font-black italic uppercase mb-16">{tossWinner?.username} WON TOSS!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                <button onClick={() => handleChoice('batting')} className="bg-white text-black p-12 rounded-[3.5rem] font-black text-5xl hover:bg-[#00FF66] transition-all uppercase italic">Bat</button>
                <button onClick={() => handleChoice('bowling')} className="bg-red-600 text-white p-12 rounded-[3.5rem] font-black text-5xl hover:bg-red-500 transition-all uppercase italic">Bowl</button>
            </div>
        </div>
      </main>
    );
  }

  const batsman = gameState.players.find(p => p.role === 'batting')!;
  const bowler = gameState.players.find(p => p.role === 'bowling')!;
  const currentPlayer = gameState.players[gameState.currentTurnIndex];

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#020617] text-white overflow-hidden relative">
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">QUIT</Link>
        <p className="text-[#00FF66] font-black uppercase text-[10px] tracking-[0.3em] italic">Innings {gameState.innings}</p>
        <div className="w-20" />
      </div>

      <div className="relative z-10 flex items-center justify-center p-4 h-full overflow-hidden">
        <div className={`transition-all duration-1000 w-full max-w-[1800px] flex items-center justify-between gap-4 h-full ${isPadExpanded ? 'scale-90' : 'scale-105'}`}>
            <div className={`p-8 rounded-[4rem] border-4 transition-all w-80 flex flex-col justify-center shrink-0 ${currentPlayer.role === 'batting' ? 'border-[#00FF66] bg-[#00FF66]/5' : 'border-slate-900 opacity-40'}`}>
                <div className="flex flex-col items-center mb-6"><img src={batsman.avatar_url} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover bg-black" /><h3 className="text-xl font-black uppercase text-white mt-2">{batsman.username}</h3></div>
                <div className="text-8xl font-black text-center">{batsman.score}</div>
                {gameState.innings === 2 && <div className="mt-8 bg-[#00FF66]/10 border-2 border-[#00FF66] p-4 rounded-3xl text-center"><p className="text-[10px] uppercase">Needed</p><span className="text-4xl font-black">{Math.max(0, (gameState.innings_1_target! + 1) - batsman.score)}</span></div>}
            </div>

            <div className="flex-grow flex items-center justify-center">
                <div className={`transition-all duration-1000 ${isPadExpanded ? 'scale-100' : 'scale-125'}`}>
                    <VisualDartboard lastDarts={gameState.dartsThrown} highlight={currentPlayer.role === 'bowling' ? (bowler.wickets + 1) : null} />
                </div>
            </div>

            <div className={`p-8 rounded-[4rem] border-4 transition-all w-80 flex flex-col justify-center shrink-0 ${currentPlayer.role === 'bowling' ? 'border-red-600 bg-red-950/10' : 'border-slate-900 opacity-40'}`}>
                <div className="flex flex-col items-center mb-8"><img src={bowler.avatar_url} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover bg-black" /><h3 className="text-xl font-black uppercase text-white mt-2">{bowler.username}</h3></div>
                <div className="grid grid-cols-5 gap-2 px-4">
                    {[1,2,3,4,5,6,7,8,9,10].map(w => (<div key={w} className={`aspect-square rounded-xl flex items-center justify-center text-xl font-black border-2 ${w <= bowler.wickets ? 'bg-red-600 border-red-500' : w === bowler.wickets + 1 ? 'border-[#00FF66] text-[#00FF66] animate-pulse' : 'border-slate-800'}`}>{w <= bowler.wickets ? 'X' : w}</div>))}
                </div>
                <p className="text-center text-xl font-black uppercase text-red-500 mt-4">{bowler.wickets}/10 WKTS</p>
            </div>
        </div>
      </div>

      {!gameState.winnerId && (
        <div className="w-full flex justify-center z-30">
          <ArcadeNumpad activeGooierName={currentPlayer?.username} dartsThrownCount={gameState.dartsThrown.length} onThrow={onThrow} onEndTurn={() => setGameState(prev => ({...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, dartsThrown: []}))} onToggle={(e) => setIsPadExpanded(e)} color={currentPlayer?.role === 'batting' ? "#00FF66" : "#dc2626"} />
        </div>
      )}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}