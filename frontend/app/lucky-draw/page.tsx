'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { mintTower } from '@/lib/contracts';
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
const RARITY_BG = ['', 'bg-gray-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];

export default function LuckyDrawPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [drawType, setDrawType] = useState<'tower' | 'monster'>('tower');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMintCard, setShowMintCard] = useState(false);
  const [mintedTower, setMintedTower] = useState<TowerNFT | null>(null);
  const previousTowerCountRef = useRef(0);
  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);

  // Fetch wallet balance
  const { data: balance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: '0x2::sui::SUI',
    },
    {
      enabled: !!account?.address,
      refetchInterval: 3000,
    }
  );

  const suiBalance = balance ? Number(balance.totalBalance) / 1_000_000_000 : 0;

  // Fetch user's tower NFTs
  const { data: ownedObjects, refetch } = useSuiClientQuery(
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
    if (ownedObjects?.data) {
      const towers: TowerNFT[] = ownedObjects.data
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
        setMintedTower(newTower);
        setMessage('🎉 Tower NFT minted!');
      }

      setMyTowers(towers);
    }
  }, [ownedObjects, showMintCard, mintedTower]);

  const handleMint = () => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    if (drawType === 'monster') {
      setMessage('🚧 Monster minting coming soon!');
      return;
    }

    previousTowerCountRef.current = myTowers.length;
    setLoading(true);
    setShowMintCard(true);
    setMintedTower(null);
    setMessage('🎰 Minting tower...');
    
    const tx = new Transaction();
    mintTower(tx, MINT_COST * 1_000_000_000);

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: (result: any) => {
          console.log('Tower minted successfully:', result);
          setLoading(false);
          setMessage('🎰 Opening mystery box...');
          refetch();
        },
        onError: (error: any) => {
          console.error('Error:', error);
          setMessage(`Error: ${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/town" className="text-cyan-300 hover:text-cyan-200 font-bold">
            ← Back to Town
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-yellow-200 mb-4" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.5)'}}>
            🎁 Lucky Draw
          </h1>
          
          {/* Toggle Switch */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setDrawType('tower')}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                drawType === 'tower'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              🗼 Tower
            </button>
            <button
              onClick={() => setDrawType('monster')}
              className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                drawType === 'monster'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              👹 Monster
            </button>
          </div>
          
          <p className="text-purple-200 text-lg">
            {drawType === 'tower' 
              ? 'Open mystery boxes to get random tower NFTs!' 
              : 'Open mystery boxes to get random monster NFTs!'}
          </p>
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
                  <p className="text-yellow-200 text-sm font-bold">💰 Wallet Balance</p>
                  <p className="text-yellow-50 text-2xl font-bold">{suiBalance.toFixed(4)} SUI</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-200 text-sm font-bold">🗼 My Towers</p>
                  <p className="text-yellow-50 text-2xl font-bold">{myTowers.length}</p>
                </div>
              </div>
            </div>

            {message && (
              <div className="bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 rounded-2xl p-4 mb-6 shadow-2xl">
                <p className="text-yellow-100 font-bold text-center">{message}</p>
              </div>
            )}

            <div className={`rounded-2xl p-8 border-4 shadow-2xl mb-6 ${
              drawType === 'tower'
                ? 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-900'
                : 'bg-gradient-to-b from-red-600 to-orange-800 border-red-900'
            }`}>
              <div className="text-center mb-6">
                <div className={`w-48 h-48 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse ${
                  drawType === 'tower'
                    ? 'bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-500'
                    : 'bg-gradient-to-br from-red-400 via-orange-500 to-yellow-400'
                }`}>
                  <span className="text-9xl">{drawType === 'tower' ? '📦' : '🎃'}</span>
                </div>
                <h2 className="text-3xl font-bold text-yellow-200 mb-4">
                  {drawType === 'tower' ? 'Tower Mystery Box' : 'Monster Mystery Box'}
                </h2>
                <p className="text-purple-200 mb-6">
                  {drawType === 'tower'
                    ? 'Open a mystery box to get a random tower with unique stats!'
                    : 'Open a mystery box to get a random monster with unique abilities!'}
                </p>
              </div>

              {drawType === 'tower' ? (
                <div className="bg-black/30 rounded-xl p-6 mb-6 border border-purple-500/30">
                  <h3 className="text-purple-200 font-bold mb-3 text-lg">✨ Tower Rarity Rates:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">⚪ Common</span>
                      <span className="text-gray-400">50% • 15-23 dmg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">🔵 Rare</span>
                      <span className="text-cyan-400">30% • 25-33 dmg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300">🟣 Epic</span>
                      <span className="text-purple-400">15% • 40-48 dmg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-300">🟡 Legendary</span>
                      <span className="text-yellow-400">5% • 60-68 dmg</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-black/30 rounded-xl p-6 mb-6 border border-red-500/30">
                  <h3 className="text-red-200 font-bold mb-3 text-lg">✨ Monster Rarity Rates:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">⚪ Common</span>
                      <span className="text-gray-400">50% • 100-150 HP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">🔵 Rare</span>
                      <span className="text-cyan-400">30% • 200-300 HP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-300">🟣 Epic</span>
                      <span className="text-purple-400">15% • 400-500 HP</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-300">🟡 Legendary</span>
                      <span className="text-yellow-400">5% • 800-1000 HP</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={!account || loading || drawType === 'monster'}
                className={`w-full text-white px-8 py-6 rounded-xl font-bold text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  drawType === 'tower'
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 shadow-purple-500/50'
                    : 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 shadow-red-500/50'
                }`}
              >
                {loading ? '✨ Minting...' : drawType === 'monster' ? '🚧 Coming Soon' : `🎁 Open Mystery Box (${MINT_COST} SUI)`}
              </button>
            </div>

            <div className={`rounded-2xl p-6 border-2 ${
              drawType === 'tower'
                ? 'bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-cyan-400'
                : 'bg-gradient-to-br from-red-900/50 to-orange-900/50 border-red-400'
            }`}>
              <h3 className={`text-2xl font-bold mb-4 ${drawType === 'tower' ? 'text-cyan-300' : 'text-red-300'}`}>
                💡 How It Works
              </h3>
              {drawType === 'tower' ? (
                <div className="space-y-3 text-cyan-100">
                  <p>• Pay {MINT_COST} SUI to open a mystery box</p>
                  <p>• Get a random tower NFT with unique stats</p>
                  <p>• Higher rarity = stronger tower</p>
                  <p>• Use towers in game or trade on market</p>
                </div>
              ) : (
                <div className="space-y-3 text-orange-100">
                  <p>• Pay {MINT_COST} SUI to open a mystery box</p>
                  <p>• Get a random monster NFT with unique abilities</p>
                  <p>• Higher rarity = stronger monster</p>
                  <p>• Use monsters to create challenges</p>
                  <p className="text-yellow-300 font-bold">🚧 Monster minting coming soon!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mint Card Modal */}
      {showMintCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 rounded-3xl p-8 border-4 border-yellow-400 max-w-md w-full mx-4 shadow-2xl shadow-purple-500/50">
            <h2 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
              ✨ Mystery Box ✨
            </h2>
            
            {!mintedTower ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-500 rounded-2xl animate-bounce flex items-center justify-center shadow-2xl">
                  <span className="text-6xl">📦</span>
                </div>
                <p className="text-white text-xl font-bold drop-shadow-lg">Opening box...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto mb-4 ${RARITY_BG[mintedTower.rarity]} rounded-2xl flex items-center justify-center animate-pulse shadow-2xl`}>
                  <span className="text-6xl">🗼</span>
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
