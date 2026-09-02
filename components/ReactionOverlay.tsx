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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none animate-in fade-in duration-500 overflow-hidden bg-black">
      
      {/* THE GIF: FULL SCREEN COVERAGE */}
      <img 
        src={url} 
        className="w-full h-full object-cover opacity-90" 
        alt="Reaction"
        key={url}
      />
      
      {/* CINEMATIC POST-PROCESSING OVERLAYS */}
      
      {/* 1. Vignette (Dark edges to keep focus and hide edge seams) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.9)_100%)]" />

      {/* 2. RGB Retro Scanlines */}
      <div className="absolute inset-0 opacity-[0.12]" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', 
             backgroundSize: '100% 4px, 3px 100%' 
           }} 
      />

      {/* 3. Global Screen Pulse */}
      <div className="absolute inset-0 bg-white/5 animate-pulse" />
      
    </div>
  );
};