'use client';
import { useEffect, useRef, useState } from 'react';

export const ReactionOverlay = ({ url, onFinished }: { url: string | null; onFinished: () => void }) => {
  const [fadingOut, setFadingOut] = useState(false);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    if (!url) return;

    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    const resetFadeTimer = setTimeout(() => setFadingOut(false), 0);

    const displayTimer = setTimeout(() => {
      setFadingOut(true);
      fadeTimer = setTimeout(() => {
        setFadingOut(false);
        onFinishedRef.current();
      }, 450);
    }, 3500);

    return () => {
      clearTimeout(resetFadeTimer);
      clearTimeout(displayTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [url]);

  if (!url) return null;

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-6 pointer-events-none bg-black/80 backdrop-blur-md transition-opacity duration-500 ${
        fadingOut ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-300'
      }`}
    >
      {/* CENTERED ARCADE JUMBOTRON FRAME (No stretching or distortion on large TVs) */}
      <div className="relative rounded-3xl overflow-hidden bg-black/95 border-2 border-white/15 shadow-[0_0_90px_rgba(0,0,0,0.95)] p-2">
        <div className="relative rounded-2xl overflow-hidden flex items-center justify-center bg-black">
          <img
            src={url}
            className="block w-auto h-auto max-w-[min(82vw,680px)] max-h-[65vh] object-contain"
            alt="Reaction"
            key={url}
          />

          {/* Subtle CRT Scanlines & Edge Vignette contained inside the GIF frame */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 4px, 3px 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};