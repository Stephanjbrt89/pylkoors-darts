'use client';
import { useState, useEffect, useRef } from 'react';
import { SoundService } from '@/lib/services/soundService';

interface Props {
  players: any[];
  onComplete: (startingPlayerId: string) => void;
}

export const GooierRoulette = ({ players, onComplete }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Pre-determine the winner safely
  const winnerIdRef = useRef(players[Math.floor(Math.random() * players.length)].id);
  const speedRef = useRef(60);
  const stopTimeRef = useRef(Date.now() + 3000 + Math.random() * 1500);
  const internalIdxRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const step = () => {
      if (doneRef.current) return;
      const now = Date.now();
      const nextIdx = (internalIdxRef.current + 1) % players.length;
      internalIdxRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      SoundService.play('spin');

      // Check if it's time to stop and we are on the winner
      if (now > stopTimeRef.current && players[nextIdx].id === winnerIdRef.current) {
        doneRef.current = true;
        setIsFinished(true);
        setTimeout(() => onComplete(winnerIdRef.current), 1500);
        return;
      }

      // Slow down near the end
      if (now > stopTimeRef.current - 1500) {
        speedRef.current = Math.min(speedRef.current * 1.15, 350);
      }

      timeout = setTimeout(step, speedRef.current);
    };

    timeout = setTimeout(step, speedRef.current);

    return () => clearTimeout(timeout);
  }, [players, onComplete]);

  const displayedPlayer = players[currentIndex] || players[0];
  const winnerPlayer = players.find(p => p.id === winnerIdRef.current) || displayedPlayer;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center p-6 backdrop-blur-3xl animate-in fade-in duration-1000">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-black italic text-white mb-2 uppercase tracking-tighter">THE TOSS</h2>
        <p className="text-cyan-400 font-black tracking-[0.4em] uppercase text-xs animate-pulse">
            {!isFinished ? 'Randomizing Sequence...' : 'Winner Identified'}
        </p>
      </div>

      <div className="relative flex items-center justify-center">
        <div className={`absolute -inset-20 rounded-full blur-[120px] transition-all duration-1000 ${
            !isFinished ? 'bg-white/5' : 'bg-cyan-500/30'
        }`} />
        
        <div className={`relative bg-slate-900 border-8 p-12 rounded-[4rem] shadow-2xl flex flex-col items-center min-w-[400px] transition-all duration-500 ${
            isFinished ? 'border-cyan-500 scale-110' : 'border-white/10'
        }`}>
           <img 
             src={displayedPlayer.avatar_url} 
             className={`w-64 h-64 rounded-full border-8 object-cover mb-8 transition-all duration-150 ${
                isFinished ? 'border-cyan-400 shadow-[0_0_60px_rgba(34,211,238,0.5)]' : 'border-transparent'
             }`} 
             alt="Fighter"
           />
           <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white">
             {isFinished ? winnerPlayer.username : displayedPlayer.username}
           </h3>
           
           {isFinished && (
             <div className="mt-8 bg-cyan-500 text-black px-10 py-3 rounded-2xl font-black text-2xl animate-bounce uppercase italic tracking-tighter">
                Winner
             </div>
           )}
        </div>
      </div>
    </div>
  );
};