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
import { ArcadeNumpad } from '@/components/ArcadeNumpad';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatsService } from '@/lib/services/statsService';

export default function KillerPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<KillerState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [difficulty, setDifficulty] = useState<'EASY' | 'HARD'>('EASY');
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<any[]>([]);
  const router = useRouter();

  const handleSquadConfirmed = (selectedPlayers: any[]) => {
    setSelectedSquad(selectedPlayers);
    setShowSquadSelect(false);
    setShowDifficultySelect(true);
  };

  const handleStartGame = async (chosenDifficulty: 'EASY' | 'HARD') => {
    setDifficulty(chosenDifficulty);
    setShowDifficultySelect(false);
    try {
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_KILLER', selectedSquad.map(p => p.id));
      const initialState = KillerEngine.createInitialState(selectedSquad, chosenDifficulty);
      setMatchId(id);
      setGameState(initialState);
      await ArcadeService.saveGameState(id, initialState);
    } catch (err) { console.error(err); }
  };

  const onHit = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.isFinished) return;
    const nextState = KillerEngine.handleThrow(gameState, { score, multiplier, raw: label });
   if (nextState.isFinished) {
    SoundService.play('win');
    setReactionUrl(GifService.getRandomGifUrl('WINNER'));
    if (nextState.winnerId) {
        await MatchService.finishMatch(matchId, nextState.winnerId);
        // ADD THIS LINE:
        await StatsService.updateRecord('ARCADE_KILLER', 'HIGHEST_SCORE', nextState.winnerId, nextState.players.find(p => p.id === nextState.winnerId)!.score, matchId);
    }
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

  if (showSquadSelect) return <SquadSelect gameName="Killer Tactics" minPlayers={1} maxPlayers={4} onStart={handleSquadConfirmed} onCancel={() => router.push('/')} />;
  
  if (showDifficultySelect) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <h2 className="text-5xl font-black italic mb-12 uppercase tracking-tighter">DIFFICULTY</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <button onClick={() => handleStartGame('EASY')} className="bg-slate-900 border-4 border-slate-800 p-10 rounded-[3rem] text-left hover:border-yellow-500 transition-all">
          <h3 className="text-4xl font-black text-yellow-500 mb-2 uppercase">EASY</h3>
          <p className="text-slate-400 text-sm italic font-bold uppercase">All doubles/triples count.</p>
        </button>
        <button onClick={() => handleStartGame('HARD')} className="bg-slate-900 border-4 border-slate-800 p-10 rounded-[3rem] text-left hover:border-red-600 transition-all">
          <h3 className="text-4xl font-black text-red-600 mb-2 uppercase">HARD</h3>
          <p className="text-slate-400 text-sm italic font-bold uppercase">Only 10-20 Multipliers count.</p>
        </button>
      </div>
    </main>
  );

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isSolo = gameState.players.length === 1;
  const isVersus = gameState.players.length === 2;

  // Grid config: Solo (3 cols), Versus (3 cols), Multi 3-4 (5 cols)
  const gridCols = (isSolo || isVersus) ? 'grid-cols-[1fr_100px_1fr]' : 'grid-cols-[1fr_1fr_100px_1fr_1fr]';

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#020205] text-white overflow-hidden relative">
      
      {/* 1. CHOICE OVERLAY */}
      {gameState.pendingChoice && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
          <h2 className="text-5xl font-black italic mb-12 uppercase text-yellow-500 tracking-tighter">Strategic Choice</h2>
          <div className="flex gap-8">
            {gameState.pendingChoice.options.map(opt => (
              <button key={opt} onClick={() => handleChoice(opt)} className="bg-white text-black px-20 py-10 rounded-[2.5rem] font-black text-6xl hover:scale-110 transition border-8 border-yellow-500 italic uppercase">
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. TOP HUD */}
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition text-white">LOBBY</Link>
        <div className="flex-grow flex justify-center gap-12">
          {gameState.players.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 transition-all duration-500 ${gameState.currentTurnIndex === i ? 'scale-110' : 'opacity-30 grayscale'}`}>
                <img src={p.avatar_url} className={`w-10 h-10 rounded-full border-2 object-cover bg-black ${gameState.currentTurnIndex === i ? 'border-yellow-500 shadow-[0_0_15px_#facc15]' : 'border-white/10'}`} alt="" />
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-yellow-500 leading-none mb-0.5">{p.username}</p>
                  <p className="text-2xl font-black font-mono tracking-tighter">{p.score}</p>
                </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-900/80 px-4 py-1 rounded-full border border-white/10 text-[9px] font-black text-yellow-500 uppercase">{difficulty} MODE</div>
      </div>

      {/* 3. THE BOARD (Visual Fix) */}
      <div className="relative z-10 flex items-center justify-center p-2 overflow-hidden h-full">
        <div className={`h-full w-full bg-black/60 rounded-[2.5rem] border-4 border-slate-800 shadow-2xl flex flex-col overflow-hidden ${isSolo ? 'max-w-md' : 'max-w-[1300px]'}`}>
            
            {/* BOARD HEADER */}
            <div className={`bg-[#111] grid items-center text-center py-2 border-b-2 border-yellow-500 ${gridCols}`}>
                {/* Left Side: P1 (Versus/Solo/Multi) */}
                <div className="flex flex-col items-center">
                    <img src={gameState.players[0].avatar_url} className="w-14 h-14 rounded-full border-4 border-yellow-500 object-cover bg-black" />
                    <p className="text-[10px] font-black mt-1 text-yellow-500 uppercase leading-none">{gameState.players[0].username}</p>
                </div>

                {/* Left Side: P2 (Only in Multi 3-4) */}
                {!isSolo && !isVersus && (
                    <div className="flex flex-col items-center">
                        <img src={gameState.players[1]?.avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover bg-black" />
                        <p className="text-[8px] font-black mt-1 text-slate-500 uppercase leading-none">{gameState.players[1]?.username}</p>
                    </div>
                )}

                <div className="font-black italic text-yellow-500 text-xl tracking-[0.2em] uppercase">Target</div>

                {/* Right Side: P2 (Versus) OR P3 (Multi) */}
                <div className="flex flex-col items-center">
                    {isVersus ? (
                        <>
                            <img src={gameState.players[1].avatar_url} className="w-14 h-14 rounded-full border-4 border-yellow-500 object-cover bg-black" />
                            <p className="text-[10px] font-black mt-1 text-yellow-500 uppercase leading-none">{gameState.players[1].username}</p>
                        </>
                    ) : (
                        gameState.players[2] && <><img src={gameState.players[2].avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover bg-black" /><p className="text-[8px] font-black mt-1 text-slate-500 uppercase leading-none">{gameState.players[2].username}</p></>
                    )}
                </div>

                {/* Right Side: P4 (Only in Multi 3-4) */}
                {!isSolo && !isVersus && (
                    <div className="flex flex-col items-center">
                        {gameState.players[3] && <><img src={gameState.players[3].avatar_url} className="w-14 h-14 rounded-full border-2 border-white/20 object-cover bg-black" /><p className="text-[8px] font-black mt-1 text-slate-500 uppercase leading-none">{gameState.players[3].username}</p></>}
                    </div>
                )}
            </div>

            {/* BOARD ROWS */}
            <div className="flex-grow flex flex-col divide-y divide-white/5">
                {KILLER_TARGETS.map((target) => {
                    const tStr = target.toString();
                    const isDead = !isSolo && gameState.players.every(p => p.hits[tStr] >= 3);
                    return (
                        <div key={tStr} className={`grid flex-1 items-center ${gridCols} ${isDead ? 'opacity-10 grayscale bg-red-950/20' : ''}`}>
                            
                            {/* P1 Hits (Left) */}
                            <div className="flex justify-center gap-1.5">
                                {[1, 2, 3].map(n => <div key={n} className={`text-2xl font-black transition-all ${gameState.players[0].hits[tStr] >= n ? 'text-yellow-500 drop-shadow-[0_0_8px_#facc15]' : 'text-slate-900'}`}>{gameState.players[0].hits[tStr] >= n ? 'X' : '•'}</div>)}
                            </div>

                            {/* P2 Hits (Left only in Multi 3-4) */}
                            {!isSolo && !isVersus && (
                                <div className="flex justify-center gap-1.5">
                                    {gameState.players[1] ? [1, 2, 3].map(n => <div key={n} className={`text-2xl font-black ${gameState.players[1].hits[tStr] >= n ? 'text-yellow-500' : 'text-slate-900'}`}>{gameState.players[1].hits[tStr] >= n ? 'X' : '•'}</div>) : null}
                                </div>
                            )}

                            {/* CENTER TARGET */}
                            <div className={`text-2xl font-black italic text-center border-x border-white/10 bg-black/40 py-0.5 ${isDead ? 'line-through text-slate-700' : 'text-yellow-400'}`}>
                                {target}
                            </div>

                            {/* P2 Hits (Right in Versus) OR P3 (Right in Multi) */}
                            <div className="flex justify-center gap-1.5">
                                {isVersus ? (
                                    [1, 2, 3].map(n => <div key={n} className={`text-2xl font-black transition-all ${gameState.players[1].hits[tStr] >= n ? 'text-yellow-500 drop-shadow-[0_0_8px_#facc15]' : 'text-slate-900'}`}>{gameState.players[1].hits[tStr] >= n ? 'X' : '•'}</div>)
                                ) : (
                                    gameState.players[2] ? [1, 2, 3].map(n => <div key={n} className={`text-2xl font-black ${gameState.players[2].hits[tStr] >= n ? 'text-yellow-500' : 'text-slate-900'}`}>{gameState.players[2].hits[tStr] >= n ? 'X' : '•'}</div>) : null
                                )}
                            </div>

                            {/* P4 Hits (Right only in Multi 3-4) */}
                            {!isSolo && !isVersus && (
                                <div className="flex justify-center gap-1.5">
                                    {gameState.players[3] ? [1, 2, 3].map(n => <div key={n} className={`text-2xl font-black ${gameState.players[3].hits[tStr] >= n ? 'text-yellow-500' : 'text-slate-900'}`}>{gameState.players[3].hits[tStr] >= n ? 'X' : '•'}</div>) : null}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* 4. CONSOLE */}
      {!gameState.isFinished && (
        <div className="w-full flex justify-center z-40 relative">
          <ArcadeNumpad 
            activeGooierName={currentPlayer.username}
            dartsThrownCount={gameState.dartsThrown.length}
            onThrow={onHit}
            onEndTurn={() => setGameState(prev => ({ ...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, dartsThrown: [] }))}
            color="#facc15"
          />
        </div>
      )}

      {/* WIN MODAL */}
      {gameState.isFinished && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-6 animate-in zoom-in">
              <div className="relative bg-[#0a0a1a] border-4 border-yellow-500 p-12 rounded-[4rem] max-w-xl w-full text-center shadow-2xl">
                <h2 className="text-8xl font-black italic text-yellow-500 uppercase mb-8 tracking-tighter">CONQUEROR</h2>
                <img src={gameState.players.find(p => p.id === gameState.winnerId)?.avatar_url} className="w-40 h-40 rounded-full border-8 border-yellow-500 mx-auto mb-6 object-cover bg-black" alt="" />
                <p className="text-4xl font-black text-white uppercase italic">{gameState.players.find(p => p.id === gameState.winnerId)?.username}</p>
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={() => handleStartGame(difficulty)} className="bg-white text-black py-6 rounded-3xl font-black text-2xl hover:scale-105 transition shadow-lg uppercase italic">Rematch</button>
                    <button onClick={() => router.push('/')} className="bg-slate-900 text-white border-2 border-slate-700 py-6 rounded-3xl font-black text-2xl hover:bg-red-600 transition shadow-lg uppercase italic">Lobby</button>
                </div>
              </div>
          </div>
      )}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}