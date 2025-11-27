'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, GAME_STATE_ID, MINT_COST } from '@/lib/constants';
import Link from 'next/link';

interface MonsterNFT {
  id: string;
  hp: number;
  speed: number;
  monsterType: number;
  rarity: number;
}

interface Challenge {
  id: string;
  creator: string;
  monsterId: string;
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

export default function ChallengesPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [myMonsters, setMyMonsters] = useState<MonsterNFT[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMintCard, setShowMintCard] = useState(false);
  const [mintedMonster, setMintedMonster] = useState<MonsterNFT | null>(null);
  const previousMonsterCountRef = useRef(0);

  // Fetch user's monsters
  const { data: ownedMonsters, refetch: refetchMonsters } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || '',
      filter: {
        StructType: `${PACKAGE_ID}::game::MonsterNFT`,
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
    if (ownedMonsters?.data) {
      const monsters: MonsterNFT[] = ownedMonsters.data
        .map((obj: any) => {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject' && content.fields) {
            return {
              id: obj.data.objectId,
              hp: Number(content.fields.hp),
              speed: Number(content.fields.speed),
              monsterType: Number(content.fields.monster_type),
              rarity: Number(content.fields.rarity),
            };
          }
          return null;
        })
        .filter((m): m is MonsterNFT => m !== null);

      // Check if we got a new monster while minting
      if (showMintCard && !mintedMonster && monsters.length > previousMonsterCountRef.current) {
        const newMonster = monsters[0]; // Newest monster
        console.log('New monster detected:', newMonster);
        setMintedMonster(newMonster);
        setMessage('🎉 Monster NFT minted!');
      }

      setMyMonsters(monsters);
    }
  }, [ownedMonsters, showMintCard, mintedMonster]);

  // Mint monster
  const handleMintMonster = () => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    // Save current monster count
    previousMonsterCountRef.current = myMonsters.length;
    console.log('Starting mint, current monster count:', previousMonsterCountRef.current);

    setLoading(true);
    setShowMintCard(true);
    setMintedMonster(null); // Reset
    setMessage('🎰 Minting monster...');
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [MINT_COST * 1_000_000_000]);
    tx.moveCall({
      target: `${PACKAGE_ID}::game::mint_monster`,
      arguments: [
        tx.object(GAME_STATE_ID),
        coin,
      ],
    });

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          console.log('Monster minted successfully');
          setLoading(false);
          setMessage('🎰 Opening mystery box...');
          
          // Trigger refetch
          refetchMonsters();
        },
        onError: (error: any) => {
          setMessage(`❌ Error: ${error.message}`);
          setLoading(false);
          setShowMintCard(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">👹 Monster & Challenges</h1>
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

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6">
            <p className="text-white">{message}</p>
          </div>
        )}

        {/* Mint Monster */}
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">🎁 Mint Monster NFT</h2>
          <p className="text-gray-300 mb-4">
            Create your own monster to build custom challenges!
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-gray-400 text-sm">👹 Normal</p>
              <p className="text-white text-xs">Balanced HP & Speed</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-blue-400 text-sm">⚡ Fast</p>
              <p className="text-white text-xs">Low HP, High Speed</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-purple-400 text-sm">🛡️ Tank</p>
              <p className="text-white text-xs">High HP, Low Speed</p>
            </div>
          </div>

          <button
            onClick={handleMintMonster}
            disabled={!account || loading}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 disabled:opacity-50"
          >
            {loading ? 'Minting...' : `Mint Monster (${MINT_COST} SUI)`}
          </button>
        </div>

        {/* My Monsters */}
        <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            👾 My Monsters ({myMonsters.length})
          </h2>

          {myMonsters.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-4">No monsters yet</p>
              <p className="text-gray-500">Mint your first monster!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myMonsters.map((monster) => (
                <div
                  key={monster.id}
                  className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{TYPE_EMOJI[monster.monsterType]}</span>
                      <span className={`font-bold ${RARITY_COLORS[monster.rarity]}`}>
                        {RARITY_NAMES[monster.rarity]}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white font-bold">{TYPE_NAMES[monster.monsterType]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">❤️ HP:</span>
                      <span className="text-white font-bold">{monster.hp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">⚡ Speed:</span>
                      <span className="text-white font-bold">{monster.speed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mint Card Modal */}
        {showMintCard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-red-900 to-orange-900 rounded-2xl p-8 border-4 border-yellow-500 max-w-md w-full mx-4">
              <h2 className="text-3xl font-bold text-white text-center mb-6">
                🎁 Monster Box
              </h2>
              
              {!mintedMonster ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl animate-bounce flex items-center justify-center">
                    <span className="text-6xl">📦</span>
                  </div>
                  <p className="text-white text-xl font-bold">Opening box...</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-xl flex items-center justify-center">
                    <span className="text-6xl">{TYPE_EMOJI[mintedMonster.monsterType]}</span>
                  </div>
                  <p className={`text-3xl font-bold mb-2 ${RARITY_COLORS[mintedMonster.rarity]}`}>
                    {RARITY_NAMES[mintedMonster.rarity]}
                  </p>
                  <p className="text-white text-xl mb-4">{TYPE_NAMES[mintedMonster.monsterType]} Monster!</p>
                  
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">❤️ HP:</span>
                        <span className="text-white font-bold">{mintedMonster.hp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">⚡ Speed:</span>
                        <span className="text-white font-bold">{mintedMonster.speed}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowMintCard(false);
                      setMintedMonster(null);
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
    </div>
  );
}
