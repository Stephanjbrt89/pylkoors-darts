'use client';

export const GooierFighter = ({ player, isActive, isDamaged, isHealed }: any) => {
  if (!player) return null;

  const fighterImageUrl = player.avatar_url
    ? player.avatar_url.replace('avatars', 'fighters').replace('.jpg', '.png')
    : '';

  return (
    <div className={`relative flex flex-col items-center transition-all duration-700 w-full h-full justify-end ${player.isEliminated ? 'opacity-20 grayscale scale-90' : ''}`}>
      
      {/* 1. HUD STACK - Removed extra margins to close 'Dead Space' */}
      <div className="flex flex-col items-center gap-1 z-30 shrink-0">
        <div className="flex gap-2 mb-1">
          {player.sectors?.map((s: number) => (
            <div key={s} className="relative group animate-float">
               <div className={`absolute -inset-1 rounded-lg blur-md transition-opacity ${isActive ? 'bg-cyan-400 opacity-60' : 'bg-white opacity-10'}`}></div>
               <div className="relative bg-white border border-slate-300 w-9 h-11 flex items-center justify-center rounded-md shadow-xl" 
                    style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)' }}>
                  <span className="text-xl font-black italic text-slate-900">{s}</span>
               </div>
            </div>
          ))}
        </div>

        <div className="w-40">
          <div className="flex justify-between items-center px-1">
               <span className={`text-[10px] font-black uppercase italic tracking-tighter ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                  {player.username}
               </span>
               <span className="text-[8px] font-black text-white/50 font-mono">{player.lives} HP</span>
          </div>
          <div className="h-2.5 bg-black/60 border border-white/20 rounded-full p-0.5 overflow-hidden shadow-xl relative">
              <div 
                className={`h-full transition-all duration-1000 rounded-full ${
                  player.lives > 6 ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 
                  player.lives > 3 ? 'bg-yellow-400' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${(player.lives / 9) * 100}%` }}
              />
              <div className={`absolute inset-0 bg-white transition-opacity duration-100 ${isDamaged ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        </div>
      </div>

      {/* 2. CHARACTER SPRITE */}
      <div className={`relative flex items-end justify-center transition-all duration-500 flex-grow max-h-[42vh] ${
          isActive ? 'scale-110 z-20 brightness-110' : 'scale-95 opacity-70 z-10'
      } ${
          isDamaged ? 'animate-fighter-hit' : 'animate-breathing'
      }`}>
        {isActive && !player.isEliminated && (
            <div className="absolute -bottom-2 w-full h-8 bg-cyan-500/20 blur-2xl rounded-full animate-pulse -z-10" />
        )}
        <img 
          src={fighterImageUrl} 
          className="h-full w-auto object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          onError={(e) => { (e.target as HTMLImageElement).src = player.avatar_url; }}
          alt="" 
        />
      </div>
      <div className="absolute bottom-0 w-32 h-2 bg-black/40 rounded-full blur-xl -z-20" />
    </div>
  );
};