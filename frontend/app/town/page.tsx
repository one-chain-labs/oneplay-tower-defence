'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function TownPage() {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/background.png)',
        }}
      ></div>

      {/* Tooltip following mouse */}
      {hoveredBuilding && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y + 20,
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-sm border-2 border-gray-950 rounded-xl px-6 py-2 shadow-2xl">
            <p className="text-yellow-100 font-bold text-base whitespace-nowrap">{hoveredBuilding}</p>
          </div>
        </div>
      )}

      {/* Town Map */}
      <div 
        className="relative w-full h-full px-20 py-8 flex items-center justify-center"
        onMouseMove={handleMouseMove}
      >
        
        {/* Center Top - Game Arena (large) */}
        <Link 
          href="/" 
          className="absolute top-[22%] left-1/2 transform -translate-x-1/2 cursor-pointer hover:scale-105 transition-all duration-300 z-30"
          onMouseEnter={() => setHoveredBuilding('🎮 Game Arena')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/game.png" 
            alt="Game Arena" 
            className="w-96 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Top Left - Lucky Draw */}
        <Link 
          href="/lucky-draw" 
          className="absolute top-[18%] left-[20%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🎁 Lucky Draw')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/luckydraw.png" 
            alt="Lucky Draw" 
            className="w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Top Right - Challenge Hall */}
        <Link 
          href="/challenge-list" 
          className="absolute top-[18%] right-[20%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('⚔️ Challenge Hall')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/challenge.png" 
            alt="Challenge Hall" 
            className="w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Bottom Left - Tower Bag */}
        <Link 
          href="/my-towers" 
          className="absolute bottom-[22%] left-[24%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🎒 My Towers')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/tower.png" 
            alt="Tower Bag" 
            className="w-56 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Right Middle - Marketplace */}
        <Link 
          href="/market" 
          className="absolute top-[42%] right-[20%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🏪 Marketplace')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/marketplace.png" 
            alt="Marketplace" 
            className="w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Bottom Right - History Board (small notice board) */}
        <Link 
          href="/history" 
          className="absolute bottom-[12%] right-[32%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('📋 History Board')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/history.png" 
            alt="History Board" 
            className="w-44 h-auto drop-shadow-2xl"
          />
        </Link>



      </div>
    </div>
  );
}
