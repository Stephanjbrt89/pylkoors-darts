// components/ArcadeLogo.tsx
export const ArcadeLogo = () => (
  <div className="flex items-center justify-center gap-1 select-none">
    <span className="text-6xl font-black italic tracking-tighter text-white">PYLK</span>
    {/* First Dartboard 'O' */}
    <div className="relative w-12 h-12 rounded-full border-4 border-slate-800 bg-black flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.5)]">
      <div className="absolute inset-0 border-[6px] border-red-600 rounded-full opacity-80" />
      <div className="absolute inset-2 border-[4px] border-green-500 rounded-full opacity-80" />
      <div className="w-2 h-2 bg-red-600 rounded-full z-10" />
      <div className="absolute w-full h-[2px] bg-slate-800 rotate-45" />
      <div className="absolute w-full h-[2px] bg-slate-800 -rotate-45" />
    </div>
    {/* Second Dartboard 'O' */}
    <div className="relative w-12 h-12 rounded-full border-4 border-slate-800 bg-black flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.5)]">
      <div className="absolute inset-0 border-[6px] border-red-600 rounded-full opacity-80" />
      <div className="absolute inset-2 border-[4px] border-green-500 rounded-full opacity-80" />
      <div className="w-2 h-2 bg-red-600 rounded-full z-10" />
      <div className="absolute w-full h-[2px] bg-slate-800 rotate-45" />
      <div className="absolute w-full h-[2px] bg-slate-800 -rotate-45" />
    </div>
    <span className="text-6xl font-black italic tracking-tighter text-white">RS</span>
  </div>
);