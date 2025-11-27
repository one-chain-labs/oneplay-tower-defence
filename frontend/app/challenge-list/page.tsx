'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  creator: string;
  monsterHp: number;
  monsterSpeed: number;
  monsterType: number;
  monsterRarity: number;
  prizePool: number;
  entryFee: number;
  maxWinners: number;
  currentWinners: number;
}

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const TYPE_NAMES = ['', 'Normal', 'Fast', 'Tank'];
const TYPE_EMOJI = ['', '👹', '⚡', '🛡️'];

export default function ChallengeListPage() {
  const account = useCurrentAccount();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallengeIds, setActiveChallengeIds] = useState<Set<string>>(new Set());

  // Fetch challenge events
  const { data: createdEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::ChallengeCreatedEvent`,
      },
      limit: 100,
    },
    {
      refetchInterval: 3000,
    }
  );

  // Calculate active challenges
  useEffect(() => {
    const active = new Set<string>();

    createdEvents?.data?.forEach((event: any) => {
      const challengeId = event.parsedJson?.challenge_id;
      if (challengeId) {
        active.add(challengeId);
      }
    });

    setActiveChallengeIds(active);
  }, [createdEvents]);

  // Fetch challenge objects
  useEffect(() => {
    const fetchChallenges = async () => {
      if (activeChallengeIds.size === 0) {
        setChallenges([]);
        return;
      }

      try {
        const challengePromises = Array.from(activeChallengeIds).map(async (id) => {
          try {
            const response = await fetch('https://fullnode.testnet.sui.io:443', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sui_getObject',
                params: [
                  id,
                  {
                    showContent: true,
                  },
                ],
              }),
            });

            const data = await response.json();
            const content = data.result?.data?.content;

            if (content?.dataType === 'moveObject' && content.fields) {
              const monsterFields = content.fields.monster?.fields;
              if (monsterFields) {
                return {
                  id,
                  creator: content.fields.creator,
                  monsterHp: Number(monsterFields.hp),
                  monsterSpeed: Number(monsterFields.speed),
                  monsterType: Number(monsterFields.monster_type),
                  monsterRarity: Number(monsterFields.rarity),
                  prizePool: Number(content.fields.prize_pool) / 1_000_000_000,
                  entryFee: Number(content.fields.entry_fee) / 1_000_000_000,
                  maxWinners: Number(content.fields.max_winners),
                  currentWinners: Number(content.fields.current_winners),
                };
              }
            }
          } catch (error) {
            console.error('Error fetching challenge:', id, error);
          }
          return null;
        });

        const results = await Promise.all(challengePromises);
        const validChallenges = results.filter((c): c is Challenge => c !== null);
        setChallenges(validChallenges);
      } catch (error) {
        console.error('Error fetching challenges:', error);
      }
    };

    fetchChallenges();
  }, [activeChallengeIds]);

  const handlePlayChallenge = (challenge: Challenge) => {
    router.push(`/play-challenge?id=${challenge.id}&hp=${challenge.monsterHp}&speed=${challenge.monsterSpeed}&type=${challenge.monsterType}&fee=${challenge.entryFee}`);
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">🎯 Active Challenges</h1>
          <div className="flex gap-4">
            <Link
              href="/create-challenge"
              className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 font-bold"
            >
              Create Challenge
            </Link>
            <Link
              href="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              ← Back to Town
            </Link>
          </div>
        </div>

        {!account && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center mb-6">
            <p className="text-white text-lg">Please connect your wallet to view challenges</p>
          </div>
        )}

        {account && (
          <>
            <div className="mb-6">
              <p className="text-gray-400">
                {challenges.length} active challenge{challenges.length !== 1 ? 's' : ''}
              </p>
            </div>

            {challenges.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">No active challenges</p>
                <Link
                  href="/create-challenge"
                  className="inline-block bg-purple-500 text-white px-6 py-3 rounded-xl hover:bg-purple-600 font-bold"
                >
                  Create First Challenge
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map((challenge) => {
                  const isFull = challenge.currentWinners >= challenge.maxWinners;
                  const rewardPerWinner = challenge.prizePool / challenge.maxWinners;
                  const roi = ((rewardPerWinner / challenge.entryFee) * 100).toFixed(0);

                  return (
                    <div
                      key={challenge.id}
                      className={`bg-gray-800 rounded-xl p-6 border-2 ${
                        isFull ? 'border-red-500 opacity-60' : 'border-gray-700 hover:border-blue-500'
                      } transition-all`}
                    >
                      {/* Monster Info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{TYPE_EMOJI[challenge.monsterType]}</span>
                          <div>
                            <p className={`font-bold ${RARITY_COLORS[challenge.monsterRarity]}`}>
                              {RARITY_NAMES[challenge.monsterRarity]}
                            </p>
                            <p className="text-gray-400 text-sm">{TYPE_NAMES[challenge.monsterType]}</p>
                          </div>
                        </div>
                        {isFull && (
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            FULL
                          </span>
                        )}
                      </div>

                      {/* Monster Stats */}
                      <div className="bg-gray-900 rounded-lg p-3 mb-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400">❤️ HP:</span>
                            <span className="text-white ml-2 font-bold">{challenge.monsterHp}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">⚡ Speed:</span>
                            <span className="text-white ml-2 font-bold">{challenge.monsterSpeed}</span>
                          </div>
                        </div>
                      </div>

                      {/* Challenge Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Entry Fee:</span>
                          <span className="text-yellow-400 font-bold">{challenge.entryFee} SUI</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Reward:</span>
                          <span className="text-green-400 font-bold">{rewardPerWinner.toFixed(3)} SUI</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">ROI:</span>
                          <span className={`font-bold ${parseFloat(roi) > 100 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Winners:</span>
                          <span className="text-white font-bold">
                            {challenge.currentWinners} / {challenge.maxWinners}
                          </span>
                        </div>
                      </div>

                      {/* Creator */}
                      <div className="mb-4">
                        <p className="text-gray-500 text-xs">
                          By: {challenge.creator.slice(0, 6)}...{challenge.creator.slice(-4)}
                        </p>
                      </div>

                      {/* Play Button */}
                      <button
                        onClick={() => handlePlayChallenge(challenge)}
                        disabled={isFull}
                        className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFull ? 'Challenge Full' : `Play (${challenge.entryFee} SUI)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
