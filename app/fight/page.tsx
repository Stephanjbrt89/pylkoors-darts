'use client';

import { useState, useEffect } from 'react';
import { FightEngine, FightState } from '@/lib/engines/fight';
import { ArcadeService } from '@/lib/services/arcadeService';
import { MatchService } from '@/lib/services/matchService';
import { SoundService } from '@/lib/services/soundService';
import { GifService } from '@/lib/services/gifService';
import { SquadSelect } from '@/components/SquadSelect';
import { ReactionOverlay } from '@/components/ReactionOverlay';
import { GooierFighter } from '@/components/GooierFighter';
import { GameInfo } from '@/components/GameInfo';
import { ArcadeNumpad } from '@/components/ArcadeNumpad';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FightGamePage() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<FightState | null>(null);
  const [showSquadSelect, setShowSquadSelect] = useState(true);
  const [reactionUrl, setReactionUrl] = useState<string | null>(null);
  const [impactPlayerId, setImpactPlayerId] = useState<string | null>(null);
  const [healPlayerId, setHealPlayerId] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<{ val: number } | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<any[]>([]);
  const [isPadExpanded, setIsPadExpanded] = useState(false);
  const router = useRouter();

  const handleStartGame = async (selectedPlayers: any[]) => {
    setShowSquadSelect(false);
    setSelectedSquad(selectedPlayers);
    try {
      const cleaned = selectedPlayers.map(p => ({ id: String(p.id), username: String(p.username), avatar_url: String(p.avatar_url) }));
      const id = await ArcadeService.createMultiplayerMatch('ARCADE_FIGHT', cleaned.map(p => p.id));
      setMatchId(id);
      const initial = FightEngine.createInitialState(cleaned);
      const availableNumbers = Array.from({ length: 20 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      const finalPlayers = initial.players.map(p => ({ ...p, sectors: [availableNumbers.pop()!, availableNumbers.pop()!] }));
      const playState = { ...initial, players: finalPlayers, phase: 'PLAY' as const };
      setGameState(playState);
      await ArcadeService.saveGameState(id, playState);
    } catch (err) { console.error(err); }
  };

  const handleThrow = async (score: number, multiplier: number, label: string) => {
    if (!gameState || !matchId || gameState.isFinished) return;
    const nextState = FightEngine.handleThrow(gameState, { score, multiplier, raw: label });

    if (nextState.lastAction?.type === 'DAMAGE') {
      const tid = String(nextState.lastAction.targetId);
      setImpactPlayerId(tid);
      setImpactData({ val: nextState.lastAction.value });
      SoundService.play('bust');
      setTimeout(() => { setImpactPlayerId(null); setImpactData(null); }, 600);
      if (nextState.players.find(p => p.id === tid)?.isEliminated) setReactionUrl(GifService.getRandomGifUrl('ELIMINATED'));
    } 
    else if (nextState.lastAction?.type === 'HEAL') {
      setHealPlayerId(String(nextState.lastAction.targetId));
      setTimeout(() => { setHealPlayerId(null); }, 600);
    }

    if (nextState.isFinished && nextState.winnerId) {
      SoundService.play('win');
      setReactionUrl(GifService.getRandomGifUrl('WINNER'));
      await MatchService.finishMatch(matchId, nextState.winnerId);
    }
    setGameState(nextState);
    await ArcadeService.saveGameState(matchId, nextState);
  };

  if (showSquadSelect) return <SquadSelect gameName="Fight Game" minPlayers={1} maxPlayers={6} onStart={handleStartGame} onCancel={() => router.push('/')} />;
  if (!gameState) return null;

  const activeUser = gameState.players[gameState.currentTurnIndex];
  const winner = gameState.players.find(p => p.id === gameState.winnerId);

  return (
    <main className="h-screen w-full grid grid-rows-[60px_1fr_min-content] bg-[#020205] text-white overflow-hidden relative transition-all duration-500">
      
      <div className="w-full flex justify-between items-center px-10 py-2 bg-black/40 border-b border-white/5 z-20 shrink-0">
        <Link href="/" className="bg-slate-900 border border-slate-700 px-6 py-2 rounded-full text-[10px] font-black hover:bg-red-600 transition text-white">LOBBY</Link>
        <h1 className="text-xl font-black italic tracking-[0.3em] opacity-40 uppercase">Battle Arena</h1>
        <GameInfo title="Fight Game" color="#ff003c" rules={["Defend sectors.", "Hit opponents.", "Hit your own to heal.", "Multipliers count!"]} />
      </div>

      <div className="relative z-10 flex items-end justify-center px-10 pb-4 overflow-visible h-full flex-grow">
        <div className={`flex justify-around items-end w-full max-w-[1700px] h-full transition-all duration-1000 ${isPadExpanded ? 'scale-90 pb-0' : 'scale-105 pb-10'}`}>
          {gameState.players.map((p, idx) => (
            <div key={p.id} className="relative flex-1 flex justify-center h-full items-end">
              <GooierFighter player={p} isActive={idx === gameState.currentTurnIndex} isDamaged={impactPlayerId === p.id} isHealed={healPlayerId === p.id} />
              
              {impactPlayerId === p.id && impactData && (
                <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
                  <div className="bg-yellow-400 text-black font-black text-6xl px-10 py-4 -skew-x-12 animate-impact border-4 border-black shadow-2xl">-{impactData.val} HP</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {!gameState.isFinished && (
        <div className="w-full flex justify-center z-30 shrink-0">
          <ArcadeNumpad activeGooierName={activeUser?.username} dartsThrownCount={gameState.dartsThrown.length} onThrow={handleThrow} onEndTurn={() => setGameState(prev => ({...prev!, currentTurnIndex: (prev!.currentTurnIndex + 1) % prev!.players.length, dartsThrown: []}))} onToggle={(e) => setIsPadExpanded(e)} color="#ff003c" />
        </div>
      )}

      {gameState.isFinished && winner && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in">
              <div className="relative bg-[#0a0a1a] border-4 border-red-600 p-10 rounded-[3rem] max-w-xl w-full text-center shadow-2xl">
                <h2 className="text-7xl font-black italic text-red-600 uppercase mb-4">VICTORY</h2>
                <img src={winner.avatar_url} className="w-32 h-32 rounded-full border-4 border-yellow-500 mx-auto mb-4 object-cover bg-black" />
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={() => handleStartGame(selectedSquad)} className="bg-white text-black py-4 rounded-2xl font-black text-xl hover:bg-cyan-400 transition">REMATCH</button>
                    <button onClick={() => router.push('/')} className="bg-slate-900 text-white border border-slate-700 py-4 rounded-2xl font-black text-xl hover:bg-red-600 transition">LOBBY</button>
                </div>
              </div>
          </div>
      )}
      <ReactionOverlay url={reactionUrl} onFinished={() => setReactionUrl(null)} />
    </main>
  );
}