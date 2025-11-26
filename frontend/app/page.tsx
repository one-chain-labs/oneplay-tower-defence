'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { mintTower } from '@/lib/contracts';
import { MINT_COST, GAME_COST, PACKAGE_ID } from '@/lib/constants';
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

export default function HomePage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);
  const [selectedTower, setSelectedTower] = useState<TowerNFT | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMintCard, setShowMintCard] = useState(false);
  const [mintedTower, setMintedTower] = useState<TowerNFT | null>(null);
  const previousTowerCountRef = useRef(0);

  // Log wallet connection status
  useEffect(() => {
    console.log('Wallet status:', account ? 'Connected' : 'Disconnected');
    if (account) {
      console.log('Address:', account.address);
    }
  }, [account]);

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
      refetchInterval: 3000, // Auto refetch every 3 seconds
    }
  );

  useEffect(() => {
    if (ownedObjects?.data) {
      const towers: TowerNFT[] = ownedObjects.data
        .map((obj: any) => {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject' && content.fields) {
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

      // Check if we got a new tower while minting
      if (showMintCard && !mintedTower && towers.length > previousTowerCountRef.current) {
        const newTower = towers[0]; // Newest tower
        console.log('New tower detected in useEffect:', newTower);
        setMintedTower(newTower);
        setMessage('🎉 Tower NFT minted!');
      }

      setMyTowers(towers);
    }
  }, [ownedObjects, showMintCard, mintedTower]);

  // Mint tower NFT
  const handleMintTower = () => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    // Save current tower count
    previousTowerCountRef.current = myTowers.length;
    console.log('Starting mint, current tower count:', previousTowerCountRef.current);

    setLoading(true);
    setShowMintCard(true);
    setMintedTower(null); // Reset
    setMessage('🎰 Minting tower...');
    
    const tx = new Transaction();
    mintTower(tx, MINT_COST * 1_000_000_000);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log('Tower minted successfully:', result);
          setLoading(false);
          setMessage('🎰 Opening mystery box...');
          
          // Trigger refetch
          refetch();
        },
        onError: (error) => {
          console.error('Error:', error);
          setMessage(`Error: ${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  // Go to game page
  const handlePlayGame = () => {
    if (!selectedTower) {
      setMessage('Please select a tower first');
      return;
    }

    // Redirect to game page with tower info
    window.location.href = `/play?tower=${selectedTower.id}&damage=${selectedTower.damage}&range=${selectedTower.range}&fireRate=${selectedTower.fireRate}&rarity=${selectedTower.rarity}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🏰 Tower Defense GameFi</h1>
          <p className="text-gray-400">Mint Tower NFTs • Play to Earn • Trade on Market</p>
        </div>

        {!account ? (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 mb-6 text-center">
            <p className="text-white text-lg">Please connect your wallet to play</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-4 mb-6 border-2 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Wallet Balance</p>
                <p className="text-white text-2xl font-bold">{suiBalance.toFixed(4)} SUI</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Address</p>
                <p className="text-white text-sm font-mono">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6">
            <p className="text-white">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Mint Tower */}
          <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">🎁 Mint Tower NFT</h2>
            <p className="text-gray-300 mb-4">
              Open a mystery box to get a random tower with unique stats!
            </p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="text-white font-bold mb-2">Rarity Rates:</h3>
              <div className="space-y-1">
                <p className="text-gray-400">⚪ Common: 50% (15-23 dmg)</p>
                <p className="text-blue-400">🔵 Rare: 30% (25-33 dmg)</p>
                <p className="text-purple-400">🟣 Epic: 15% (40-48 dmg)</p>
                <p className="text-yellow-400">🟡 Legendary: 5% (60-68 dmg)</p>
              </div>
            </div>

            <button
              onClick={handleMintTower}
              disabled={!account || loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Minting...' : `Mint Tower (${MINT_COST} SUI)`}
            </button>
          </div>

          {/* Game Info */}
          <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">🎮 How to Play</h2>
            
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start">
                <span className="text-2xl mr-3">1️⃣</span>
                <div>
                  <p className="font-bold text-white">Mint Tower NFT</p>
                  <p className="text-sm">Pay {MINT_COST} SUI to get random tower</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="text-2xl mr-3">2️⃣</span>
                <div>
                  <p className="font-bold text-white">Select Tower</p>
                  <p className="text-sm">Choose from your inventory below</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="text-2xl mr-3">3️⃣</span>
                <div>
                  <p className="font-bold text-white">Play Game</p>
                  <p className="text-sm">Pay {GAME_COST} SUI to start tower defense</p>
                </div>
              </div>

              <div className="flex items-start">
                <span className="text-2xl mr-3">4️⃣</span>
                <div>
                  <p className="font-bold text-white">Earn NFT Rewards</p>
                  <p className="text-sm">Clear waves to get reward tower NFTs!</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-green-500/20 border border-green-500 rounded-lg p-3">
              <p className="text-green-400 font-bold">🎁 NFT Tower Rewards:</p>
              <p className="text-sm text-gray-300">2 waves: 20% drop chance</p>
              <p className="text-sm text-gray-300">3 waves: 30% drop chance</p>
              <p className="text-sm text-gray-300">4 waves: 50% drop chance</p>
              <p className="text-sm text-gray-300">5 waves: 80% drop chance (Epic+)</p>
            </div>
          </div>
        </div>

        {/* My Towers */}
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            🎯 My Towers ({myTowers.length})
          </h2>

          {myTowers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">You don't have any towers yet</p>
              <p className="text-gray-500">Mint your first tower to start playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTowers.map((tower) => (
                <div
                  key={tower.id}
                  onClick={() => setSelectedTower(tower)}
                  className={`bg-gray-900 rounded-lg p-4 cursor-pointer border-2 transition-all ${
                    selectedTower?.id === tower.id
                      ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold ${RARITY_COLORS[tower.rarity]}`}>
                      {RARITY_NAMES[tower.rarity]}
                    </span>
                    <div className={`w-3 h-3 rounded-full ${RARITY_BG[tower.rarity]}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">⚔️ Damage:</span>
                      <span className="text-white font-bold">{tower.damage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">🎯 Range:</span>
                      <span className="text-white font-bold">{tower.range}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">⚡ Fire Rate:</span>
                      <span className="text-white font-bold">{tower.fireRate}ms</span>
                    </div>
                  </div>

                  {selectedTower?.id === tower.id && (
                    <div className="mt-3 bg-blue-500/20 border border-blue-500 rounded px-2 py-1 text-center">
                      <span className="text-blue-400 text-sm font-bold">Selected</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedTower && (
            <div className="mt-6 space-y-3">
              <button
                onClick={handlePlayGame}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-blue-600"
              >
                🎮 Play Game
              </button>

              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3">
                <p className="text-yellow-400 text-sm font-bold text-center">
                  💡 Pay {GAME_COST} SUI to play. Clear more waves for better NFT rewards!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="mt-6 flex justify-center gap-6 flex-wrap">
          <Link
            href="/challenge-list"
            className="text-red-400 hover:text-red-300 underline font-bold"
          >
            👹 Challenges
          </Link>
          <Link
            href="/challenges"
            className="text-orange-400 hover:text-orange-300 underline font-bold"
          >
            🎁 My Monsters
          </Link>
          <Link
            href="/market"
            className="text-purple-400 hover:text-purple-300 underline font-bold"
          >
            🏪 Marketplace
          </Link>
          <Link
            href="/history"
            className="text-blue-400 hover:text-blue-300 underline font-bold"
          >
            📊 History
          </Link>
          <Link
            href="/test"
            className="text-gray-400 hover:text-white underline"
          >
            🧪 Test
          </Link>
        </div>
      </div>

      {/* Mint Card Modal */}
      {showMintCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 border-4 border-yellow-500 max-w-md w-full mx-4">
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              🎁 Mystery Box
            </h2>
            
            {!mintedTower ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl animate-bounce flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
                <p className="text-white text-xl font-bold">Opening box...</p>
              </div>
            ) : (
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto mb-4 ${RARITY_BG[mintedTower.rarity]} rounded-xl flex items-center justify-center animate-pulse`}>
                  <span className="text-6xl">🗼</span>
                </div>
                <p className={`text-3xl font-bold mb-2 ${RARITY_COLORS[mintedTower.rarity]}`}>
                  {RARITY_NAMES[mintedTower.rarity]}
                </p>
                <p className="text-white text-xl mb-4">Tower NFT!</p>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
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
                  className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600"
                >
                  Awesome!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
