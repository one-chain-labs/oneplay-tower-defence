'use client';

import { useState } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID, REWARDS } from '@/lib/constants';
import Link from 'next/link';

interface GameRecord {
  sessionId: string;
  player: string;
  wavesCleared: number;
  reward: number;
  timestamp: number;
}

interface MarketTransaction {
  id: string;
  type: 'listed' | 'sold' | 'cancelled' | 'bought';
  towerId: string;
  price: number;
  seller?: string;
  buyer?: string;
  timestamp: number;
}

export default function HistoryPage() {
  const account = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<'games' | 'market'>('games');

  // Fetch game completed events
  const { data: events } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::GameCompletedEvent`,
      },
      limit: 50,
    },
    {
      enabled: !!account?.address,
    }
  );

  // Fetch challenge completed events
  const { data: challengeEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::ChallengeCompletedEvent`,
      },
      limit: 50,
    },
    {
      enabled: !!account?.address,
    }
  );

  // Fetch marketplace events
  const { data: listedEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::TowerListedEvent`,
      },
      limit: 50,
    },
    {
      enabled: !!account?.address,
    }
  );

  const { data: soldEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::TowerSoldEvent`,
      },
      limit: 50,
    },
    {
      enabled: !!account?.address,
    }
  );

  const { data: cancelledEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::ListingCancelledEvent`,
      },
      limit: 50,
    },
    {
      enabled: !!account?.address,
    }
  );

  // Get blockchain records
  const blockchainRecords: GameRecord[] = events?.data
    ?.map((event: any) => {
      const parsedJson = event.parsedJson;
      if (parsedJson && parsedJson.player === account?.address) {
        return {
          sessionId: event.id?.txDigest || `tx-${event.timestampMs}`,
          player: parsedJson.player,
          wavesCleared: Number(parsedJson.waves_cleared),
          reward: Number(parsedJson.reward), // 1 if got NFT, 0 if not
          timestamp: Number(event.timestampMs),
        };
      }
      return null;
    })
    .filter((r): r is GameRecord => r !== null) || [];

  // Get challenge records
  const challengeRecords: GameRecord[] = challengeEvents?.data
    ?.map((event: any) => {
      const parsedJson = event.parsedJson;
      if (parsedJson && parsedJson.player === account?.address) {
        return {
          sessionId: `challenge-${event.id?.txDigest || event.timestampMs}`,
          player: parsedJson.player,
          wavesCleared: parsedJson.success ? 1 : 0, // 1 for success, 0 for fail
          reward: Number(parsedJson.reward) / 1_000_000_000, // Convert to SUI
          timestamp: Number(event.timestampMs),
        };
      }
      return null;
    })
    .filter((r): r is GameRecord => r !== null) || [];

  // Get local test records
  const localRecords: GameRecord[] = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gameHistory') || '[]').map((r: any) => ({
        sessionId: 'test-' + r.timestamp,
        player: account?.address || '',
        wavesCleared: r.wavesCleared,
        reward: r.reward,
        timestamp: r.timestamp,
      }))
    : [];

  // Combine and sort
  const gameRecords = [...blockchainRecords, ...challengeRecords, ...localRecords]
    .sort((a, b) => b.timestamp - a.timestamp);

  const totalGames = gameRecords.length;
  const totalRewards = gameRecords.reduce((sum, r) => sum + r.reward, 0);
  const avgWaves = totalGames > 0 
    ? gameRecords.reduce((sum, r) => sum + r.wavesCleared, 0) / totalGames 
    : 0;
  const victories = gameRecords.filter(r => r.wavesCleared >= 5).length;

  // Process marketplace transactions
  const marketTransactions: MarketTransaction[] = [];

  // Listed events
  listedEvents?.data?.forEach((event: any) => {
    const parsedJson = event.parsedJson;
    if (parsedJson && parsedJson.seller === account?.address) {
      marketTransactions.push({
        id: event.id?.txDigest || `listed-${event.timestampMs}`,
        type: 'listed',
        towerId: parsedJson.tower_id,
        price: Number(parsedJson.price) / 1_000_000_000,
        seller: parsedJson.seller,
        timestamp: Number(event.timestampMs),
      });
    }
  });

  // Sold events
  soldEvents?.data?.forEach((event: any) => {
    const parsedJson = event.parsedJson;
    if (parsedJson && (parsedJson.seller === account?.address || parsedJson.buyer === account?.address)) {
      marketTransactions.push({
        id: event.id?.txDigest || `sold-${event.timestampMs}`,
        type: parsedJson.seller === account?.address ? 'sold' : 'bought',
        towerId: parsedJson.tower_id,
        price: Number(parsedJson.price) / 1_000_000_000,
        seller: parsedJson.seller,
        buyer: parsedJson.buyer,
        timestamp: Number(event.timestampMs),
      });
    }
  });

  // Cancelled events
  cancelledEvents?.data?.forEach((event: any) => {
    const parsedJson = event.parsedJson;
    if (parsedJson && parsedJson.seller === account?.address) {
      marketTransactions.push({
        id: event.id?.txDigest || `cancelled-${event.timestampMs}`,
        type: 'cancelled',
        towerId: 'unknown',
        price: 0,
        seller: parsedJson.seller,
        timestamp: Number(event.timestampMs),
      });
    }
  });

  // Sort by timestamp
  marketTransactions.sort((a, b) => b.timestamp - a.timestamp);

  // Market stats
  const totalSales = marketTransactions.filter(t => t.type === 'sold').length;
  const totalPurchases = marketTransactions.filter(t => t.type === 'bought').length;
  const totalEarned = marketTransactions
    .filter(t => t.type === 'sold')
    .reduce((sum, t) => sum + t.price, 0);
  const totalSpent = marketTransactions
    .filter(t => t.type === 'bought')
    .reduce((sum, t) => sum + t.price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">📊 Game History</h1>
          <Link
            href="/"
            className="bg-gray-700 text-white px-6 py-2 rounded-xl hover:bg-gray-600"
          >
            ← Back
          </Link>
        </div>

        {!account && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-white text-lg">Please connect your wallet to view history</p>
          </div>
        )}

        {account && (
          <>
            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'games'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                🎮 Game History
              </button>
              <button
                onClick={() => setActiveTab('market')}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'market'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                🏪 Market History
              </button>
            </div>

            {activeTab === 'games' && (
              <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Total Games</p>
                <p className="text-3xl font-bold text-white">{totalGames}</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Victories</p>
                <p className="text-3xl font-bold text-green-400">{victories}</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Avg Waves</p>
                <p className="text-3xl font-bold text-blue-400">{avgWaves.toFixed(1)}</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                <p className="text-gray-400 text-sm mb-1">NFT Rewards</p>
                <p className="text-3xl font-bold text-yellow-400">{totalRewards}</p>
              </div>
            </div>

            {/* Game Records */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Recent Games</h2>

              {gameRecords.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-4">No games played yet</p>
                  <Link
                    href="/"
                    className="inline-block bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600"
                  >
                    Play Your First Game
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameRecords.map((record, index) => {
                    const isTestMode = record.sessionId?.startsWith('test-') || false;
                    return (
                      <div
                        key={(record.sessionId || 'unknown') + index}
                        className="bg-gray-900 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            record.sessionId.startsWith('challenge-')
                              ? record.wavesCleared > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'
                              : record.wavesCleared >= 5 
                              ? 'bg-yellow-500/20 text-yellow-400' 
                              : record.wavesCleared >= 3
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {record.sessionId.startsWith('challenge-') 
                              ? (record.wavesCleared > 0 ? '⚔️' : '💀')
                              : (record.wavesCleared >= 5 ? '🏆' : record.wavesCleared >= 3 ? '✓' : '✗')
                            }
                          </div>

                          <div>
                            <p className="text-white font-bold">
                              {record.sessionId.startsWith('challenge-')
                                ? (record.wavesCleared > 0 ? 'Challenge Won!' : 'Challenge Lost')
                                : (record.wavesCleared >= 5 ? 'Victory!' : `${record.wavesCleared} Waves Cleared`)
                              }
                              {isTestMode && <span className="ml-2 text-xs text-gray-500">(Test)</span>}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {new Date(record.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {record.sessionId.startsWith('challenge-') ? (
                            <>
                              <p className={`font-bold text-lg ${record.reward > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {record.reward > 0 ? `+${record.reward.toFixed(3)} SUI` : 'Lost'}
                              </p>
                              <p className="text-gray-400 text-sm">Challenge</p>
                            </>
                          ) : (
                            <>
                              <p className={`font-bold text-lg ${record.reward > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                {record.reward > 0 ? '🎁 NFT Tower' : 'No Drop'}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {record.wavesCleared >= 5 ? '80%' : record.wavesCleared >= 4 ? '50%' : record.wavesCleared >= 3 ? '30%' : record.wavesCleared >= 2 ? '20%' : '0%'} chance
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reward Table */}
            <div className="mt-8 bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">🎁 NFT Drop Rates</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3">
                  <span className="text-gray-300">Clear 2 Waves</span>
                  <span className="text-gray-400 font-bold">20% NFT Drop</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3">
                  <span className="text-gray-300">Clear 3 Waves</span>
                  <span className="text-green-400 font-bold">30% NFT Drop</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3">
                  <span className="text-gray-300">Clear 4 Waves</span>
                  <span className="text-blue-400 font-bold">50% NFT Drop</span>
                </div>
                <div className="flex justify-between items-center bg-gray-900 rounded-lg p-3">
                  <span className="text-gray-300">Clear 5 Waves</span>
                  <span className="text-yellow-400 font-bold">80% NFT Drop (Epic+)</span>
                </div>
              </div>
            </div>
              </>
            )}

            {activeTab === 'market' && (
              <>
                {/* Market Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Total Sales</p>
                    <p className="text-3xl font-bold text-green-400">{totalSales}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Total Purchases</p>
                    <p className="text-3xl font-bold text-blue-400">{totalPurchases}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Earned</p>
                    <p className="text-3xl font-bold text-yellow-400">{totalEarned.toFixed(3)} SUI</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                    <p className="text-gray-400 text-sm mb-1">Spent</p>
                    <p className="text-3xl font-bold text-purple-400">{totalSpent.toFixed(3)} SUI</p>
                  </div>
                </div>

                {/* Market Transactions */}
                <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                  <h2 className="text-2xl font-bold text-white mb-4">Recent Transactions</h2>

                  {marketTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg mb-4">No marketplace activity yet</p>
                      <Link
                        href="/market"
                        className="inline-block bg-purple-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-600"
                      >
                        Visit Marketplace
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {marketTransactions.map((tx, index) => (
                        <div
                          key={tx.id + index}
                          className="bg-gray-900 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                              tx.type === 'sold' 
                                ? 'bg-green-500/20 text-green-400'
                                : tx.type === 'bought'
                                ? 'bg-blue-500/20 text-blue-400'
                                : tx.type === 'listed'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {tx.type === 'sold' ? '💰' : tx.type === 'bought' ? '🛒' : tx.type === 'listed' ? '🏷️' : '❌'}
                            </div>

                            <div>
                              <p className="text-white font-bold">
                                {tx.type === 'sold' && 'Tower Sold'}
                                {tx.type === 'bought' && 'Tower Purchased'}
                                {tx.type === 'listed' && 'Tower Listed'}
                                {tx.type === 'cancelled' && 'Listing Cancelled'}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {new Date(tx.timestamp).toLocaleString()}
                              </p>
                              {tx.buyer && tx.type === 'bought' && (
                                <p className="text-gray-500 text-xs">
                                  From: {tx.seller?.slice(0, 6)}...{tx.seller?.slice(-4)}
                                </p>
                              )}
                              {tx.buyer && tx.type === 'sold' && (
                                <p className="text-gray-500 text-xs">
                                  To: {tx.buyer.slice(0, 6)}...{tx.buyer.slice(-4)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            {tx.type !== 'cancelled' && (
                              <>
                                <p className={`font-bold text-lg ${
                                  tx.type === 'sold' ? 'text-green-400' : 
                                  tx.type === 'bought' ? 'text-red-400' : 
                                  'text-yellow-400'
                                }`}>
                                  {tx.type === 'sold' && `+${tx.price.toFixed(3)} SUI`}
                                  {tx.type === 'bought' && `-${tx.price.toFixed(3)} SUI`}
                                  {tx.type === 'listed' && `${tx.price.toFixed(3)} SUI`}
                                </p>
                                <p className="text-gray-400 text-sm">
                                  {tx.type === 'listed' ? 'Listed Price' : 'Sale Price'}
                                </p>
                              </>
                            )}
                            {tx.type === 'cancelled' && (
                              <p className="text-gray-500 font-bold">Cancelled</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Net Profit */}
                {marketTransactions.length > 0 && (
                  <div className="mt-8 bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-4">💎 Trading Summary</h2>
                    <div className="bg-gray-900 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-300 text-lg">Total Earned:</span>
                        <span className="text-green-400 font-bold text-xl">+{totalEarned.toFixed(3)} SUI</span>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-300 text-lg">Total Spent:</span>
                        <span className="text-red-400 font-bold text-xl">-{totalSpent.toFixed(3)} SUI</span>
                      </div>
                      <div className="border-t border-gray-700 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold text-xl">Net Profit:</span>
                          <span className={`font-bold text-2xl ${
                            totalEarned - totalSpent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {totalEarned - totalSpent >= 0 ? '+' : ''}{(totalEarned - totalSpent).toFixed(3)} SUI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
