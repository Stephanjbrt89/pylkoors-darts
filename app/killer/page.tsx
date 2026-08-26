'use client';

import { useState, useEffect } from 'react';
import { KillerEngine, KillerState, KILLER_TARGETS } from '@/lib/engines/killer';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { SquadSelect } from '@/components/SquadSelect';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { GameInfo } from '@/components/GameInfo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function KillerPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<KillerState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [difficulty, setDifficulty] = useState<'EASY' | 'HARD'>('EASY');
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    const id = await ArcadeService.createMultiplayerMatch('ARCADE_KILLER', selectedPlayers.map(p => p.id));
    const initialState = KillerEngine.createInitialState(selectedPlayers, difficulty);
    setMatchId(id);
    setGameState(initialState);
    await ArcadeService.saveGameState(id, initialState);
  };

  const handleHit = async (score: number, multiplier: number) => {
    if (!gameState || !matchId || gameState.isFinished) return;
    const nextState = KillerEngine.handleThrow(gameState, { score, multiplier, raw: 'HIT' });
    
    if (nextState.isFinished) {
      SoundService.play('win');
      setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      MatchService.finishMatch(matchId, nextState.winnerId!);
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  const handleChoice = async (target: string) => {
    if (!gameState || !matchId || !gameState.pendingChoice) return;
    const nextState = KillerEngine.applyHit(gameState, gameState.pendingChoice.dart, target);
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex gap-4">
        <button onClick={() => setDifficulty('EASY')} className={`px-8 py-3 rounded-2xl font-black text-sm border-4 transition ${difficulty === 'EASY' ? 'bg-yellow-500 text-black border-yellow-400' : 'text-slate-600 border-slate-900'}`}>EASY MODE</button>
        <button onClick={() => setDifficulty('HARD')} className={`px-8 py-3 rounded-2xl font-black text-sm border-4 transition ${difficulty === 'HARD' ? 'bg-red-600 text-white border-red-500' : 'text-slate-600 border-slate-900'}`}>HARD MODE</button>
      </div>
      <SquadSelect gameName="Killer Tactics" minPlayers={2} maxPlayers={2} onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo title="Killer" color="#facc15" rules={["Diddle closest to Bull starts.","Hit a target 3x to open it.","Once open, score points if opponent hasn't closed it yet.","Close all 14 rows to win."]} />
      </div>
    </main>
  );

  if (!gameState) return null;

  // DIDDLE VIEW
  if (gameState.phase === 'DIDDLE') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h2 className="text-4xl font-black italic mb-12 uppercase text-yellow-500">Diddle For Order</h2>
        <div className="flex gap-8 mb-16">
          {gameState.players.map((p, i) => (
            <div key={p.id} className={`p-8 rounded-[3rem] border-4 transition-all ${gameState.currentTurnIndex === i ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-900 opacity-40'}`}>
              <img src={p.avatar_url} className="w-24 h-24 rounded-full mb-4 border-2 border-white/10" alt="" />
              <p className="text-center font-black uppercase text-sm">{p.username}</p>
              <p className="text-center text-5xl font-mono mt-4">{p.diddle_score ?? '??'}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
           <button onClick={() => handleHit(25, 1)} className="bg-green-600 px-10 py-5 rounded-2xl font-black uppercase italic">Outer Bull</button>
           <button onClick={() => handleHit(25, 2)} className="bg-red-600 px-10 py-5 rounded-2xl font-black uppercase italic">Bullseye</button>
           <button onClick={() => handleHit(1, 1)} className="bg-slate-800 px-10 py-5 rounded-2xl font-black opacity-50 uppercase italic">Miss</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0f14] text-white p-4 flex flex-col items-center overflow-hidden">
      
      {/* OVERLAP CHOICE MODAL */}
      {gameState.pendingChoice && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in">
          <h2 className="text-4xl font-black italic mb-2 uppercase text-yellow-500">Strategic Choice</h2>
          <p className="text-slate-400 mb-12 uppercase font-bold tracking-widest">Assign this hit to which row?</p>
          <div className="flex gap-6">
            {gameState.pendingChoice.options.map(opt => (
              <button key={opt} onClick={() => handleChoice(opt)} className="bg-white text-black px-16 py-8 rounded-[2rem] font-black text-4xl hover:scale-110 transition shadow-2xl uppercase italic border-4 border-yellow-500">
                Row {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOP STATS */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="text-[10px] font-black bg-slate-900 border-2 border-slate-800 px-6 py-2 rounded-full uppercase">Quit</Link>
        <div className="flex gap-12">
            {gameState.players.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${gameState.currentTurnIndex === i ? 'border-yellow-500 bg-yellow-500/10 shadow-lg' : 'border-transparent opacity-40'}`}>
                    <img src={p.avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover" alt="" />
                    <div className="text-right">
                        <p className="text-xs font-black uppercase text-yellow-500">{p.username}</p>
                        <p className="text-4xl font-black font-mono">{p.score}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* THE VERTICAL BOARD */}
      <div className="flex-grow w-full max-w-xl bg-slate-950 rounded-[3rem] border-4 border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-yellow-500 py-3 text-center"><h2 className="text-black font-black italic tracking-[0.3em] text-xl">KILLER</h2></div>
        <div className="flex-grow flex flex-col divide-y divide-white/5">
            {KILLER_TARGETS.map((target) => {
                const p1 = gameState.players[0];
                const p2 = gameState.players[1];
                const isDead = p1.hits[target] >= 3 && p2.hits[target] >= 3;
                return (
                    <div key={target} className={`flex flex-1 items-center justify-between px-8 ${isDead ? 'opacity-10 bg-red-950/20' : ''}`}>
                        <div className="flex gap-2 w-28">
                            {[1, 2, 3].map(n => <div key={n} className={`text-2xl font-black ${p1.hits[target] >= n ? 'text-yellow-500 drop-shadow-[0_0_8px_#facc15]' : 'text-slate-900'}`}>{p1.hits[target] >= n ? 'X' : '•'}</div>)}
                        </div>
                        <div className={`text-3xl font-black italic w-20 text-center border-x border-white/5 bg-black/40 py-1 ${isDead ? 'line-through text-slate-700' : 'text-yellow-500'}`}>{target}</div>
                        <div className="flex gap-2 w-28 justify-end text-right">
                            {[3, 2, 1].map(n => <div key={n} className={`text-2xl font-black ${p2.hits[target] >= n ? 'text-yellow-500 drop-shadow-[0_0_8px_#facc15]' : 'text-slate-900'}`}>{p2.hits[target] >= n ? 'X' : '•'}</div>)}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* INPUT CONSOLE */}
      {!gameState.isFinished && (
        <div className="mt-6 w-full max-w-md bg-slate-900/90 p-8 rounded-t-[4rem] border-t-4 border-yellow-500 backdrop-blur-xl flex flex-col items-center">
            <div className="flex gap-2 justify-center mb-6 h-10">
                {gameState.dartsThrown.map((d, i) => (<div key={i} className="bg-yellow-500 text-black px-6 py-2 rounded-full font-black text-xs animate-in zoom-in">HIT</div>))}
            </div>
            <input type="number" id="killInput" className="bg-black border-2 border-slate-800 w-full p-4 rounded-2xl text-center text-5xl font-black mb-4 outline-none focus:border-yellow-500 text-white" placeholder="00" />
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { const v = (document.getElementById('killInput') as HTMLInputElement); handleHit(Number(v.value), 1); v.value=""; }} className="bg-slate-800 p-5 rounded-2xl font-black text-sm uppercase italic">Single</button>
                <button onClick={() => { const v = (document.getElementById('killInput') as HTMLInputElement); handleHit(Number(v.value), 2); v.value=""; }} className="bg-blue-600 p-5 rounded-2xl font-black text-sm uppercase italic text-white shadow-lg">Double</button>
                <button onClick={() => { const v = (document.getElementById('killInput') as HTMLInputElement); handleHit(Number(v.value), 3); v.value=""; }} className="bg-red-600 p-5 rounded-2xl font-black text-sm uppercase italic text-white shadow-lg">Triple</button>
            </div>
        </div>
      )}

      {gameState.isFinished && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
            <h2 className="text-8xl font-black italic text-yellow-500 uppercase tracking-tighter mb-4 animate-bounce">LEGENDARY!</h2>
            <p className="text-2xl text-white font-black uppercase mb-12 tracking-widest">{gameState.players.find(p => p.id === gameState.winnerId)?.username} Wins</p>
            <button onClick={() => window.location.reload()} className="bg-white text-black px-16 py-6 rounded-3xl font-black text-xl hover:scale-110 transition shadow-2xl uppercase">Return to Lobby</button>
        </div>
      )}
      const margin = Math.abs(gameState.players[0].score - gameState.players[1].score);
StatsService.updateRecord('ARCADE_KILLER', 'BIGGEST_MARGIN', winnerId, margin, matchId);
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}