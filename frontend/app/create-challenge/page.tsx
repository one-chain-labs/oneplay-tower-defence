'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';
import { networks, useI18n } from '../providers';

interface MonsterNFT {
  id: string;
  hp: number;
  speed: number;
  monsterType: number;
  rarity: number;
}

const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const TYPE_EMOJI = ['', '👹', '⚡', '🛡️'];
const NETWORK_RPC = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as keyof typeof networks;
const NETWORK_RPC_URL = networks[NETWORK_RPC].url;
export default function CreateChallengePage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useI18n();

  const RARITY_NAMES = ['', t('Common'), t('Rare'), t('Epic'), t('Legendary')];
  const TYPE_NAMES = ['', t('Normal'), t('Fast'), t('Tank')];

  const [myMonsters, setMyMonsters] = useState<MonsterNFT[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<MonsterNFT | null>(null);
  const [prizePool, setPrizePool] = useState('');
  const [entryFee, setEntryFee] = useState('');
  const [maxWinners, setMaxWinners] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user's monsters
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

      setMyMonsters(monsters);
    }
  }, [ownedMonsters]);

  const handleCreateChallenge = async () => {
    if (!account || !selectedMonster) {
      setMessage(t('Please select a monster'));
      return;
    }

    const prize = parseFloat(prizePool);
    const fee = parseFloat(entryFee);
    const winners = parseInt(maxWinners);

    if (isNaN(prize) || prize <= 0) {
      setMessage(t('Please enter a valid prize pool'));
      return;
    }

    if (isNaN(fee) || fee <= 0) {
      setMessage(t('Please enter a valid entry fee'));
      return;
    }

    if (isNaN(winners) || winners <= 0) {
      setMessage(t('Please enter a valid max winners'));
      return;
    }

    setLoading(true);
    const tx = new Transaction();
    
    // Get GAME token
    const gameCoinsResponse = await fetch(NETWORK_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', 
        id: 1,
        method: 'suix_getCoins',
        params: [account.address, `${PACKAGE_ID}::game::GAME`],
      }),
    });
    const gameCoinsData = await gameCoinsResponse.json();
    const gameCoin = gameCoinsData.result?.data[0];
    
    if (!gameCoin) {
      setMessage(t('No GAME tokens found!'));
      setLoading(false);
      return;
    }
    
    const [prizeCoin] = tx.splitCoins(tx.object(gameCoin.coinObjectId), [prize * 1_000_000_000]);
    
    tx.moveCall({
      target: `${PACKAGE_ID}::game::create_challenge`,
      arguments: [
        tx.object(selectedMonster.id),
        prizeCoin,
        tx.pure.u64(fee * 1_000_000_000),
        tx.pure.u64(winners),
      ],
    });

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          setMessage(`${t('Challenge created! Prize:')} ${prize} GAME, ${t('Entry:')} ${fee} GAME`);
          setLoading(false);
          setSelectedMonster(null);
          setPrizePool('');
          setEntryFee('');
          setMaxWinners('');
          setTimeout(() => {
            window.location.href = '/challenge-list';
          }, 2000);
        },
        onError: (error: any) => {
          setMessage(`${t('Error: ')}${error.message}`);
          setLoading(false);
        },
      }
    );
  };

  const estimatedProfit = () => {
    const prize = parseFloat(prizePool) || 0;
    const fee = parseFloat(entryFee) || 0;
    const winners = parseInt(maxWinners) || 0;
    
    if (winners === 0) return 0;
    
    const totalFees = fee * winners;
    const totalPayout = prize;
    return totalFees - totalPayout;
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-4xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">{t('Create Challenge')}</h1>
          <Link
            href="/challenges"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            {t('Back')}
          </Link>
        </div>

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-6">
            <p className="text-white">{message}</p>
          </div>
        )}

        {!account && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 text-center">
            <p className="text-white text-lg">{t('Please connect your wallet')}</p>
          </div>
        )}

        {account && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Select Monster */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">{t('Select Monster')}</h2>

              {myMonsters.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">{t('No monsters available')}</p>
                  <Link
                    href="/challenges"
                    className="inline-block bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600"
                  >
                    {t('Mint Monster')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {myMonsters.map((monster) => (
                    <div
                      key={monster.id}
                      onClick={() => setSelectedMonster(monster)}
                      className={`bg-gray-900 rounded-lg p-4 cursor-pointer border-2 transition-all ${
                        selectedMonster?.id === monster.id
                          ? 'border-blue-500'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{TYPE_EMOJI[monster.monsterType]}</span>
                          <span className={`font-bold ${RARITY_COLORS[monster.rarity]}`}>
                            {RARITY_NAMES[monster.rarity]}
                          </span>
                        </div>
                        {selectedMonster?.id === monster.id && (
                          <span className="text-blue-400">✓</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">{t('Type:')}</span>
                          <span className="text-white ml-2">{TYPE_NAMES[monster.monsterType]}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">{t('HP')}</span>
                          <span className="text-white ml-2">{monster.hp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Challenge Settings */}
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">{t('Challenge Settings')}</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('Initial Prize Pool (GAME):')}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="1.0"
                    className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl border-2 border-gray-700 focus:border-blue-500 outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">{t('Your initial investment')}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('Entry Fee (GAME):')}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="0.1"
                    className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl border-2 border-gray-700 focus:border-blue-500 outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">{t('Players pay this to play')}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('Max Winners:')}</label>
                  <input
                    type="number"
                    min="1"
                    value={maxWinners}
                    onChange={(e) => setMaxWinners(e.target.value)}
                    placeholder="10"
                    className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl border-2 border-gray-700 focus:border-blue-500 outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">{t('How many can win')}</p>
                </div>

                {prizePool && entryFee && maxWinners && (
                  <div className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700">
                    <h3 className="text-white font-bold mb-2">{t('Economics:')}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Your Investment:')}</span>
                        <span className="text-red-400">-{prizePool} GAME</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Max Entry Fees:')}</span>
                        <span className="text-green-400">+{(parseFloat(entryFee) * parseInt(maxWinners)).toFixed(3)} GAME</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('Reward per Winner:')}</span>
                        <span className="text-yellow-400">{(parseFloat(prizePool) / parseInt(maxWinners)).toFixed(3)} GAME</span>
                      </div>
                      <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                        <span className="text-white font-bold">{t('Est. Profit:')}</span>
                        <span className={`font-bold ${estimatedProfit() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {estimatedProfit() >= 0 ? '+' : ''}{estimatedProfit().toFixed(3)} GAME
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateChallenge}
                  disabled={loading || !selectedMonster || !prizePool || !entryFee || !maxWinners}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                >
                  {loading ? t('Creating...') : t('Create Challenge')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-yellow-500/20 border border-yellow-500 rounded-xl p-4">
          <h3 className="text-yellow-400 font-bold mb-2">{t('How it works:')}</h3>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>{t('Your monster will be locked in the challenge')}</li>
            <li>{t('Players pay entry fee to play your challenge')}</li>
            <li>{t('If they win, they get: Prize Pool / Max Winners')}</li>
            <li>{t('If they lose, entry fee stays in pool')}</li>
            <li>{t('You profit if many players fail!')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
