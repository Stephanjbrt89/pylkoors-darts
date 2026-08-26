'use client';

import { useState, useEffect } from 'react';
import { FightEngine, FightState } from '../../lib/engines/fight';
import { ArcadeService } from '../../lib/services/arcadeService';
import { MatchService } from '../../lib/services/matchService';
import { SoundService } from '../../lib/services/soundService';
import { GifService } from '../../lib/services/gifService';
import { SquadSelect } from '../../components/SquadSelect';
import { ArcadeLogo } from '../../components/ArcadeLogo';
import { GameInfo } from '../../components/GameInfo';
import { ReactionOverlay } from '../../components/ReactionOverlay';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FightGamePage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<FightState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState<'red' | 'green' | null>(null);
  const [spinNumber, setSpinNumber] = useState(1);
  const [assigningToIdx, setAssigningToIdx] = useState(0);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const cleaned = selectedPlayers.map(p => ({ 
        id: String(p.id), 
        username: String(p.username), 
        avatar_url: String(p.avatar_url) 
      }));
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_FIGHT', cleaned.map(p => p.id));
      setMatchId(id);
      const initial = FightEngine.createInitialState(cleaned);
      setGameState(initial);
      startSectorAssignment(initial, id);
    } catch (err) {
      console.error(err);
    }
  };

