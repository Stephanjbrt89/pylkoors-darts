'use client';

import { useState, useEffect, useMemo } from 'react';
import { GolfEngine, GolfState } from '@/lib/engines/golf';
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
import { NewRecordModal } from '@/components/NewRecordModal';
import { GolfScorecard } from '@/components/GolfScorecard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GolfPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GolfState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [showHoleSelect, setShowHoleSelect] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<any[]>([]);
  const [isPadExpanded, setIsPadExpanded] = useState(false);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [recordData, setRecordData] = useState<any>(null);
  const [showStatsOverlay, setShowStatsOverlay] = useState<any | null>(null);
  const router = useRouter();

  const handleSquadConfirmed = (players: any[]) => {
    setSelectedSquad(players);
    setShowSquadSelect(false);
    setShowHoleSelect(true);
  };

  const handleStartGame = async (holes: 9 | 18) => {
    setShowHoleSelect(false);
    try {
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_GOLF', selectedSquad.map(p => p.id));
      const initial = GolfEngine.createInitialState(selectedSquad, holes);
      setMatchId(id);
      setGameState(initial);
      await ArcadeService.saveGameState(id, initial);
    } catch (err) { console.error(err); }
  };

  const triggerTurnRecap = (player: any) => {
    setShowStatsOverlay(player);
    setTimeout(() => { setShowStatsOverlay(null); }, 4000);
  };

  const onThrow = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.isFinished) return;

    if (score === 50 || (score === 25 && multiplier === 2)) {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
    } else if (multiplier === -1 || multiplier === 0) {
        SoundService.play('bust');
        setReactionUrl(GifService.getRandomGifUrl('BUST'));
    }

    const nextState = GolfEngine.handleThrow(gameState, { score, multiplier, raw: label });
    
    // Auto-bank logic
    if (nextState.currentVisitDarts.length === 0 && !nextState.isFinished) {
        const lastPlayerIdx = (nextState.currentTurnIndex - 1 + nextState.players.length) % nextState.players.length;
        const playerRecap = nextState.players[lastPlayerIdx];
        const lastHoleScore = playerRecap.holeScores[gameState.currentHole];
        
        if (lastHoleScore < 0) setReactionUrl(GifService.getRandomGifUrl('BOOM'));
        triggerTurnRecap(playerRecap);
    }

    if (nextState.isFinished) handleMatchEnd(nextState, matchId);
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const handleMatchEnd = async (finalState: GolfState, mId: string) => {
    const winner = finalState.players.find(p => p.id === finalState.winnerId);
    if (!winner) return;
    SoundService.play('win');
    setReactionUrl(GifService.getRandomGifUrl('WINNER'));
    await MatchService.finishMatch(mId, winner.id);
    for (const p of finalState.players) {
        // Record both high and low (Low is best)
        await StatsService.updateRecord(`GOLF_${finalState.totalHoles}`, 'LOWEST_SCORE', p.id, p.totalScore, mId);
        await StatsService.updateRecord(`GOLF_${finalState.totalHoles}`, 'HIGHEST_SCORE', p.id, p.totalScore, mId);
    }
  };

  const bankTurn = async () => {
    if (!gameState || !matchId || gameState.currentVisitDarts.length === 0) return;
    const playerBanking = gameState.players[gameState.currentTurnIndex];
    const nextState = GolfEngine.bankAndAdvance(gameState);
    
    if (nextState.isFinished) {
      handleMatchEnd(nextState, matchId);
    } else {
      // Find the updated player object from the next state to get the baked-in hole score
      const updatedPlayer = nextState.players.find(p => p.id === playerBanking.id);
      triggerTurnRecap(updatedPlayer);
    }
    
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const dartsStatus = useMemo(() => {
    if (!gameState) return [];
    return gameState.currentVisitDarts.map(d => {
        const s = GolfEngine.evalGolfDart(d, gameState.currentHole);
        return s <= 0 ? 'hit' : 'miss';
    });
  }, [gameState]);

  if (showSquadSelect) return <SquadSelect gameName="Darts Golf" onStart={handleSquadConfirmed} onCancel={() => router.push('/')} />;
  if (showHoleSelect) return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-6 text-white bg-black">
      <div className="absolute inset-0 z-0"><img src="/golf-bg.jpg" className="w-full h-full object-cover grayscale opacity-30" alt="" /></div>
      <div className="relative z-10 text-center">
        <h2 className="text-5xl font-black italic text-emerald-400 mb-12 uppercase tracking-tighter">Choose Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <button onClick={() => handleStartGame(9)} className="bg-white/10 backdrop-blur-md border-4 border-white/20 p-12 rounded-[3rem] hover:border-emerald-500 transition-all text-6xl font-black italic">9 HOLES</button>
            <button onClick={() => handleStartGame(18)} className="bg-white/10 backdrop-blur-md border-4 border-white/20 p-12 rounded-[3rem] hover:border-emerald-500 transition-all text-6xl font-black italic">18 HOLES</button>
        </div>
      </div>
    </main>
  );

  if (!gameState) return null;
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const lastDart = gameState.currentVisitDarts[gameState.currentVisitDarts.length - 1];
  const pendingScore = lastDart ? GolfEngine.evalGolfDart(lastDart, gameState.currentHole) : null;

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] text-white overflow-hidden relative transition-all duration-500 bg-black">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src="/golf-bg.jpg" className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/60 backdrop-blur-md border-b border-white/10 z-20 shrink-0">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">LOBBY</Link>
        <div className="text-center">
            <p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.3em]">Hole {gameState.currentHole} / {gameState.totalHoles}</p>
            <h1 className="text-xl font-black italic uppercase text-white leading-none">Pylkoors Golf Club</h1>
        </div>
        <GameInfo title="Golf" color="#10b981" rules={["Last dart thrown counts.", "Bank early to save score.", "Bunker = +2, Water = +3.", "Under Par (Negative) is good!"]} />
      </div>

      <div className="relative z-10 flex items-center justify-center px-4 md:px-8 pb-4 overflow-hidden h-full">
        <div className={`w-full max-w-[2100px] flex items-center justify-between gap-4 h-full transition-all duration-1000 ${isPadExpanded ? 'scale-90' : 'scale-100'}`}>
            <div className={`w-[480px] h-full flex flex-col gap-3 overflow-y-auto no-scrollbar shrink-0 py-4 transition-all duration-700 ${isPadExpanded ? 'scale-90 opacity-40' : 'scale-100'}`}>
                {gameState.players.map((p, idx) => (
                    <div key={p.id} className="backdrop-blur-sm rounded-[1.5rem] overflow-hidden">
                        <GolfScorecard player={p} totalHoles={gameState.totalHoles} isActive={idx === gameState.currentTurnIndex} />
                    </div>
                ))}
            </div>

            <div className="flex-grow flex items-center justify-center h-full">
                <div className={`transition-all duration-1000 drop-shadow-[0_0_100px_rgba(0,0,0,1)] ${isPadExpanded ? 'scale-[1.4]' : 'scale-[2.0]'}`}>
                    <VisualDartboard lastDarts={gameState.currentVisitDarts} highlight={gameState.currentHole} />
                </div>
            </div>

            <div className={`p-6 rounded-[3rem] border-4 transition-all w-64 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md border-emerald-500/30 shrink-0 ${isPadExpanded ? 'scale-90 opacity-30' : 'scale-100'}`}>
                <p className="text-emerald-400 font-black uppercase text-[10px] tracking-widest mb-1">Target</p>
                <div className="text-[10rem] font-black leading-none italic text-white drop-shadow-[0_0_50px_rgba(16,185,129,0.3)] tabular-nums">{gameState.currentHole}</div>
                {pendingScore !== null && (
                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl text-center w-full animate-pulse shadow-2xl">
                        <p className={`text-6xl font-black italic ${pendingScore <= 0 ? 'text-emerald-400' : 'text-red-500'}`}>{GolfEngine.formatGolfScore(pendingScore)}</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase mt-2 italic">Last Throw</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="w-full flex justify-center z-30">
          <ArcadeNumpad activeGooierName={currentPlayer.username} dartsThrownCount={gameState.currentVisitDarts.length} dartsStatus={dartsStatus} onThrow={onThrow} onEndTurn={bankTurn} onToggle={setIsPadExpanded} color="#10b981" showGolfHazards={true} />
      </div>

      {showStatsOverlay && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-12 bg-black/90 backdrop-blur-2xl">
           <div className="w-full max-w-5xl shadow-2xl">
             <div className="text-center mb-8">
                <p className="text-[#10b981] font-black text-2xl uppercase tracking-[0.5em]">Hole Completed</p>
                <h2 className="text-white font-black italic text-6xl uppercase mt-2">{showStatsOverlay.username}</h2>
             </div>
             <GolfScorecard player={showStatsOverlay} totalHoles={gameState.totalHoles} isActive={true} />
           </div>
        </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal show={!!recordData} type={recordData?.type} value={recordData?.value} playerName={recordData?.name} />
    </main>
  );
}