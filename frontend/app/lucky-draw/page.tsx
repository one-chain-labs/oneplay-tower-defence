'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { mintTower, claimFaucet } from '@/lib/contracts';
import { MINT_COST, PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';

interface TowerNFT {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  rarity: number;
}

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

// Tower Card Icon Component
function TowerCardIcon({ rarity }: { rarity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rarityColors = {
      1: { light: '#9e9e9e', mid: '#757575', dark: '#424242', glow: '#bdbdbd' },
      2: { light: '#42a5f5', mid: '#2196f3', dark: '#1565c0', glow: '#64b5f6' },
      3: { light: '#ab47bc', mid: '#9c27b0', dark: '#6a1b9a', glow: '#ce93d8' },
      4: { light: '#ffd54f', mid: '#ffc107', dark: '#f57c00', glow: '#ffe082' },
    };
    const colors = rarityColors[rarity as keyof typeof rarityColors] || rarityColors[2];

    const centerX = 64;
    const centerY = 64;
    const scale = 1.5;

    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = centerX + Math.cos(angle) * 12 * scale;
      const y = centerY + 8 * scale + Math.sin(angle) * 12 * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(centerX - 10 * scale, 0, centerX + 10 * scale, 0);
    bodyGradient.addColorStop(0, colors.dark);
    bodyGradient.addColorStop(0.5, colors.mid);
    bodyGradient.addColorStop(1, colors.dark);
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(centerX - 10 * scale, centerY - 5 * scale, 20 * scale, 15 * scale);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(centerX - 8 * scale, centerY - 3 * scale, 5 * scale, 11 * scale);

    const turretGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 8 * scale);
    turretGradient.addColorStop(0, colors.light);
    turretGradient.addColorStop(1, colors.mid);
    ctx.fillStyle = turretGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#424242';
    ctx.fillRect(centerX, centerY - 2 * scale, 14 * scale, 4 * scale);

    ctx.fillStyle = colors.glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (rarity >= 2) {
      ctx.fillStyle = colors.glow;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      const stars = '⭐'.repeat(rarity - 1);
      ctx.fillText(stars, centerX, centerY - 20 * scale);
    }
  }, [rarity]);

  return <canvas ref={canvasRef} width={128} height={128} className="w-32 h-32" />;
}

