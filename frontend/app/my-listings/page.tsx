'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';
import { networks, useI18n } from '../providers';

interface TowerNFT {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  rarity: number;
}

interface MyListing {
  id: string;
  towerId: string;
  price: number;
  damage: number;
  range: number;
  fireRate: number;
  rarity: number;
}

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const RARITY_BG = ['', 'bg-gray-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];
const NETWORK_RPC = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as keyof typeof networks;
const NETWORK_RPC_URL = networks[NETWORK_RPC].url;
export default function MyListingsPage() {
  const { t } = useI18n();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [selectedTower, setSelectedTower] = useState<TowerNFT | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user's towers
  const { data: ownedObjects, refetch: refetchTowers } = useSuiClientQuery(
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

  // Fetch listing events
  const { data: listedEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::TowerListedEvent`,
      },
      limit: 100,
    },
    {
      enabled: !!account?.address,
      refetchInterval: 3000,
    }
  );

  const { data: soldEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::TowerSoldEvent`,
      },
      limit: 100,
    },
    {
      enabled: !!account?.address,
      refetchInterval: 3000,
    }
  );

  const { data: cancelledEvents } = useSuiClientQuery(
    'queryEvents',
    {
      query: {
        MoveEventType: `${PACKAGE_ID}::game::ListingCancelledEvent`,
      },
      limit: 100,
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

  // Fetch user's listings
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!account) {
        setMyListings([]);
        return;
      }

      console.log('My address:', account.address);
      console.log('Listed events:', listedEvents);

      // Get user's active listing IDs
      const userListingIds = new Set<string>();
      const removed = new Set<string>();

      // Add user's listings
      listedEvents?.data?.forEach((event: any) => {
        console.log('Event seller:', event.parsedJson?.seller, 'My address:', account.address);
        if (event.parsedJson?.seller === account.address) {
          console.log('Found my listing:', event.parsedJson.listing_id);
          userListingIds.add(event.parsedJson.listing_id);
        }
      });

      // Remove sold
      soldEvents?.data?.forEach((event: any) => {
        if (event.parsedJson?.seller === account.address) {
          removed.add(event.parsedJson.listing_id);
        }
      });

      // Remove cancelled
      cancelledEvents?.data?.forEach((event: any) => {
        if (event.parsedJson?.seller === account.address) {
          removed.add(event.parsedJson.listing_id);
        }
      });

      // Active = listed - removed
      const activeIds = [...userListingIds].filter(id => !removed.has(id));
      console.log('My active listing IDs:', activeIds);

      if (activeIds.length === 0) {
        setMyListings([]);
        return;
      }

      // Fetch listing objects
      try {
        const listingPromises = activeIds.map(async (id) => {
          try {
            const response = await fetch(NETWORK_RPC_URL, {
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
              const towerFields = content.fields.tower?.fields;
              if (towerFields) {
                return {
                  id,
                  towerId: towerFields.id?.id || '',
                  price: Number(content.fields.price) / 1_000_000_000,
                  damage: Number(towerFields.damage),
                  range: Number(towerFields.range),
                  fireRate: Number(towerFields.fire_rate),
                  rarity: Number(towerFields.rarity),
                };
              }
            }
          } catch (error) {
            console.error('Error fetching listing:', id, error);
          }
          return null;
        });

        const results = await Promise.all(listingPromises);
        const validListings = results.filter((l): l is MyListing => l !== null);
        setMyListings(validListings);
      } catch (error) {
        console.error('Error fetching user listings:', error);
      }
    };

    fetchUserListings();
  }, [listedEvents, soldEvents, cancelledEvents, account]);

  // List tower for sale
  const handleListTower = () => {
    if (!account || !selectedTower) {
      setMessage(t('Please select a tower'));
      return;
    }

    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      setMessage(t('Please enter a valid price'));
      return;
    }

    setLoading(true);
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::game::list_tower`,
      arguments: [
        tx.object(selectedTower.id),
        tx.pure.u64(price * 1_000_000_000),
      ],
    });

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          setMessage(t('Tower listed for {price} GAME!').replace('{price}', price.toString()));
          setLoading(false);
          setSelectedTower(null);
          setListPrice('');
          refetchTowers();
        },
        onError: (error: any) => {
          setMessage(`${t('Error: ')}${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  // Cancel listing
  const handleCancelListing = (listingId: string) => {
    if (!account) return;

    setLoading(true);
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::game::cancel_listing`,
      arguments: [tx.object(listingId)],
    });

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          setMessage(t('Listing cancelled'));
          setLoading(false);
          refetchTowers();
        },
        onError: (error: any) => {
          setMessage(`${t('Error: ')}${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">{t('My Listings')}</h1>
          <div className="flex gap-4">
            <Link
              href="/market"
              className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 font-bold"
            >
              {t('Marketplace')}
            </Link>
            <Link
              href="/"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              {t('Back to Town')}
            </Link>
          </div>
        </div>

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6">
            <p className="text-white">{t(message)}</p>
          </div>
        )}

        {!account && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-white text-lg">{t('Please connect your wallet')}</p>
          </div>
        )}

        {account && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List New Tower */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">{t('List Tower for Sale')}</h2>

              <div className="mb-4">
                <label className="text-gray-400 text-sm mb-2 block">{t('Select Tower:')}</label>
                {myTowers.length === 0 ? (
                  <p className="text-gray-500">{t('No towers available to list')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {myTowers.map((tower) => (
                      <div
                        key={tower.id}
                        onClick={() => setSelectedTower(tower)}
                        className={`bg-gray-900 rounded-lg p-3 cursor-pointer border-2 transition-all ${
                          selectedTower?.id === tower.id
                            ? 'border-blue-500'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-sm ${RARITY_COLORS[tower.rarity]}`}>
                            {t(RARITY_NAMES[tower.rarity])}
                          </span>
                          <div className={`w-3 h-3 rounded-full ${RARITY_BG[tower.rarity]}`} />
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('DMG:')}</span>
                            <span className="text-white">{tower.damage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('RNG:')}</span>
                            <span className="text-white">{tower.range}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTower && (
                <>
                  <div className="mb-4">
                    <label className="text-gray-400 text-sm mb-2 block">{t('Price (GAME):')}</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                      placeholder="0.1"
                      className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl border-2 border-gray-700 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <button
                    onClick={handleListTower}
                    disabled={loading || !listPrice}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                  >
                    {loading ? t('Listing...') : t('List for Sale')}
                  </button>
                </>
              )}
            </div>

            {/* Active Listings */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">
                {t('Active Listings ({count})').replace('{count}', myListings.length.toString())}
              </h2>

              {myListings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">{t('No active listings')}</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {myListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-bold ${RARITY_COLORS[listing.rarity]}`}>
                          {t(RARITY_NAMES[listing.rarity])}
                        </span>
                        <span className="text-yellow-400 font-bold">{listing.price} GAME</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">{t('Damage')}</p>
                          <p className="text-white font-bold">{listing.damage}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{t('Range')}</p>
                          <p className="text-white font-bold">{listing.range}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">{t('Fire Rate')}</p>
                          <p className="text-white font-bold">{listing.fireRate}ms</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        disabled={loading}
                        className="w-full bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 disabled:opacity-50"
                      >
                        {t('Cancel Listing')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
