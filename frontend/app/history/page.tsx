'use client';

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

export default function HistoryPage() {
  const account = useCurrentAccount();

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
      </div>
    </div>
  );
}
