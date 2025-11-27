'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';

interface TowerNFT {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  rarity: number;
}

interface MonsterNFT {
  id: string;
  hp: number;
  speed: number;
  monsterType: number;
  rarity: number;
}

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const RARITY_BG = ['', 'bg-gray-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];
const TYPE_NAMES = ['', 'Normal', 'Fast', 'Tank'];
const TYPE_EMOJI = ['', '👹', '⚡', '🛡️'];

export default function MyTowersPage() {
  const account = useCurrentAccount();
  const [viewType, setViewType] = useState<'tower' | 'monster'>('tower');
  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);
  const [myMonsters, setMyMonsters] = useState<MonsterNFT[]>([]);

  // Fetch user's tower NFTs
  const { data: ownedTowers } = useSuiClientQuery(
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

  // Fetch user's monster NFTs
  const { data: ownedMonsters } = useSuiClientQuery(
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
      
      setMyTowers(towers);
    }
  }, [ownedTowers]);

  useEffect(() => {
    if (ownedMonsters?.data) {
      const monsters: MonsterNFT[] = ownedMonsters.data
        .map((obj: any) => {
          const content = obj.data?.content;
          if (content?.dataType === 'moveObject' && content.fields) {
            const expectedType = `${PACKAGE_ID}::game::MonsterNFT`;
            if (content.type !== expectedType) return null;
            
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
      
      setMyMonsters(monsters);
    }
  }, [ownedMonsters]);

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <Link href="/town" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
              ← Back to Town
            </Link>
          </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 border-2 border-blue-400 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              🎒 My Collection
            </h1>
            
            {/* Toggle Switch */}
            <div className="flex gap-3">
              <button
                onClick={() => setViewType('tower')}
                className={`px-6 py-2 rounded-xl font-bold transition-all ${
                  viewType === 'tower'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                }`}
              >
                🗼 Towers
              </button>
              <button
                onClick={() => setViewType('monster')}
                className={`px-6 py-2 rounded-xl font-bold transition-all ${
                  viewType === 'monster'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                }`}
              >
                👹 Monsters
              </button>
            </div>
          </div>

          {!account ? (
            <div className="text-center py-12">
              <p className="text-cyan-200 text-lg">Please connect your wallet to view your collection</p>
            </div>
          ) : viewType === 'tower' ? (
            myTowers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-cyan-200 text-lg mb-4">You don't have any towers yet</p>
                <Link href="/lucky-draw" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform inline-block">
                  🎁 Mint Your First Tower
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-cyan-200 text-lg">Total Towers: <span className="font-bold text-white">{myTowers.length}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {myTowers.map((tower) => (
                  <div
                    key={tower.id}
                    className="bg-gradient-to-br from-black/40 to-purple-900/40 rounded-xl p-4 border-2 border-purple-500/30 hover:border-purple-400 hover:scale-105 transition-all"
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
                  </div>
                  ))}
                </div>
              </>
            )
          ) : (
            myMonsters.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-cyan-200 text-lg mb-4">You don't have any monsters yet</p>
                <Link href="/monster-draw" className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform inline-block">
                  🎃 Mint Your First Monster
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-cyan-200 text-lg">Total Monsters: <span className="font-bold text-white">{myMonsters.length}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {myMonsters.map((monster) => (
                    <div
                      key={monster.id}
                      className="bg-gradient-to-br from-black/40 to-red-900/40 rounded-xl p-4 border-2 border-red-500/30 hover:border-red-400 hover:scale-105 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{TYPE_EMOJI[monster.monsterType]}</span>
                          <span className={`font-bold ${RARITY_COLORS[monster.rarity]}`}>
                            {RARITY_NAMES[monster.rarity]}
                          </span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${RARITY_BG[monster.rarity]}`} />
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
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <span className="text-gray-500 text-xs">ID: {monster.id.slice(0, 8)}...{monster.id.slice(-6)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
