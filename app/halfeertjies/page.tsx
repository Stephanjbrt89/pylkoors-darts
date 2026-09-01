'use client';

import { useState, useEffect } from 'react';
import { HalfeertjiesEngine, HalfeertjiesState } from '@/lib/engines/halfeertjies';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { StatsService } from '@/lib/services/statsService';
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

export default function HalfeertjiesPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<HalfeertjiesState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<any[]>([]);
  const [isPadExpanded, setIsPadExpanded] = useState(false);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    setSelectedSquad(selectedPlayers);
    try {
      const cleaned = selectedPlayers.map(p => ({ id: String(p.id), username: String(p.username), avatar_url: String(p.avatar_url) }));
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_HALFEERTJIES', cleaned.map(p => p.id));
      const initialState = HalfeertjiesEngine.createInitialState(cleaned);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) { console.error(err); }
  };

  const handleRouletteComplete = async (winnerId: string) => {
    if (!gameState || !matchId) return;
    const nextState = HalfeertjiesEngine.startMatch(gameState, winnerId);
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const handleHit = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.phase !== 'PLAY') return;
    const currentPlayerIdx = gameState.currentTurnIndex;
    const oldScore = gameState.players[currentPlayerIdx].score;
    const currentTarget = gameState.targets[gameState.roundIndex];
    const nextState = HalfeertjiesEngine.handleThrow(gameState, { score, multiplier, raw: label });

    if (nextState.dartsThrown.length === 0) {
        const updatedPlayer = nextState.players[currentPlayerIdx];
        if (updatedPlayer.score < oldScore) {
            SoundService.play('bust');
            setReactionUrl(GifService.getRandomGifUrl('BUST'));
        } else if (['TARGET_SCORE', 'ANY_TRIPLE', 'ANY_DOUBLE', 'BULL'].includes(String(currentTarget.type))) {
            setReactionUrl(GifService.getRandomGifUrl('BOOM'));
        }
    }
    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) {
            await MatchService.finishMatch(matchId, nextState.winnerId);
            await StatsService.updateRecord('ARCADE_HALFEERTJIES', 'HIGHEST_SCORE', nextState.winnerId, nextState.players.find(p => p.id === nextState.winnerId)!.score, matchId);
        }
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return <SquadSelect gameName="Halfeertjies" onStart={handleStartGame} onCancel={() => router.push('/')} />;
  if (!gameState) return null;
  if (gameState.phase === 'ROULETTE') return <GooierRoulette players={gameState.players} onComplete={handleRouletteComplete} />;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const currentTarget = gameState.targets[gameState.roundIndex];
  const currentVisitSum = gameState.dartsThrown.reduce((s, d) => s + (d.score * d.multiplier), 0);
  const remainingForExact = (currentTarget.type === 'TARGET_SCORE' && currentTarget.value) ? currentTarget.value - currentVisitSum : null;

  return (
    <main className="h-screen w-full grid grid-rows-[60px_auto_1fr_auto] bg-[#020205] text-white overflow-hidden relative">
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20 shrink-0">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition shadow-lg">LOBBY</Link>
        <h1 className="text-xl font-black italic tracking-[0.3em] text-yellow-500 uppercase">Halfeertjies</h1>
        <div className="w-20" /> 
      </div>

      <div className="w-full flex gap-2 overflow-x-auto no-scrollbar py-4 px-10 border-b border-white/5 bg-white/5 shrink-0">
        {gameState.targets.map((t, i) => (<div key={i} className={`flex-shrink-0 px-5 py-2 rounded-xl border-2 font-black italic text-[10px] transition-all ${i === gameState.roundIndex ? 'bg-yellow-500 border-white scale-110 text-black' : 'opacity-20 border-slate-800'}`}>{t.label}</div>))}
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-4 overflow-hidden relative">
        <div className={`grid gap-4 w-full max-w-7xl mb-6 transition-all duration-700 ${isPadExpanded ? 'scale-90 opacity-40' : 'scale-100'} ${gameState.players.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
            {gameState.players.map((p, idx) => (<div key={p.id} className={`p-4 rounded-[2rem] border-4 transition-all ${idx === gameState.currentTurnIndex ? 'border-yellow-500 bg-yellow-500/5 shadow-2xl' : 'border-slate-900 opacity-40'}`}><div className="flex items-center gap-4"><img src={p.avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover bg-black" /><div><p className="text-[10px] font-black text-yellow-500 leading-none">{p.username}</p><p className="text-4xl font-black tabular-nums">{p.score}</p></div></div></div>))}
        </div>

        <div className={`flex flex-row items-center justify-center gap-12 transition-all duration-1000 ${isPadExpanded ? 'scale-90' : 'scale-110 lg:scale-125'}`}>
            <VisualDartboard lastDarts={gameState.dartsThrown} highlight={currentTarget.type === 'BULL' ? 'BULL' : currentTarget.type === 'ANY_DOUBLE' ? 'ANY_DOUBLE' : currentTarget.type === 'ANY_TRIPLE' ? 'ANY_TRIPLE' : Number(currentTarget.type) || null} />
            <div className="flex flex-col items-center text-center">
                <p className="text-xs font-black text-yellow-500 uppercase mb-2 opacity-50 italic">Target</p>
                <div className="flex flex-row items-center gap-10">
                    <h2 className="text-[10rem] leading-none font-black italic text-white drop-shadow-[0_0_60px_rgba(250,204,21,0.4)] tabular-nums">{currentTarget.value || currentTarget.label}</h2>
                    {remainingForExact !== null && (<div className="bg-cyan-500/10 border-2 border-cyan-400 p-8 rounded-[3rem] shadow-2xl animate-pulse"><p className="text-[10px] uppercase">Rem</p><p className="text-8xl font-black italic text-white">{remainingForExact}</p></div>)}
                </div>
            </div>
        </div>
      </div>

      {!gameState.isFinished && (
        <div className="w-full flex justify-center z-30 shrink-0"><ArcadeNumpad activeGooierName={currentPlayer.username} dartsThrownCount={gameState.dartsThrown.length} onThrow={handleHit} onEndTurn={() => setGameState(prev => ({...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, dartsThrown: []}))} onToggle={(e) => setIsPadExpanded(e)} color="#facc15" /></div>
      )}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}