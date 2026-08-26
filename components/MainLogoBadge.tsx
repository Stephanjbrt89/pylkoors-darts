'use client';

import React from 'react';

export const MainLogoBadge = () => {
  return (
    <div className="relative w-full overflow-hidden select-none bg-[#050505]">
      {/* 
        Container Logic:
        1. Aspect ratio ensures the image scales correctly without clipping.
        2. max-h-[85vh] prevents the banner from being taller than the screen.
      */}
      <div 
        className="relative w-full aspect-[21/9] max-h-[80vh] min-h-[300px]"
        style={{
          maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        }}
      >
        <img 
          src="/logo.jfif" 
          alt="PYLKOORS" 
          className="w-full h-full object-contain md:object-cover object-top transition-all duration-700"
          style={{ 
            imageRendering: 'auto',
            filter: 'brightness(1.05) contrast(1.05)' 
          }}
        />
        
        {/* Deep bottom fade to blend into the dashboard */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
      </div>
    </div>
  );
};