'use client';

import { useState, useEffect } from 'react';
import { HalfeertjiesEngine, HalfeertjiesState } from '@/lib/engines/halfeertjies';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { SquadSelect } from '@/components/SquadSelect';
import { ArcadeLogo } from '@/components/ArcadeLogo';
import { GameInfo } from '@/components/GameInfo';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatsService } from '@/lib/services/statsService';

export default function HalfeertjiesPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<HalfeertjiesState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const playerIds = selectedPlayers.map(p => p.id);
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_HALFEERTJIES', playerIds);
      const initialState = HalfeertjiesEngine.createInitialState(selectedPlayers);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) { 
      console.error(err); 
      alert("Failed to start match. Ensure database is connected.");
    }
  };

  const handleHit = async (score: number, mult: number) => {
    if (!gameState || !matchId || gameState.phase === 'FINISHED') return;
    
    const currentPlayerIdx = gameState.currentTurnIndex;
    const oldScore = gameState.players[currentPlayerIdx].score;
    const currentTarget = gameState.targets[gameState.roundIndex];
    
    const nextState = HalfeertjiesEngine.handleThrow(gameState, { score, multiplier: mult, raw: 'HIT' });

    // --- REACTION & SOUND TRIGGERS ---
    if (nextState.dartsThrown.length === 0 && nextState.phase !== 'DIDDLE') {
        const updatedPlayer = nextState.players[currentPlayerIdx];
        
        // Was the player halved?
        if (updatedPlayer.score < oldScore) {
            SoundService.play('bust');
            setReactionUrl(GifService.getRandomGifUrl('BUST'));
        } 
        // Was it a success on a high-stakes round?
        else if (['TARGET_SCORE', 'ANY_TRIPLE', 'ANY_DOUBLE', 'BULL'].includes(String(currentTarget.type))) {
            setReactionUrl(GifService.getRandomGifUrl('BOOM'));
        }
    }

    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) await MatchService.finishMatch(matchId, nextState.winnerId);
        gameState.players.forEach(p => {
  StatsService.updateRecord('ARCADE_HALFEERTJIES', 'HIGHEST_SCORE', p.id, p.score, matchId);
});
    }

    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  // --- RENDERING GATES ---

  if (showSquadSelect) return (
    <div className="relative min-h-screen bg-black">
      <SquadSelect gameName="Halfeertjies" onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo 
          title="Halfeertjies" 
          color="#facc15" 
          rules={[
            "Diddle for Bull starts the match.",
            "Hit the target segment to score points.",
            "Round 3: You must score the EXACT total or get halved.",
            "Miss all 3 darts? Total score is HALVED.",
            "Highest score after Bullseye wins."
          ]} 
        />
      </div>
    </div>
  );

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const currentTarget = gameState.targets[gameState.roundIndex];

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center overflow-hidden">
      
      {/* TOP NAVIGATION BAR */}
      <div className="w-full max-w-7xl flex justify-between items-center mb-4">
        <Link href="/" className="text-[10px] font-black bg-slate-900 border border-slate-800 px-6 py-2 rounded-full uppercase tracking-widest hover:bg-red-600 transition">
          QUIT TO LOBBY
        </Link>
        <div className="text-center">
            <h1 className="text-2xl font-black italic tracking-tighter text-yellow-500 uppercase">Halfeertjies</h1>
        </div>
        <div className="w-20" /> 
      </div>

      {/* Target Timeline */}
      <div className="flex gap-2 mb-12 overflow-x-auto w-full max-w-7xl no-scrollbar py-4 px-10 border-y border-white/5 bg-white/5 rounded-2xl">
        {gameState.targets.map((t, i) => (
          <div key={i} className={`flex-shrink-0 px-5 py-2 rounded-xl border-2 font-black italic text-xs transition-all duration-500 ${
            i === gameState.roundIndex ? 'bg-yellow-500 border-white scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-black' : 
            i < gameState.roundIndex ? 'opacity-10 border-slate-800' : 'opacity-40 border-slate-800'
          }`}>{t.label}</div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className={`grid gap-6 w-full max-w-7xl flex-grow ${gameState.players.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {gameState.players.map((p, idx) => (
          <div key={p.id} className={`p-8 rounded-[3rem] border-4 transition-all duration-500 ${
            idx === gameState.currentTurnIndex && gameState.phase === 'PLAY' ? 'border-yellow-500 bg-yellow-500/5 shadow-2xl scale-105' : 'border-slate-900 opacity-40'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <img src={p.avatar_url} className="w-16 h-16 rounded-full border-2 border-white/20 object-cover bg-black" alt="" />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">{p.username}</h3>
            </div>
            <div className="text-7xl font-mono font-black tabular-nums">{p.score}</div>
            {gameState.phase === 'DIDDLE' && p.diddle_score !== null && <p className="text-cyan-400 font-bold mt-2 uppercase text-xs">Distance: {p.diddle_score}</p>}
          </div>
        ))}
      </div>

      {/* Display Area */}
      <div className="flex-grow flex flex-col items-center justify-center text-center py-10">
        {gameState.phase === 'DIDDLE' ? (
          <h2 className="text-7xl font-black italic text-white uppercase tracking-tighter animate-pulse">Diddle For Bull</h2>
        ) : gameState.phase === 'FINISHED' ? (
          <div className="animate-bounce">
            <h2 className="text-8xl font-black text-yellow-500 italic uppercase tracking-tighter">Champion!</h2>
            <Link href="/" className="mt-8 inline-block bg-white text-black px-12 py-4 rounded-2xl font-black uppercase shadow-2xl">Return to Lobby</Link>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <p className="text-xs font-black text-yellow-500 uppercase tracking-[0.6em] mb-6 opacity-60">Active Target</p>
            <h2 className="text-[12rem] leading-none font-black italic text-white drop-shadow-[0_0_60px_rgba(250,204,21,0.4)]">
                {currentTarget.type === 'TARGET_SCORE' ? currentTarget.value : currentTarget.label}
            </h2>
          </div>
        )}
      </div>

      {/* Console */}
      {gameState.phase !== 'FINISHED' && (
        <div className="w-full max-w-md bg-slate-900/90 p-8 rounded-t-[4rem] border-t-4 border-yellow-600 mt-auto shadow-2xl">
            <div className="flex gap-2 justify-center mb-6 h-10">
                {gameState.dartsThrown.map((d, i) => (
                    <div key={i} className="bg-yellow-500 text-black px-5 py-2 rounded-full font-black italic text-xs">HIT</div>
                ))}
            </div>
            <input type="number" id="halInput" className="bg-black border-2 border-slate-800 w-full p-4 rounded-2xl text-center text-4xl font-black mb-4 outline-none focus:border-yellow-500 text-white" placeholder="00" />
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { const v = (document.getElementById('halInput') as HTMLInputElement); if(v.value) { handleHit(Number(v.value), 1); v.value=""; } }} className="bg-slate-800 p-5 rounded-2xl font-black text-xs hover:bg-slate-700 active:scale-95 transition">SINGLE</button>
                <button onClick={() => { const v = (document.getElementById('halInput') as HTMLInputElement); if(v.value) { handleHit(Number(v.value), 2); v.value=""; } }} className="bg-blue-600 p-5 rounded-2xl font-black text-xs text-white hover:bg-blue-500 active:scale-95 transition">DOUBLE</button>
                <button onClick={() => { const v = (document.getElementById('halInput') as HTMLInputElement); if(v.value) { handleHit(Number(v.value), 3); v.value=""; } }} className="bg-red-600 p-5 rounded-2xl font-black text-xs text-white hover:bg-red-500 active:scale-95 transition">TRIPLE</button>
            </div>
        </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}