const startSectorAssignment = async (state: FightState, mId: string) => {
    // 1. Create the master deck
    const availableNumbers = Array.from({ length: 20 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    const claimedNumbers: number[] = []; // Track claimed numbers for the visual jitter
    const finalPlayers = state.players.map(p => ({ ...p, sectors: [] as number[] }));

    for (let i = 0; i < finalPlayers.length; i++) {
      setAssigningToIdx(i);
      
      for (let s = 0; s < 2; s++) {
        // 2. Visual Jitter Phase
        for (let step = 0; step < 12; step++) {
          // SMART JITTER: Only show numbers that haven't been claimed yet
          const pool = Array.from({ length: 20 }, (_, n) => n + 1)
                            .filter(n => !claimedNumbers.includes(n));
          
          const randomDisplay = pool[Math.floor(Math.random() * pool.length)];
          setSpinNumber(randomDisplay || 1);
          await new Promise(r => setTimeout(r, 60));
        }

        // 3. The Final Draw
        const assigned = availableNumbers.pop()!;
        claimedNumbers.push(assigned); // Mark as claimed
        
        finalPlayers[i].sectors.push(assigned);
        setSpinNumber(assigned);
        
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const playState = { ...state, players: finalPlayers, phase: 'PLAY' as const };
    setGameState(playState);
    await ArcadeService.saveGameState(mId, playState);
  };

  const handleManualHit = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.isFinished || gameState.phase === 'ASSIGNING') return;
    const nextState = FightEngine.handleThrow(gameState, { score, multiplier, raw: label });

    if (nextState.lastAction?.type === 'DAMAGE') {
      setFlash('red');
      SoundService.play('bust');
      const target = nextState.players.find(p => p.id === nextState.lastAction?.targetId);
      if (target?.isEliminated) setReactionUrl(GifService.getRandomGifUrl('ELIMINATED'));
    } else if (nextState.lastAction?.type === 'HEAL') {
      setFlash('green');
    }
    setTimeout(() => setFlash(null), 300);

    if (nextState.isFinished && nextState.winnerId) {
      SoundService.play('win');
      setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      await MatchService.finishMatch(matchId, nextState.winnerId);
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return <SquadSelect gameName="Fight Game" minPlayers={2} maxPlayers={6} onStart={handleStartGame} onCancel={() => router.push('/')} />;
  if (!gameState) return null;

  if (gameState.phase === 'ASSIGNING') {
    const p = gameState.players[assigningToIdx];
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="flex flex-col items-center p-12 bg-slate-900 border-4 border-slate-800 rounded-[4rem] shadow-2xl w-full max-w-xl relative overflow-hidden">
           <img src={p.avatar_url} className="w-40 h-40 rounded-full border-4 border-cyan-500 mb-8" alt="" />
           <p className="text-4xl font-black italic uppercase mb-12 tracking-tighter">{p.username}</p>
           <div className="text-[15rem] font-black italic leading-none text-white drop-shadow-[0_0_50px_rgba(0,240,255,0.6)] tabular-nums">{spinNumber}</div>
        </div>
      </main>
    );
  }

  const activeUser = gameState.players[gameState.currentTurnIndex];

  return (
    <main className={`min-h-screen transition-colors duration-300 flex flex-col items-center p-6 ${flash === 'red' ? 'bg-red-950' : flash === 'green' ? 'bg-green-950' : 'bg-[#050505]'}`}>
      <div className="w-full max-w-7xl flex justify-between items-center mb-8">
        <Link href="/" className="text-[10px] font-black bg-slate-900 px-6 py-2 rounded-full border border-white/10 uppercase">QUIT</Link>
        <div className="text-center">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">Fight Game</h1>
        </div>
        <GameInfo title="Fight Game" color="#ff003c" rules={["Defend your 2 random SECTORS.", "Hit an OPPONENT'S sector to damage them.", "Hit your OWN sector to heal +1.", "Double/Triple segments multiply damage."]} />
      </div>

      <div className={`grid gap-4 w-full max-w-7xl flex-grow ${gameState.players.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {gameState.players.map((p, idx) => (
          <div key={p.id} className={`relative p-6 rounded-[2.5rem] border-4 transition-all duration-500 ${idx === gameState.currentTurnIndex && !gameState.isFinished ? 'border-white bg-white/5 scale-105 shadow-2xl z-10' : 'border-slate-900 opacity-40'} ${p.isEliminated ? 'grayscale opacity-20' : ''}`}>
            <div className="flex items-center gap-4 mb-6">
              {/* FIXED: Using p.avatar_url here */}
              <img src={p.avatar_url} className="w-16 h-16 rounded-full border-2 border-white/20 object-cover" alt="" />
              <div>
                <h3 className="text-xl font-black italic uppercase leading-none">{p.username}</h3>
                <div className="flex gap-2 mt-2">
                   {p.sectors.map(s => <span key={s} className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">#{s}</span>)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-9 gap-1 h-5">
              {[...Array(9)].map((_, i) => <div key={i} className={`rounded-sm transition-all duration-700 ${i < p.lives ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-slate-800'}`} />)}
            </div>
            {p.isEliminated && <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-black italic text-red-600 text-4xl -rotate-12 uppercase">Wasted</div>}
          </div>
        ))}
      </div>

      {!gameState.isFinished && (
        <div className="w-full max-w-md bg-slate-900/90 p-8 rounded-t-[4rem] border-t-4 border-red-600 mt-8 shadow-2xl flex flex-col items-center">
            <p className="text-white font-black uppercase text-xs mb-4 italic tracking-widest text-center">Attacking: {activeUser?.username}</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[1, 2, 3].map(m => (
                <button key={m} onClick={() => {
                    const input = document.getElementById('fightInput') as HTMLInputElement;
                    const val = Number(input.value);
                    if (val > 0) { handleManualHit(val, m, 'HIT'); input.value = ""; }
                }} className={`p-5 rounded-2xl font-black text-xs ${m === 1 ? 'bg-slate-800' : m === 2 ? 'bg-blue-600' : 'bg-red-600'}`}>
                  {m === 1 ? 'SINGLE' : m === 2 ? 'DOUBLE' : 'TRIPLE'}
                </button>
              ))}
            </div>
            <input type="number" id="fightInput" className="bg-black border-2 border-slate-800 w-full p-5 rounded-3xl text-center text-5xl font-black mt-4 outline-none focus:border-red-600 text-white" placeholder="00" />
        </div>
      )}

      {gameState.isFinished && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
              <h2 className="text-8xl font-black italic text-red-600 uppercase mb-8">Survivor Found</h2>
              <p className="text-2xl font-black text-white uppercase mb-12">{gameState.players.find(p => p.id === gameState.winnerId)?.username} Wins</p>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-16 py-6 rounded-[2rem] font-black text-xl hover:scale-110 transition shadow-2xl uppercase italic">New Battle</button>
          </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}