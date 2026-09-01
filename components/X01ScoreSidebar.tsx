'use client';

export const X01ScoreSidebar = ({ players, scores, currentIndex }: any) => {
  const rankedIds = Object.keys(scores).sort((a, b) => scores[a] - scores[b]);

  return (
    <div className="w-full max-w-[320px] flex flex-col gap-4">
      {players.map((p: any, idx: number) => {
        const isActive = idx === currentIndex;
        const rank = rankedIds.indexOf(p.id) + 1;
        const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500'];

        return (
          <div key={p.id} className={`relative flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all duration-500 ${
            isActive ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] scale-105' : 'bg-white/5 border-white/5 opacity-50'
          }`}>
            <img src={p.avatar_url} className="w-16 h-16 rounded-full border-2 border-white/10 object-cover bg-black" alt="" />
            
            <div className="flex-grow">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{p.username}</p>
              <p className="text-4xl font-black tabular-nums tracking-tighter">{scores[p.id]}</p>
            </div>

            <div className={`px-2 py-1 rounded-lg text-[10px] font-black italic ${rank === 1 ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                {rank}{rank === 1 ? 'ST' : rank === 2 ? 'ND' : 'RD'}
            </div>
          </div>
        );
      })}
    </div>
  );
};