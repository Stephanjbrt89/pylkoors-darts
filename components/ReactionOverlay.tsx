'use client';
import { useEffect, useState } from 'react';

export const ReactionOverlay = ({ url, onFinished }: { url: string | null; onFinished: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (url) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Fade out transition time
        setTimeout(onFinished, 500); 
      }, 3500); // GIF stays visible for 3.5 seconds
      return () => clearTimeout(timer);
    }
  }, [url, onFinished]);

  if (!url || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none animate-in fade-in duration-500 overflow-hidden">
      
      {/* THE GIF: COVERING THE WHOLE SCREEN */}
      <div className="absolute inset-0 w-full h-full bg-black">
        <img 
          src={url} 
          className="w-full h-full object-cover opacity-80" 
          alt="Reaction"
          key={url}
        />
        
        {/* ARCADE OVERLAYS */}
        
        {/* 1. Cinematic Vignette (Dark edges to focus center) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.8)_100%)]" />

        {/* 2. RGB Scanlines (Retro feel) */}
        <div className="absolute inset-0 opacity-[0.15]" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', 
               backgroundSize: '100% 4px, 3px 100%' 
             }} 
        />

        {/* 3. Screen Flash Accent */}
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      </div>

      {/* OPTIONAL: Large Event Text Overlay */}
      <div className="relative z-10 animate-in zoom-in slide-in-from-top-10 duration-700 delay-200">
         <div className="px-12 py-4 bg-black/40 backdrop-blur-md border-y-4 border-white/20">
            <p className="text-white font-black italic text-7xl md:text-9xl uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
               BOOM!
            </p>
         </div>
      </div>
    </div>
  );
};