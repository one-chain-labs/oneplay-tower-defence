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

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const RARITY_BG = ['', 'bg-gray-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];

export default function MyTowersPage() {
  const account = useCurrentAccount();
  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);

  // Fetch user's tower NFTs
  const { data: ownedObjects } = useSuiClientQuery(
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
      
      setMyTowers(towers);
    }
  }, [ownedObjects]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/town" className="text-cyan-300 hover:text-cyan-200 font-bold">
            ← Back to Town
          </Link>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-2xl p-6 border-2 border-blue-400 backdrop-blur-sm">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent mb-6">
            🎒 My Tower Collection
          </h1>

          {!account ? (
            <div className="text-center py-12">
              <p className="text-cyan-200 text-lg">Please connect your wallet to view your towers</p>
            </div>
          ) : myTowers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cyan-200 text-lg mb-4">You don't have any towers yet</p>
              <Link href="/" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform inline-block">
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
          )}
        </div>
      </div>
    </div>
  );
}