export default function LuckyDrawPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMintCard, setShowMintCard] = useState(false);
  const [mintedTower, setMintedTower] = useState<TowerNFT | null>(null);
  const previousTowerCountRef = useRef(0);
  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);

  // Get GAME token balance
  const { data: gameCoins, refetch: refetchGameBalance } = useSuiClientQuery(
    'getCoins',
    {
      owner: account?.address || '',
      coinType: `${PACKAGE_ID}::game::GAME`,
    },
    {
      enabled: !!account?.address,
      refetchInterval: 1000, // Refresh every 1 second
    }
  );

  const gameBalance = gameCoins?.data.reduce((sum, coin) => sum + Number(coin.balance), 0) || 0;
  const gameBalanceFormatted = gameBalance / 1_000_000_000;

  const { data: ownedTowers, refetch: refetchTowers } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || '',
      filter: {
        StructType: `${PACKAGE_ID}::game::TowerNFT`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled: !!account?.address,
      refetchInterval: 3000,
    }
  );

  useEffect(() => {
    if (ownedTowers?.data) {
      const towers: TowerNFT[] = ownedTowers.data
        .map((obj: any) => {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject' && content.fields) {
            const expectedType = `${PACKAGE_ID}::game::TowerNFT`;
            if (content.type !== expectedType) return null;
            
            return {
              id: obj.data.objectId,
              damage: Number(content.fields.damage),
              range: Number(content.fields.range),
              fireRate: Number(content.fields.fire_rate),
              rarity: Number(content.fields.rarity),
            };
          }
          return null;
        })
        .filter((t): t is TowerNFT => t !== null);

      if (showMintCard && !mintedTower && towers.length > previousTowerCountRef.current) {
        const newTower = towers[0];
        console.log('New tower detected:', newTower);
        setMintedTower(newTower);
        setMessage('🎉 Tower NFT minted!');
      }

      setMyTowers(towers);
    }
  }, [ownedTowers, showMintCard]);

  const handleClaimFaucet = () => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    setLoading(true);
    setMessage('💰 Claiming GAME tokens...');
    
    const tx = new Transaction();
    claimFaucet(tx);

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: (result: any) => {
          console.log('Faucet claimed successfully:', result);
          setMessage('✅ Claimed 10 GAME tokens!');
          setLoading(false);
          refetchGameBalance();
        },
        onError: (error: any) => {
          console.error('Error:', error);
          setMessage(`Error: ${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  const handleMint = () => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    if (gameBalance < MINT_COST) {
      setMessage('❌ Not enough GAME tokens! Get GAME from OneChain faucet.');
      return;
    }

    // Get the first GAME coin object
    const gameCoin = gameCoins?.data[0];
    if (!gameCoin) {
      setMessage('❌ No GAME tokens found!');
      return;
    }

    previousTowerCountRef.current = myTowers.length;
    setLoading(true);
    setShowMintCard(true);
    setMintedTower(null);
    setMessage('🎰 Minting tower...');
    
    const tx = new Transaction();
    mintTower(tx, gameCoin.coinObjectId, MINT_COST);

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: (result: any) => {
          console.log('Tower minted successfully:', result);
          setLoading(false);
          setMessage('🎰 Opening mystery box...');
          refetchTowers();
          refetchGameBalance();
        },
        onError: (error: any) => {
          console.error('Error:', error);
          setMessage(`Error: ${error.message}`);
          setLoading(false);
          setShowMintCard(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/town" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
              ← Back to Town
            </Link>
          <Link href="/monster-draw" className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">
            👹 Monster Draw
          </Link>
          <Link href="/my-towers" className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">
            🎒 My Bag
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-yellow-200 mb-4" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.5)'}}>
            🎁 Tower Lucky Draw
          </h1>
          <p className="text-purple-200 text-lg">Open mystery boxes to get random tower NFTs!</p>
        </div>

        {!account ? (
          <div className="bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-900 rounded-2xl p-6 text-center shadow-2xl">
            <p className="text-yellow-100 text-lg font-bold">🔐 Connect your wallet to start!</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-b from-amber-600 to-amber-800 rounded-2xl p-4 mb-6 border-4 border-amber-950 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-bold">💰 GAME Balance</p>
                  <p className="text-yellow-50 text-2xl font-bold">{gameBalanceFormatted.toFixed(2)} GAME</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-200 text-sm font-bold">🗼 My Towers</p>
                  <p className="text-yellow-50 text-2xl font-bold">{myTowers.length}</p>
                </div>
              </div>
              <button
                onClick={handleClaimFaucet}
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
              >
                💰 Claim Free GAME Tokens (10 GAME)
              </button>
            </div>

            {message && (
              <div className="bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 rounded-2xl p-4 mb-6 shadow-2xl">
                <p className="text-yellow-100 font-bold text-center">{message}</p>
              </div>
            )}

            <div className="rounded-2xl p-8 border-4 border-yellow-600 shadow-2xl mb-6 relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-90"
                style={{
                  backgroundImage: 'url(/ldbck.png)',
                }}
              ></div>
              
              <div className="relative z-10">
                <div className="text-center">
                  <div className="mb-6">
                    <img 
                      src="/ld.png"
                      alt="Mystery Box" 
                      className="w-80 h-80 mx-auto drop-shadow-2xl"
                    />
                  </div>
                  
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-white/20 mb-6">
                    <h2 className="text-2xl font-bold text-yellow-200 mb-3 drop-shadow-lg">
                      Tower Mystery Box
                    </h2>
                    <p className="text-white mb-2 drop-shadow-lg text-lg">
                      Get a random tower with unique stats!
                    </p>
                    <p className="text-yellow-300 font-bold text-xl">
                      Cost: {MINT_COST / 1_000_000_000} GAME
                    </p>
                  </div>

                  <button
                    onClick={handleMint}
                    disabled={!account || loading}
                    className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-8 py-6 rounded-xl font-bold text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
                  >
                    {loading ? '✨ Minting...' : `🎁 Open Mystery Box (${MINT_COST / 1_000_000_000} GAME)`}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6 border-2 border-cyan-400">
              <h3 className="text-2xl font-bold text-cyan-300 mb-4">💡 How It Works</h3>
              <div className="space-y-3 text-cyan-100">
                <p>• Click "Claim Free GAME Tokens" to get 10 GAME</p>
                <p>• Pay {MINT_COST / 1_000_000_000} GAME to open a mystery box</p>
                <p>• Get a random tower NFT with unique stats</p>
                <p>• Higher rarity = stronger tower</p>
                <p>• Use towers in game or trade on market</p>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {showMintCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 rounded-3xl p-8 border-4 border-yellow-400 max-w-md w-full mx-4 shadow-2xl shadow-purple-500/50">
            <h2 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
              ✨ Mystery Box ✨
            </h2>
            
            {!mintedTower ? (
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 animate-bounce">
                  <img 
                    src="/ld.png" 
                    alt="Opening..." 
                    className="w-full h-full drop-shadow-2xl"
                  />
                </div>
                <p className="text-white text-xl font-bold drop-shadow-lg">Opening box...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                  <TowerCardIcon rarity={mintedTower.rarity} />
                </div>
                <p className={`text-3xl font-bold mb-2 drop-shadow-lg ${RARITY_COLORS[mintedTower.rarity]}`}>
                  {RARITY_NAMES[mintedTower.rarity]}
                </p>
                <p className="text-white text-xl mb-4 drop-shadow-lg">Tower NFT!</p>
                
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 mb-4 border-2 border-white/20">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">⚔️ Damage:</span>
                      <span className="text-white font-bold">{mintedTower.damage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🎯 Range:</span>
                      <span className="text-white font-bold">{mintedTower.range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">⚡ Fire Rate:</span>
                      <span className="text-white font-bold">{mintedTower.fireRate}ms</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowMintCard(false);
                    setMintedTower(null);
                    setLoading(false);
                    setMessage('');
                  }}
                  className="bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 px-8 py-3 rounded-xl font-bold hover:scale-110 transition-transform shadow-lg"
                >
                  🎉 Awesome!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
