'use client';

import { useState, useEffect, useMemo } from 'react';
import { BrandyEngine, type BrandyState } from '@/lib/engines/brandy';
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
import { NewRecordModal } from '@/components/NewRecordModal';
import { AutodartsStatusBadge } from '@/components/AutodartsStatusBadge';
import { useAutodarts } from '@/lib/hooks/useAutodarts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BrandySpecialPage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<BrandyState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [recordData, setRecordData] = useState<any>(null);
  const [isPadExpanded, setIsPadExpanded] = useState(false);
  const [history, setHistory] = useState<BrandyState[]>([]);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    try {
      const cleaned = selectedPlayers.map(p => ({ 
        id: String(p.id), username: String(p.username), avatar_url: String(p.avatar_url) 
      }));
      
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_BRANDY', cleaned.map(p => p.id));
      
      // The Engine now handles the random starting index on creation
      const initial = BrandyEngine.createInitialState(cleaned);
      
      setMatchId(id);
      setGameState(initial);
      await ArcadeService.saveGameState(id, initial);
      
      // No SoundService.play() here to ensure a silent start as requested
    } catch (err) { 
        console.error(err); 
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || !matchId) return;
    const prevSnap = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setGameState(prevSnap);
    setReactionUrl(null);
    void ArcadeService.saveGameState(matchId, prevSnap);
  };

  const handleEndTurn = () => {
    if (!gameState || !matchId || gameState.phase !== 'PLAY' || gameState.isFinished) return;
    setHistory((prev) => [...prev.slice(-29), gameState]);
    const nextState = {
      ...gameState,
      currentTurnIndex: (gameState.currentTurnIndex + 1) % gameState.players.length,
      dartsThrown: [],
    };
    setGameState(nextState);
    void ArcadeService.saveGameState(matchId, nextState);
  };

  const onThrow = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.phase !== 'PLAY' || gameState.isFinished) return;
    setHistory((prev) => [...prev.slice(-29), gameState]);
    
    const nextState = BrandyEngine.handleThrow(gameState, { score, multiplier, raw: label });

    if (nextState.lastActionType === 'OVERPOUR') {
      SoundService.play('bust');
      setReactionUrl(GifService.getRandomGifUrl('BUST'));
    } else if (nextState.lastActionType === 'CAP') {
      // Small fanfare only when a glass is capped
      SoundService.play('win'); 
    }

    if (nextState.isFinished && nextState.winnerId) {
      SoundService.play('win');
      setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      await MatchService.finishMatch(matchId, nextState.winnerId);
      const winner = nextState.players.find(p => p.id === nextState.winnerId);
      if (winner) {
        await StatsService.updateRecord('ARCADE_BRANDY', 'FEWEST_DARTS', winner.id, winner.totalDarts, matchId);
      }
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  useAutodarts({
    enabled: !!matchId && gameState?.phase === 'PLAY' && !gameState?.isFinished,
    matchId: matchId || undefined,
    onThrow: (dart) => {
      void onThrow(dart.score, dart.multiplier, dart.raw);
    },
    onTakeout: () => {
      if (gameState && gameState.dartsThrown.length > 0 && !gameState.isFinished) {
        handleEndTurn();
      }
    },
  });

  if (showSquadSelect) return (
    <div className="relative min-h-screen bg-black">
      <SquadSelect gameName="Brandy Special" minPlayers={1} maxPlayers={4} onStart={handleStartGame} onCancel={() => router.push('/')} />
      <div className="fixed bottom-10 right-10 z-[1000]">
        <GameInfo title="Brandy" color="#f59e0b" rules={["Fill 4 glasses.", "1 pt = 10ml.", "Exact 500ml required.", "Overpour halves glass."]} />
      </div>
    </div>
  );

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const mlNeeded = 500 - currentPlayer.currentGlassMl;
  const assistTarget = mlNeeded <= 100 && mlNeeded > 0 ? `HIT S${mlNeeded / 10} TO CAP` : null;

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#050201] text-white overflow-hidden relative transition-all duration-500">
      
      {/* 1. HUD HEADER */}
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-amber-900/20 z-20 shrink-0">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 transition">BACK TO BAR</Link>
        <h1 className="text-xl font-black italic tracking-[0.3em] uppercase text-amber-500">Brandy Special</h1>
        <AutodartsStatusBadge />
      </div>

      {/* 2. THE BAR STAGE */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 h-full overflow-hidden">
        <div className={`w-full max-w-[1800px] transition-all duration-1000 flex flex-col items-center h-full justify-around ${isPadExpanded ? 'scale-90' : 'scale-100'}`}>
            
            <div className="flex justify-center gap-6 mb-4">
                {gameState.players.map((p, idx) => (
                    <div key={p.id} className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all duration-500 ${idx === gameState.currentTurnIndex ? 'border-amber-500 bg-amber-500/10 scale-110 shadow-lg' : 'opacity-30 grayscale'}`}>
                        <img src={p.avatar_url} className="w-14 h-14 rounded-full object-cover bg-black border-2 border-white/10" alt="" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-amber-600 leading-none mb-1">{p.username}</p>
                            <p className="text-3xl font-black tabular-nums leading-none">{p.completedGlasses} / 4</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-4 gap-12 w-full max-w-5xl px-10">
                {[...Array(4)].map((_, i) => {
                    const isCompleted = currentPlayer.completedGlasses > i;
                    const isActive = currentPlayer.completedGlasses === i;
                    const fillPercent = isActive ? (currentPlayer.currentGlassMl / 500) * 100 : 0;
                    return (
                        <div key={i} className="flex flex-col items-center">
                            <div className={`relative w-full aspect-[1/2.5] transition-all duration-700 flex flex-col justify-end ${isCompleted ? 'scale-105' : isActive ? 'scale-110' : 'opacity-20 grayscale'}`}>
                                <div className="absolute inset-0 border-x-4 border-b-8 border-white/20 rounded-b-[2.5rem] z-20 pointer-events-none shadow-inner" />
                                <div className="absolute bottom-0 left-0 w-full rounded-b-[2rem] transition-all duration-1000 bg-gradient-to-t from-[#150902] via-[#2b1704] to-[#422409]" style={{ height: isCompleted ? '95%' : `${Math.max(0, fillPercent - 5)}%` }} />
                                {isCompleted && <div className="absolute inset-0 flex items-center justify-center z-30"><div className="bg-green-500 text-black px-4 py-1 rounded-full font-black text-[10px] shadow-lg rotate-[-5deg]">CAPPED</div></div>}
                                {isActive && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center"><p className="text-6xl font-black italic text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">{currentPlayer.currentGlassMl}</p><p className="text-[10px] uppercase text-amber-500 font-black">ML</p></div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="h-12 mt-6">
                {assistTarget && <div className="bg-white text-black px-10 py-3 rounded-full font-black italic text-2xl animate-bounce shadow-2xl border-4 border-amber-500 uppercase">{assistTarget}</div>}
            </div>
        </div>
      </div>

      {/* 3. CONSOLE */}
      {!gameState.isFinished && (
        <div className="w-full flex justify-center z-30">
          <ArcadeNumpad
            activeGooierName={currentPlayer.username}
            dartsThrownCount={gameState.dartsThrown.length}
            lastDarts={gameState.dartsThrown}
            canUndo={history.length > 0}
            onUndo={handleUndo}
            onThrow={onThrow}
            onEndTurn={handleEndTurn}
            onToggle={setIsPadExpanded}
            color="#f59e0b"
          />
        </div>
      )}

      {/* WINNER MODAL */}
      {gameState.isFinished && (
          <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
              <h2 className="text-9xl font-black italic text-amber-500 uppercase mb-8 tracking-tighter">ELITE POUR</h2>
              <img src={gameState.players.find(p => p.id === gameState.winnerId)?.avatar_url} className="w-56 h-56 rounded-full border-8 border-amber-500 shadow-2xl mb-8 object-cover bg-black" alt="" />
              <p className="text-4xl font-black text-white uppercase mb-12 italic">{gameState.players.find(p => p.id === gameState.winnerId)?.username} Wins</p>
              <button onClick={() => window.location.reload()} className="bg-white text-black px-20 py-8 rounded-full font-black text-2xl hover:scale-110 transition shadow-lg uppercase tracking-tighter">Rematch</button>
          </div>
      )}

      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
      <NewRecordModal show={!!recordData} type={recordData?.type} value={recordData?.value} playerName={recordData?.name} />
    </main>
  );
}