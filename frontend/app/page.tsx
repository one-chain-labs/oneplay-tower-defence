'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useCurrentAccount } from '@onelabs/dapp-kit';

export default function HomePage() {
  const account = useCurrentAccount();
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

      {/* Wallet Connection Overlay */}
      {!account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-12 border-4 border-yellow-400 shadow-2xl max-w-md mx-4 text-center">
            <div className="mb-6">
              <div className="mb-6 flex justify-center">
                <img 
                  src="/logo.png" 
                  alt="Tower Defense GameFi" 
                  className="h-24 w-auto drop-shadow-2xl animate-bounce"
                />
              </div>
              <h2 className="text-4xl font-bold text-yellow-200 mb-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
                Welcome!
              </h2>
              <p className="text-purple-200 text-lg mb-6">
                Connect your wallet to enter the game world
              </p>
            </div>
            
            <div className="bg-black/30 rounded-xl p-6 mb-6 border-2 border-purple-500/50">
              <p className="text-white mb-2">🎮 Play tower defense games</p>
              <p className="text-white mb-2">🗼 Collect tower NFTs</p>
              <p className="text-white mb-2">👹 Create monster challenges</p>
              <p className="text-white">🏪 Trade on marketplace</p>
            </div>

            <div className="text-yellow-300 font-bold text-lg animate-pulse">
              👆 Click "Connect Wallet" button above to start!
            </div>
          </div>
        </div>
      )}

      {/* Tooltip following mouse */}
      {hoveredBuilding && account && (
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

      {/* Town Map - Desktop: absolute positioning, Mobile: grid layout */}
      <div 
        className={`relative w-full h-full px-4 sm:px-8 md:px-20 py-8 overflow-auto ${!account ? 'blur-sm pointer-events-none' : ''}`}
        onMouseMove={handleMouseMove}
      >
        {/* Mobile Grid Layout */}
        <div className="md:hidden grid grid-cols-2 gap-4 max-w-md mx-auto pt-20">
          <Link href="/lucky-draw" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all">
            <img src="/luckydraw.png" alt="Lucky Draw" className="w-24 h-auto mb-2" />
            <span className="text-white font-bold text-sm">🎁 Lucky Draw</span>
          </Link>
          <Link href="/challenge-list" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all">
            <img src="/challenge.png" alt="Challenge" className="w-24 h-auto mb-2" />
            <span className="text-white font-bold text-sm">⚔️ Challenge</span>
          </Link>
          <Link href="/play" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all col-span-2">
            <img src="/game.png" alt="Game Arena" className="w-32 h-auto mb-2" />
            <span className="text-white font-bold">🎮 Game Arena</span>
          </Link>
          <Link href="/my-towers" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all">
            <img src="/tower.png" alt="My Bag" className="w-24 h-auto mb-2" />
            <span className="text-white font-bold text-sm">🎒 My Bag</span>
          </Link>
          <Link href="/market" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all">
            <img src="/marketplace.png" alt="Market" className="w-24 h-auto mb-2" />
            <span className="text-white font-bold text-sm">🏪 Market</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center p-4 bg-black/20 rounded-xl hover:bg-black/30 transition-all col-span-2">
            <img src="/history.png" alt="History" className="w-20 h-auto mb-2" />
            <span className="text-white font-bold text-sm">📋 History</span>
          </Link>
        </div>

        {/* Desktop Absolute Positioning */}
        <div className="hidden md:flex items-center justify-center w-full h-full relative">
        
        
        {/* Center Top - Game Arena (large) */}
        <Link 
          href="/play"
          className="absolute top-[22%] left-1/2 transform -translate-x-1/2 cursor-pointer hover:scale-105 transition-all duration-300 z-30"
          onMouseEnter={() => setHoveredBuilding('🎮 Game Arena')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/game.png" 
            alt="Game Arena" 
            className="md:w-96 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Top Left - Lucky Draw */}
        <Link 
          href="/lucky-draw" 
          className="absolute top-[8%] left-[8%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🎁 Lucky Draw')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/luckydraw.png" 
            alt="Lucky Draw" 
            className="md:w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Top Right - Challenge Hall */}
        <Link 
          href="/challenge-list" 
          className="absolute top-[8%] right-[8%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('⚔️ Challenge Hall')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/challenge.png" 
            alt="Challenge Hall" 
            className="md:w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Bottom Left - Tower Bag */}
        <Link 
          href="/my-towers" 
          className="absolute bottom-[25%] left-[12%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🎒 My Towers')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/tower.png" 
            alt="Tower Bag" 
            className="md:w-56 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Right Middle - Marketplace */}
        <Link 
          href="/market" 
          className="absolute top-[48%] right-[8%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('🏪 Marketplace')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/marketplace.png" 
            alt="Marketplace" 
            className="md:w-60 h-auto drop-shadow-2xl"
          />
        </Link>

        {/* Bottom Right - History Board (small notice board) */}
        <Link 
          href="/history" 
          className="absolute bottom-[8%] right-[28%] cursor-pointer hover:scale-105 transition-all duration-300 z-20"
          onMouseEnter={() => setHoveredBuilding('📋 History Board')}
          onMouseLeave={() => setHoveredBuilding(null)}
        >
          <img 
            src="/history.png" 
            alt="History Board" 
            className="md:w-44 h-auto drop-shadow-2xl"
          />
        </Link>
        </div>
      </div>
    </div>
  );
}
