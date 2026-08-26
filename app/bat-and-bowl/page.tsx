'use client';

import { useState, useEffect } from 'react';
import { BatAndBowlEngine, BatAndBowlState } from '../../lib/engines/batAndBowl';
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

  const handleManualHit = async (multiplier: number) => {
    if (!gameState || !matchId || gameState.phase === 'FINISHED') return;
    const input = document.getElementById('bbInput') as HTMLInputElement;
    const score = parseInt(input.value);
    if (isNaN(score)) return;

    const nextState = BatAndBowlEngine.handleThrow(gameState, { score, multiplier, raw: 'HIT' });
    if (nextState.phase === 'FINISHED') {
        SoundService.play('win');
        setReactionUrl(GifService.getRandomGifUrl('WINNER'));
        if (nextState.winnerId) MatchService.finishMatch(matchId, nextState.winnerId);
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
    input.value = "";
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
    <div className="relative">
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
    <main className="min-h-screen bg-[#020617] text-white p-6 flex flex-col items-center">
      
      {/* 1. Header */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
        <Link href="/" className="text-[10px] font-black bg-black px-6 py-2 rounded-full border border-slate-800">LOBBY</Link>
        <p className="text-[#00FF66] font-black uppercase text-[10px] tracking-[0.3em]">
          {gameState.innings === 1 ? 'Innings 1' : `Innings 2 (Target: ${gameState.innings_1_target})`}
        </p>
        <div className="w-20" />
      </div>

      {/* DIDDLE VIEW */}
      {gameState.phase === 'DIDDLE' && (
        <div className="flex-grow flex flex-col items-center justify-center animate-in fade-in zoom-in">
          <h2 className="text-4xl font-black italic mb-12 uppercase tracking-tighter">Diddle For Bull</h2>
          <div className="flex gap-12">
            {gameState.players.map((p, i) => (
                <div key={p.id} className={`p-10 rounded-[3rem] border-4 transition-all ${i === gameState.currentTurnIndex ? 'border-cyan-400 bg-cyan-900/20 shadow-2xl' : 'border-slate-800 opacity-40'}`}>
                    <img src={p.avatar_url} className="w-24 h-24 rounded-full mb-4 border-2 border-white/20 object-cover bg-black" alt="" />
                    <p className="text-center font-black uppercase">{p.username}</p>
                    <p className="text-center text-5xl font-mono mt-4 text-cyan-400">{p.diddle_score ?? '??'}</p>
                </div>
            ))}
          </div>
          <div className="mt-12 flex gap-4">
             <button onClick={() => { (document.getElementById('bbInput') as HTMLInputElement).value = "25"; handleManualHit(1); }} className="bg-green-600 px-10 py-5 rounded-2xl font-black shadow-lg">OUTER BULL</button>
             <button onClick={() => { (document.getElementById('bbInput') as HTMLInputElement).value = "25"; handleManualHit(2); }} className="bg-red-600 px-10 py-5 rounded-2xl font-black shadow-lg">BULLSEYE</button>
             <button onClick={() => { (document.getElementById('bbInput') as HTMLInputElement).value = "1"; handleManualHit(1); }} className="bg-slate-800 px-10 py-5 rounded-2xl font-black opacity-50">MISS</button>
             <input type="hidden" id="bbInput" />
          </div>
        </div>
      )}

      {/* CHOICE MODAL */}
      {decider && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6">
            <img src={decider.avatar_url} className="w-40 h-40 rounded-full border-4 border-[#00FF66] mb-6 object-cover bg-black" alt="" />
            <h2 className="text-4xl font-black italic mb-12 uppercase">{decider.username} WINS BULL!</h2>
            <div className="flex gap-6">
                <button onClick={() => setRoles(decider.id)} className="bg-white text-black px-16 py-8 rounded-3xl font-black text-2xl hover:scale-110 transition shadow-2xl uppercase">BAT FIRST</button>
                <button onClick={() => setRoles(gameState.players.find(p => p.id !== decider.id)!.id)} className="bg-red-600 text-white px-16 py-8 rounded-3xl font-black text-2xl hover:scale-110 transition shadow-2xl uppercase">BOWL FIRST</button>
            </div>
        </div>
      )}

      {/* GAME BOARD */}
      {gameState.phase === 'PLAY' && batsman && bowler && (
        <div className="w-full max-w-7xl flex flex-col items-center flex-grow">
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow items-center">
                {/* BATSMAN */}
                <div className={`p-8 rounded-[4rem] border-8 transition-all ${currentPlayer.role === 'batting' ? 'border-[#00FF66] bg-[#00FF66]/5 shadow-2xl' : 'border-slate-900 opacity-40'}`}>
                    <div className="flex items-center gap-6 mb-6">
                        <img src={batsman.avatar_url} className="w-20 h-20 rounded-full border-2 border-white/10 object-cover bg-black" alt="" />
                        <div><p className="text-[#00FF66] font-black uppercase text-xs">Batsman</p><h3 className="text-3xl font-black italic uppercase">{batsman.username}</h3></div>
                    </div>
                    <div className="text-[10rem] font-black leading-none tracking-tighter tabular-nums">{batsman.score}</div>
                    {gameState.innings === 2 && <p className="text-white text-lg font-bold mt-4 italic uppercase">Chase: {gameState.innings_1_target! + 1}</p>}
                </div>

                {/* BOWLER */}
                <div className={`p-8 rounded-[4rem] border-8 transition-all ${currentPlayer.role === 'bowling' ? 'border-red-600 bg-red-950/10 shadow-2xl' : 'border-slate-900 opacity-40'}`}>
                    <div className="flex items-center gap-6 mb-8">
                        <img src={bowler.avatar_url} className="w-20 h-20 rounded-full border-2 border-white/10 object-cover bg-black" alt="" />
                        <div><p className="text-red-500 font-black uppercase text-xs">Bowler</p><h3 className="text-3xl font-black italic uppercase">{bowler.username}</h3></div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 mb-8">
                        {[1,2,3,4,5,6,7,8,9,10].map(w => (
                            <div key={w} className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black border-2 transition-all ${w <= bowler.wickets ? 'bg-red-600 border-red-500 text-white' : w === bowler.wickets + 1 ? 'border-[#00FF66] text-[#00FF66] animate-pulse scale-110' : 'border-slate-800 text-slate-800'}`}>{w <= bowler.wickets ? 'X' : w}</div>
                        ))}
                    </div>
                    <div className="text-2xl font-black uppercase text-red-500">{bowler.wickets} / 10 Wickets</div>
                </div>
            </div>

            {/* INPUT CONSOLE */}
            {!gameState.winnerId && (
              <div className="w-full max-w-md bg-slate-900/90 p-8 rounded-t-[4rem] border-t-4 border-slate-700 mt-8 shadow-2xl">
                <div className="flex gap-2 justify-center mb-6 h-10">
                    {gameState.dartsThrown.map((d, i) => (<div key={i} className="bg-white text-black px-4 py-1 rounded-full font-black italic text-xs animate-in zoom-in">HIT</div>))}
                </div>
                <p className="text-center text-slate-500 font-black text-xs uppercase mb-4 tracking-widest">
                    Target: {currentPlayer.role === 'bowling' ? (bowler.wickets + 1) : 'ANYTHING'}
                </p>
                <input type="number" id="bbInput" className="bg-black border-2 border-slate-800 w-full p-4 rounded-2xl text-center text-4xl font-black mb-4 outline-none focus:border-[#00FF66]" placeholder="00" />
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleManualHit(1)} className="bg-slate-800 p-4 rounded-xl font-black text-xs">S</button>
                    <button onClick={() => handleManualHit(2)} className="bg-blue-600 p-4 rounded-xl font-black text-xs">D</button>
                    <button onClick={() => handleManualHit(3)} className="bg-red-600 p-4 rounded-xl font-black text-xs">T</button>
                    <button onClick={() => setGameState(prev => ({...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % 2, dartsThrown: []}))} className="col-span-3 bg-[#00FF66] text-black p-4 rounded-xl font-black mt-2 uppercase text-xs italic shadow-lg">End Turn</button>
                </div>
              </div>
            )}
        </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}