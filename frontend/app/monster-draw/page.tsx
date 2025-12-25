'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { mintMonster } from '@/lib/contracts';
import { MINT_COST, PACKAGE_ID, GAME_STATE_ID } from '@/lib/constants';
import Link from 'next/link';
import { useI18n } from '../providers';

interface MonsterNFT {
  id: string;
  hp: number;
  speed: number;
  monsterType: number;
  rarity: number;
}

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
const TYPE_NAMES = ['', 'Normal', 'Fast', 'Tank'];
const TYPE_EMOJI = ['', '👹', '⚡', '🛡️'];

export default function MonsterDrawPage() {
  const { t } = useI18n();
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMintCard, setShowMintCard] = useState(false);
  const [mintedMonster, setMintedMonster] = useState<MonsterNFT | null>(null);
  const previousMonsterCountRef = useRef(0);
  const [myMonsters, setMyMonsters] = useState<MonsterNFT[]>([]);

  // Get GAME token balance
  const { data: gameCoins, refetch: refetchGameBalance } = useSuiClientQuery(
    'getCoins',
    {
      owner: account?.address || '',
      coinType: `${PACKAGE_ID}::game::GAME`,
    },
    {
      enabled: !!account?.address,
      refetchInterval: 3000,
    }
  );

  const gameBalance = gameCoins?.data.reduce((sum, coin) => sum + Number(coin.balance), 0) || 0;
  const gameBalanceFormatted = gameBalance / 1_000_000_000;

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

      if (showMintCard && !mintedMonster && monsters.length > previousMonsterCountRef.current) {
        const newMonster = monsters[0];
        console.log('New monster detected:', newMonster);
        setMintedMonster(newMonster);
        setMessage(t('🎉 Monster NFT minted!'));
      }

      setMyMonsters(monsters);
    }
  }, [ownedMonsters, showMintCard, mintedMonster, t]);

  const handleMint = () => {
    if (!account) {
      setMessage(t('Please connect wallet first'));
      return;
    }

    if (gameBalance < MINT_COST) {
      setMessage(t('❌ Not enough GAME tokens!'));
      return;
    }

    const gameCoin = gameCoins?.data[0];
    if (!gameCoin) {
      setMessage(t('❌ No GAME tokens found!'));
      return;
    }

    previousMonsterCountRef.current = myMonsters.length;
    setLoading(true);
    setShowMintCard(true);
    setMintedMonster(null);
    setMessage(t('🎰 Minting monster...'));
    
    const tx = new Transaction();
    mintMonster(tx, gameCoin.coinObjectId, MINT_COST);

    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: () => {
          console.log('Monster minted successfully');
          setLoading(false);
          setMessage(t('🎰 Opening mystery box...'));
          refetchMonsters();
          refetchGameBalance();
        },
        onError: (error: any) => {
          console.error('Error:', error);
          setMessage(`${t('Error: ')}${error.message}`);
          setLoading(false);
          setShowMintCard(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/town" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
             {t('Back to Town')}
            </Link>
          <Link href="/lucky-draw" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">
             {t('Tower Draw')}
          </Link>
          <Link href="/my-towers" className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">
            {t('My Bag')}
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-yellow-200 mb-4" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.5)'}}>
            {t('Monster Lucky Draw')}
          </h1>
          <p className="text-orange-200 text-lg">{t('Open mystery boxes to get random monster NFTs!')}</p>
        </div>

        {!account ? (
          <div className="bg-gradient-to-b from-red-600 to-red-800 border-4 border-red-900 rounded-2xl p-6 text-center shadow-2xl">
            <p className="text-yellow-100 text-lg font-bold">{t('Connect your wallet to start!')}</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-b from-amber-600 to-amber-800 rounded-2xl p-4 mb-6 border-4 border-amber-950 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-bold">{t('GAME Balance')}</p>
                  <p className="text-yellow-50 text-2xl font-bold">{gameBalanceFormatted.toFixed(2)} GAME</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-200 text-sm font-bold">{t('My Monsters')}</p>
                  <p className="text-yellow-50 text-2xl font-bold">{myMonsters.length}</p>
                </div>
              </div>
            </div>

            {message && (
              <div className="bg-gradient-to-b from-blue-600 to-blue-800 border-4 border-blue-900 rounded-2xl p-4 mb-6 shadow-2xl">
                <p className="text-yellow-100 font-bold text-center">{t(message)}</p>
              </div>
            )}

            <div className="rounded-2xl p-8 border-4 border-yellow-600 shadow-2xl mb-6 relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-90"
                style={{
                  backgroundImage: 'url(/monsterbck.png)',
                }}
              ></div>
              
              <div className="relative z-10">
                <div className="text-center">
                  <div className="mb-6">
                    <img 
                      src="/mst.png"
                      alt={t('Mystery Box')} 
                      className="w-80 h-80 mx-auto drop-shadow-2xl"
                    />
                  </div>
                  
                  <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border-2 border-white/20 mb-6">
                    <h2 className="text-2xl font-bold text-yellow-200 mb-3 drop-shadow-lg">
                      {t('Monster Mystery Box')}
                    </h2>
                    <p className="text-white mb-2 drop-shadow-lg text-lg">
                      {t('Get a random monster with unique abilities!')}
                    </p>
                    <p className="text-yellow-300 font-bold text-xl">
                      {t('Cost:')} {MINT_COST / 1_000_000_000} GAME
                    </p>
                  </div>

                  <button
                    onClick={handleMint}
                    disabled={!account || loading}
                    className="w-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white px-8 py-6 rounded-xl font-bold text-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/50"
                  >
                    {loading ? t('✨ Minting...') : t('Open Mystery Box ({MINT_COST} GAME)').replace('{MINT_COST}', (MINT_COST / 1_000_000_000).toString())}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6 border-2 border-red-400">
              <h3 className="text-2xl font-bold text-red-300 mb-4">{t('How It Works')}</h3>
              <div className="space-y-3 text-orange-100">
                <p>{t('Pay.mint.cost').replace('{MINT_COST}', (MINT_COST / 1_000_000_000).toString())}</p>
                <p>{t('Get a random monster NFT with unique abilities')}</p> 
                <p>{t('Higher rarity = stronger monster')}</p>
                <p>{t('Use monsters to create challenges')}</p>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {showMintCard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 rounded-3xl p-8 border-4 border-yellow-400 max-w-md w-full mx-4 shadow-2xl shadow-red-500/50">
            <h2 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
              {t('Monster Box 🎃')}
            </h2>
            
            {!mintedMonster ? (
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-4 animate-bounce">
                  <img 
                    src="/mst.png" 
                    alt={t('Opening...')}
                    className="w-full h-full drop-shadow-2xl"
                  />
                </div>
                <p className="text-white text-xl font-bold drop-shadow-lg">{t('Opening box...')}</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-2xl flex items-center justify-center">
                  <span className="text-6xl">{TYPE_EMOJI[mintedMonster.monsterType]}</span>
                </div>
                <p className={`text-3xl font-bold mb-2 drop-shadow-lg ${RARITY_COLORS[mintedMonster.rarity]}`}>
                  {t(RARITY_NAMES[mintedMonster.rarity])}
                </p>
                <p className="text-white text-xl mb-4 drop-shadow-lg">{t(TYPE_NAMES[mintedMonster.monsterType])}{t(' Monster!')}</p>
                
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 mb-4 border-2 border-white/20">
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('HP:')}</span>
                      <span className="text-white font-bold">{mintedMonster.hp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('Speed:')}</span>
                      <span className="text-white font-bold">{mintedMonster.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('Type:')}</span>
                      <span className="text-white font-bold">{t(TYPE_NAMES[mintedMonster.monsterType])}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setShowMintCard(false);
                    setMintedMonster(null);
                    setLoading(false);
                    setMessage('');
                  }}
                  className="bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 px-8 py-3 rounded-xl font-bold hover:scale-110 transition-transform shadow-lg"
                >
                  {t('Awesome!')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
