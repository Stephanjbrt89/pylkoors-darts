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
import { ReactionOverlay } from '@/components/ReactionOverlay';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HalfeertjiesPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<HalfeertjiesState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<any[]>([]);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    setSelectedSquad(selectedPlayers);
    try {
      const playerIds = selectedPlayers.map(p => p.id);
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_HALFEERTJIES', playerIds);
      const initialState = HalfeertjiesEngine.createInitialState(selectedPlayers);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) { 
      console.error(err); 
      alert("Database error: Could not start match.");
    }
  };

  const handleHit = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.phase === 'FINISHED') return;
    
    const currentPlayerIdx = gameState.currentTurnIndex;
    const oldScore = gameState.players[currentPlayerIdx].score;
    const currentTarget = gameState.targets[gameState.roundIndex];
    
    const nextState = HalfeertjiesEngine.handleThrow(gameState, { score, multiplier, raw: label });

    // --- HYPE & RECORD LOGIC ---
    if (nextState.dartsThrown.length === 0 && nextState.phase !== 'DIDDLE') {
        const updatedPlayer = nextState.players[currentPlayerIdx];
        
        // 1. WAS THE PLAYER HALVED? (Bust)
        if (updatedPlayer.score < oldScore) {
            SoundService.play('bust');
            setReactionUrl(GifService.getRandomGifUrl('BUST'));
        } 
        // 2. WAS IT SUCCESS ON A SPECIAL ROUND?
        else if (['TARGET_SCORE', 'ANY_TRIPLE', 'ANY_DOUBLE', 'BULL'].includes(String(currentTarget.type))) {
            setReactionUrl(GifService.getRandomGifUrl('BOOM'));
        }
    }

    // 3. GAME OVER (Winner & Record Logging)
    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) {
            await MatchService.finishMatch(matchId, nextState.winnerId);
            
            // LOG THE HIGHEST SCORE RECORD
            const winner = nextState.players.find(p => p.id === nextState.winnerId);
            if (winner) {
                await StatsService.updateRecord(
                    'ARCADE_HALFEERTJIES', 
                    'HIGHEST_SCORE', 
                    winner.id, 
                    winner.score, 
                    matchId
                );
            }
        }
    }

    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return (
    <div className="relative min-h-screen bg-black">
      <SquadSelect gameName="Halfeertjies" minPlayers={1} maxPlayers={6} onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo 
          title="Halfeertjies" 
          color="#facc15" 
          rules={[
            "Closest to Bull starts the order (Solo skips diddle).",
            "Hit the specific target to add points.",
            "Round 3: You MUST hit the EXACT total sum with 3 darts.",
            "Miss all 3 darts? Your total score is HALVED.",
            "Highest score after Bullseye wins."
          ]} 
        />
      </div>
    </div>
  );

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const currentTarget = gameState.targets[gameState.roundIndex];

  // MATH ASSISTANT LOGIC
  const currentVisitSum = gameState.dartsThrown.reduce((s, d) => s + (d.score * d.multiplier), 0);
  const remainingForExact = (currentTarget.type === 'TARGET_SCORE' && currentTarget.value) 
    ? currentTarget.value - currentVisitSum 
    : null;

  return (
    <main className="h-screen w-full grid grid-rows-[60px_auto_1fr_auto] bg-[#020205] text-white overflow-hidden relative">
      
      {/* 1. NAVIGATION BAR */}
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">QUIT TO LOBBY</Link>
        <h1 className="text-xl font-black italic tracking-[0.3em] text-yellow-500 uppercase">Halfeertjies</h1>
        <div className="w-20" /> 
      </div>

      {/* 2. ROUND TIMELINE */}
      <div className="w-full flex gap-2 overflow-x-auto no-scrollbar py-4 px-10 border-b border-white/5 bg-white/5">
        {gameState.targets.map((t, i) => (
          <div key={i} className={`flex-shrink-0 px-5 py-2 rounded-xl border-2 font-black italic text-[10px] transition-all duration-500 ${
            i === gameState.roundIndex ? 'bg-yellow-500 border-white scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-black' : 
            i < gameState.roundIndex ? 'opacity-10 border-slate-800' : 'opacity-40 border-slate-800'
          }`}>{t.label}</div>
        ))}
      </div>

      {/* 3. ARENA & SCORES */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 overflow-visible">
        <div className={`grid gap-4 w-full max-w-7xl mb-6 ${gameState.players.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
            {gameState.players.map((p, idx) => (
            <div key={p.id} className={`p-4 rounded-[2rem] border-4 transition-all duration-500 ${
                idx === gameState.currentTurnIndex && gameState.phase === 'PLAY' ? 'border-yellow-500 bg-yellow-500/5 shadow-2xl scale-105' : 'border-slate-900 opacity-40'
            }`}>
                <div className="flex items-center gap-4">
                <img src={p.avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover bg-black shadow-lg" alt="" />
                <div>
                    <p className="text-[10px] font-black uppercase text-yellow-500 leading-none mb-1">{p.username}</p>
                    <p className="text-4xl font-black tabular-nums tracking-tighter">{p.score}</p>
                </div>
                </div>
                {gameState.phase === 'DIDDLE' && p.diddle_score !== null && <p className="text-cyan-400 font-bold mt-2 text-[10px] uppercase">Distance: {p.diddle_score}</p>}
            </div>
            ))}
        </div>

        <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center">
            {gameState.phase === 'DIDDLE' ? (
                <h2 className="text-6xl font-black italic text-cyan-400 animate-pulse uppercase">Diddle For Order</h2>
            ) : gameState.phase === 'FINISHED' ? (
                <h2 className="text-[10rem] font-black text-yellow-500 italic uppercase animate-bounce tracking-tighter">FINISH!</h2>
            ) : (
                <div className="flex flex-col items-center">
                    <p className="text-xs font-black text-yellow-500 uppercase tracking-[0.5em] mb-2 opacity-50">Active Target</p>
                    <div className="flex flex-row items-center justify-center gap-12">
                        <h2 className="text-[12rem] leading-none font-black italic text-white drop-shadow-[0_0_60px_rgba(250,204,21,0.4)] tabular-nums">
                            {currentTarget.type === 'TARGET_SCORE' ? currentTarget.value : currentTarget.label}
                        </h2>
                        {remainingForExact !== null && (
                            <div className="flex flex-col items-center bg-cyan-500/10 border-2 border-cyan-400/50 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(34,211,238,0.2)] animate-pulse">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-2">Remaining</p>
                                <p className="text-8xl font-black italic text-white tabular-nums leading-none">{remainingForExact}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 4. CONSOLE */}
      {gameState.phase !== 'FINISHED' && (
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
            color="#facc15"
          />
        </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}