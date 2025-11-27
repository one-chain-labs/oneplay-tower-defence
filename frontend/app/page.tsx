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
  const [selectedTowers, setSelectedTowers] = useState<TowerNFT[]>([]);
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
      console.log('📦 Fetched objects:', ownedObjects.data.length);
      console.log('🔍 Looking for towers with type:', `${PACKAGE_ID}::game::TowerNFT`);
      
      const towers: TowerNFT[] = ownedObjects.data
        .map((obj: any) => {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject' && content.fields) {
            console.log('✅ Found tower:', obj.data.objectId, 'Type:', content.type);
            
            // Only include towers from the NEW contract
            const expectedType = `${PACKAGE_ID}::game::TowerNFT`;
            if (content.type !== expectedType) {
              console.log('⚠️ Skipping old tower:', obj.data.objectId, 'Expected:', expectedType, 'Got:', content.type);
              return null;
            }
            
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
      
      console.log('🗼 Total NEW towers found:', towers.length);

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
      { transaction: tx as any },
      {
        onSuccess: (result: any) => {
          console.log('Tower minted successfully:', result);
          setLoading(false);
          setMessage('🎰 Opening mystery box...');
          
          // Trigger refetch
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

  // Toggle tower selection
  const handleToggleTower = (tower: TowerNFT) => {
    const isSelected = selectedTowers.some(t => t.id === tower.id);
    
    if (isSelected) {
      setSelectedTowers(selectedTowers.filter(t => t.id !== tower.id));
      setMessage('Tower removed from selection');
    } else {
      if (selectedTowers.length >= 5) {
        setMessage('Maximum 5 towers can be selected!');
        return;
      }
      setSelectedTowers([...selectedTowers, tower]);
      setMessage(`Tower added! (${selectedTowers.length + 1}/5)`);
    }
  };

  // Go to game page
  const handlePlayGame = () => {
    if (selectedTowers.length === 0) {
      setMessage('Please select at least 1 tower (max 5)');
      return;
    }

    // Encode tower data as JSON in URL
    const towersData = encodeURIComponent(JSON.stringify(selectedTowers.map(t => ({
      id: t.id,
      damage: t.damage,
      range: t.range,
      fireRate: t.fireRate,
      rarity: t.rarity
    }))));
    
    window.location.href = `/play?towers=${towersData}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23a0522d" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
      }}></div>
      
      {/* Top Navigation - Wood Frame Style */}
      <nav className="bg-gradient-to-b from-amber-800 to-amber-900 border-b-4 border-amber-950 sticky top-0 z-50 shadow-2xl" style={{
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-yellow-200 drop-shadow-lg" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
                🏰 Tower Crash
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link href="/challenge-list" className="bg-gradient-to-b from-red-600 to-red-800 text-yellow-100 px-4 py-2 rounded-lg font-bold border-2 border-red-900 hover:from-red-500 hover:to-red-700 transition-all shadow-lg" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                  ⚔️ Challenges
                </Link>
                <Link href="/challenges" className="bg-gradient-to-b from-purple-600 to-purple-800 text-yellow-100 px-4 py-2 rounded-lg font-bold border-2 border-purple-900 hover:from-purple-500 hover:to-purple-700 transition-all shadow-lg" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                  👹 Monsters
                </Link>
                <Link href="/market" className="bg-gradient-to-b from-green-600 to-green-800 text-yellow-100 px-4 py-2 rounded-lg font-bold border-2 border-green-900 hover:from-green-500 hover:to-green-700 transition-all shadow-lg" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                  🏪 Market
                </Link>
                <Link href="/history" className="bg-gradient-to-b from-blue-600 to-blue-800 text-yellow-100 px-4 py-2 rounded-lg font-bold border-2 border-blue-900 hover:from-blue-500 hover:to-blue-700 transition-all shadow-lg" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
                  📊 History
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative">
        {/* Wood Frame Title */}
        <div className="text-center mb-8 bg-gradient-to-b from-amber-700 to-amber-900 rounded-2xl p-6 border-4 border-amber-950 shadow-2xl relative" style={{
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.3)'
        }}>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-yellow-400 to-yellow-600 px-6 py-1 rounded-full border-2 border-yellow-700 shadow-lg">
            <span className="text-amber-900 font-bold text-sm">GAME CENTER</span>
          </div>
          <h1 className="text-5xl font-bold text-yellow-200 mb-2" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.5)'}}>
            🏰 Tower Defense GameFi
          </h1>
          <p className="text-yellow-100">Mint Tower NFTs • Play to Earn • Trade on Market</p>
        </div>

        {!account ? (
          <div className="bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-900 rounded-2xl p-6 mb-6 text-center shadow-2xl" style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.3)'
          }}>
            <p className="text-yellow-100 text-lg font-bold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>🔐 Connect your wallet to start playing!</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-amber-600 to-amber-800 rounded-2xl p-4 mb-6 border-4 border-amber-950 shadow-2xl" style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.3)'
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm font-bold">💰 Wallet Balance</p>
                <p className="text-yellow-50 text-2xl font-bold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>{suiBalance.toFixed(4)} SUI</p>
              </div>
              <div className="text-right">
                <p className="text-yellow-200 text-sm font-bold">📍 Address</p>
                <p className="text-yellow-50 text-sm font-mono bg-amber-900/50 px-3 py-1 rounded-lg border border-amber-950">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 rounded-2xl p-4 mb-6 shadow-2xl" style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.3)'
          }}>
            <p className="text-yellow-100 font-bold" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Mint Tower - Building Style */}
          <div className="bg-gradient-to-b from-purple-600 to-purple-800 rounded-2xl p-6 border-4 border-purple-900 shadow-2xl relative" style={{
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.3)'
          }}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-b from-yellow-400 to-yellow-600 px-6 py-2 rounded-full border-2 border-yellow-700 shadow-lg">
              <span className="text-purple-900 font-bold">🎁 MINT TOWER</span>
            </div>
            <h2 className="text-2xl font-bold text-yellow-200 mb-4 mt-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>Mystery Box</h2>
            <p className="text-gray-300 mb-4">
              Open a mystery box to get a random tower with unique stats!
            </p>

            <div className="bg-black/30 rounded-xl p-4 mb-4 border border-purple-500/30">
              <h3 className="text-purple-200 font-bold mb-2">✨ Rarity Rates:</h3>
              <div className="space-y-1">
                <p className="text-gray-300">⚪ Common: 50% (15-23 dmg)</p>
                <p className="text-cyan-300">🔵 Rare: 30% (25-33 dmg)</p>
                <p className="text-purple-300">🟣 Epic: 15% (40-48 dmg)</p>
                <p className="text-yellow-300">🟡 Legendary: 5% (60-68 dmg)</p>
              </div>
            </div>

            <button
              onClick={handleMintTower}
              disabled={!account || loading}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
            >
              {loading ? '✨ Minting...' : `🎁 Mint Tower (${MINT_COST} SUI)`}
            </button>
          </div>

          {/* Game Info */}
          <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6 border-2 border-cyan-400 backdrop-blur-sm">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent mb-4">🎮 How to Play</h2>
            
            <div className="space-y-3 text-cyan-100">
              <div className="flex items-start bg-black/20 rounded-lg p-3">
                <span className="text-2xl mr-3">1️⃣</span>
                <div>
                  <p className="font-bold text-cyan-200">Mint Tower NFT</p>
                  <p className="text-sm">Pay {MINT_COST} SUI to get random tower</p>
                </div>
              </div>

              <div className="flex items-start bg-black/20 rounded-lg p-3">
                <span className="text-2xl mr-3">2️⃣</span>
                <div>
                  <p className="font-bold text-purple-200">Select Tower</p>
                  <p className="text-sm">Choose from your inventory below</p>
                </div>
              </div>

              <div className="flex items-start bg-black/20 rounded-lg p-3">
                <span className="text-2xl mr-3">3️⃣</span>
                <div>
                  <p className="font-bold text-pink-200">Play Game</p>
                  <p className="text-sm">Pay {GAME_COST} SUI to start tower defense</p>
                </div>
              </div>

              <div className="flex items-start bg-black/20 rounded-lg p-3">
                <span className="text-2xl mr-3">4️⃣</span>
                <div>
                  <p className="font-bold text-yellow-200">Earn NFT Rewards</p>
                  <p className="text-sm">Clear waves to get reward tower NFTs!</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border-2 border-green-400 rounded-xl p-3">
              <p className="text-green-300 font-bold">🎁 NFT Tower Rewards:</p>
              <p className="text-sm text-cyan-100">2 waves: 20% drop chance</p>
              <p className="text-sm text-cyan-100">3 waves: 30% drop chance</p>
              <p className="text-sm text-cyan-100">4 waves: 50% drop chance</p>
              <p className="text-sm text-cyan-100">5 waves: 80% drop chance (Epic+)</p>
            </div>
          </div>
        </div>

        {/* My Towers */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 border-2 border-blue-400 backdrop-blur-sm">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent mb-4">
            🎯 My Towers ({myTowers.length})
          </h2>

          {myTowers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cyan-200 text-lg mb-4">You don't have any towers yet</p>
              <p className="text-purple-300">Mint your first tower to start playing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTowers.map((tower) => (
                <div
                  key={tower.id}
                  onClick={() => handleToggleTower(tower)}
                  className={`bg-gradient-to-br from-black/40 to-purple-900/40 rounded-xl p-4 cursor-pointer border-2 transition-all hover:scale-105 relative ${
                    selectedTowers.some(t => t.id === tower.id)
                      ? 'border-cyan-400 shadow-lg shadow-cyan-500/50'
                      : 'border-purple-500/30 hover:border-purple-400'
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
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-500 text-xs">ID: {tower.id.slice(0, 8)}...{tower.id.slice(-6)}</span>
                    </div>
                  </div>

                  {selectedTowers.some(t => t.id === tower.id) && (
                    <>
                      <div className="absolute top-2 right-2 bg-cyan-400 text-gray-900 rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">
                        {selectedTowers.findIndex(t => t.id === tower.id) + 1}
                      </div>
                      <div className="mt-3 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-2 border-cyan-400 rounded-lg px-2 py-1 text-center">
                        <span className="text-cyan-200 text-sm font-bold">✓ Selected</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {myTowers.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400 rounded-xl p-3">
                <p className="text-cyan-200 text-sm font-bold text-center">
                  📋 Selected: {selectedTowers.length}/5 towers
                </p>
              </div>

              <button
                onClick={handlePlayGame}
                disabled={selectedTowers.length === 0}
                className="w-full bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 text-gray-900 px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎮 Play with {selectedTowers.length} Tower{selectedTowers.length !== 1 ? 's' : ''}
              </button>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 rounded-xl p-3">
                <p className="text-yellow-200 text-sm font-bold text-center">
                  💡 Each tower can only be placed once! Pay {GAME_COST} SUI to play.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="mt-6 md:hidden flex justify-center gap-4 flex-wrap">
          <Link
            href="/challenge-list"
            className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-400 text-red-300 hover:text-red-200 px-4 py-2 rounded-xl font-bold transition-all"
          >
            ⚔️ Challenges
          </Link>
          <Link
            href="/challenges"
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400 text-purple-300 hover:text-purple-200 px-4 py-2 rounded-xl font-bold transition-all"
          >
            👹 Monsters
          </Link>
          <Link
            href="/market"
            className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-2 border-pink-400 text-pink-300 hover:text-pink-200 px-4 py-2 rounded-xl font-bold transition-all"
          >
            🏪 Market
          </Link>
          <Link
            href="/history"
            className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400 text-cyan-300 hover:text-cyan-200 px-4 py-2 rounded-xl font-bold transition-all"
          >
            📊 History
          </Link>
        </div>
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
