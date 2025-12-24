'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';
import {networks, useI18n} from '../providers';

interface Listing {
  id: string;
  towerId: string;
  seller: string;
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

export default function MarketplacePage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeListingIds, setActiveListingIds] = useState<Set<string>>(new Set());

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
      refetchInterval: 3000,
    }
  );

  // Calculate active listings
  useEffect(() => {
    console.log('Listed events:', listedEvents);
    console.log('Sold events:', soldEvents);
    console.log('Cancelled events:', cancelledEvents);

    const listed = new Set<string>();
    const removed = new Set<string>();

    // Add all listed
    listedEvents?.data?.forEach((event: any) => {
      console.log('Listed event:', event);
      const listingId = event.parsedJson?.listing_id;
      if (listingId) {
        listed.add(listingId);
      }
    });

    // Remove sold
    soldEvents?.data?.forEach((event: any) => {
      const listingId = event.parsedJson?.listing_id;
      if (listingId) {
        removed.add(listingId);
      }
    });

    // Remove cancelled
    cancelledEvents?.data?.forEach((event: any) => {
      const listingId = event.parsedJson?.listing_id;
      if (listingId) {
        removed.add(listingId);
      }
    });

    // Active = listed - removed
    const active = new Set([...listed].filter(id => !removed.has(id)));
    console.log('Active listing IDs:', active);
    setActiveListingIds(active);
  }, [listedEvents, soldEvents, cancelledEvents]);

  // Fetch listing objects
  useEffect(() => {
    const fetchListings = async () => {
      if (activeListingIds.size === 0) {
        setListings([]);
        return;
      }
 
      try {
        const listingPromises = Array.from(activeListingIds).map(async (id) => {
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
                  seller: content.fields.seller,
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
        const validListings = results.filter((l): l is Listing => l !== null);
        setListings(validListings);
      } catch (error) {
        console.error('Error fetching listings:', error);
      }
    };

    fetchListings();
  }, [activeListingIds]);

  // Get GAME token balance
  const { data: gameCoins } = useSuiClientQuery(
    'getCoins',
    {
      owner: account?.address || '',
      coinType: `${PACKAGE_ID}::game::GAME`,
    },
    {
      enabled: !!account?.address,
    }
  );

  // Buy tower
  const handleBuy = (listing: Listing) => {
    if (!account) {
      setMessage('Please connect wallet first');
      return;
    }

    // Get the first GAME coin object
    const gameCoin = gameCoins?.data[0];
    if (!gameCoin) {
      setMessage('❌ No GAME tokens found!');
      return;
    }

    const gameBalance = gameCoins?.data.reduce((sum, coin) => sum + Number(coin.balance), 0) || 0;
    if (gameBalance < listing.price * 1_000_000_000) {
      setMessage('❌ Not enough GAME tokens!');
      return;
    }

    setLoading(true);
    const tx = new Transaction();
    
    const [coin] = tx.splitCoins(tx.object(gameCoin.coinObjectId), [listing.price * 1_000_000_000]);
    tx.moveCall({
      target: `${PACKAGE_ID}::game::buy_tower`,
      arguments: [
        tx.object(listing.id),
        coin,
      ],
    });

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          setMessage(`🎉 Tower purchased for ${listing.price} GAME!`);
          setLoading(false);
          // Remove from active listings
          setActiveListingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(listing.id);
            return newSet;
          });
        },
        onError: (error: any) => {
          setMessage(`❌ Error: ${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">🏪 Tower Marketplace</h1>
          <div className="flex gap-4">
            <Link
              href="/my-listings"
              className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 font-bold"
            >
              My Listings
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

        {!account && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-white text-lg">Please connect your wallet to view marketplace</p>
          </div>
        )}

        {account && (
          <>
            <div className="mb-6">
              <p className="text-gray-400">
                {listings.length} tower{listings.length !== 1 ? 's' : ''} available
              </p>
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">No towers listed for sale</p>
                <p className="text-gray-500">Be the first to list your tower!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`font-bold text-lg ${RARITY_COLORS[listing.rarity]}`}>
                        {RARITY_NAMES[listing.rarity]}
                      </span>
                      <div className={`w-4 h-4 rounded-full ${RARITY_BG[listing.rarity]}`} />
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">⚔️ Damage:</span>
                        <span className="text-white font-bold">{listing.damage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">🎯 Range:</span>
                        <span className="text-white font-bold">{listing.range}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">⚡ Fire Rate:</span>
                        <span className="text-white font-bold">{listing.fireRate}ms</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400 text-sm">Price:</span>
                        <span className="text-yellow-400 text-2xl font-bold">{listing.price} GAME</span>
                      </div>

                      <div className="mb-3">
                        <p className="text-gray-500 text-xs">
                          Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                        </p>
                      </div>

                      {listing.seller === account.address ? (
                        <div className="bg-gray-700 text-gray-400 px-4 py-3 rounded-xl text-center">
                          {t('Your Listing')}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuy(listing)}
                          disabled={loading}
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 disabled:opacity-50"
                        >
                          {loading ? t('Buying...') : t('Buy Now')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
