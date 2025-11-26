'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';

interface Tower {
  id: string;
  x: number;
  y: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFire: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
}

interface TowerNFT {
  id: string;
  damage: number;
  range: number;
  fireRate: number;
  rarity: number;
}

const GAME_PATH = [
  { x: 0, y: 250 },
  { x: 200, y: 250 },
  { x: 200, y: 100 },
  { x: 400, y: 100 },
  { x: 400, y: 400 },
  { x: 600, y: 400 },
  { x: 600, y: 200 },
  { x: 800, y: 200 },
];

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

function PlayChallengeContent() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('id');
  const monsterHp = Number(searchParams.get('hp')) || 50;
  const monsterSpeed = Number(searchParams.get('speed')) / 100 || 1.5; // Convert to game speed
  const monsterType = Number(searchParams.get('type')) || 1;
  const entryFee = Number(searchParams.get('fee')) || 0.1;

  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);
  const [selectedTower, setSelectedTower] = useState<TowerNFT | null>(null);
  const [message, setMessage] = useState('Select a tower to start!');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const gameStateRef = useRef({
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    lives: 10,
    gameOver: false,
    victory: false,
    enemiesSpawned: 0,
    totalEnemies: 20,
  });

  const [, forceUpdate] = useState(0);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [availableCards, setAvailableCards] = useState([
    { id: 1, used: false },
    { id: 2, used: false },
    { id: 3, used: false },
    { id: 4, used: false },
    { id: 5, used: false },
  ]);

  // Fetch user's towers
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
    }
  );

  useEffect(() => {
    if (ownedTowers?.data) {
      const towers: TowerNFT[] = ownedTowers.data
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
  }, [ownedTowers]);

  const handleSelectTower = (tower: TowerNFT) => {
    setSelectedTower(tower);
    setMessage('Tower selected! Click cards and place towers on the map.');
  };

  const handleStartGame = () => {
    if (!selectedTower) {
      setMessage('Please select a tower first!');
      return;
    }
    setMessage('Game started! Place your towers!');
    startSpawning();
  };

  const startSpawning = () => {
    const state = gameStateRef.current;
    state.enemiesSpawned = 0;
    
    const spawnInterval = setInterval(() => {
      if (state.enemiesSpawned >= state.totalEnemies || state.gameOver || state.victory) {
        clearInterval(spawnInterval);
        return;
      }

      const enemy: Enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        x: GAME_PATH[0].x,
        y: GAME_PATH[0].y,
        hp: monsterHp,
        maxHp: monsterHp,
        speed: monsterSpeed,
        pathIndex: 0,
      };

      state.enemies.push(enemy);
      state.enemiesSpawned++;
    }, 1000);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTower || !selectedCard) {
      setMessage('Select a tower card first!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on path
    const onPath = GAME_PATH.some(point => {
      const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
      return dist < 40;
    });

    if (onPath) {
      setMessage('Cannot place tower on the path!');
      return;
    }

    const tower: Tower = {
      id: `tower-${Date.now()}`,
      x,
      y,
      damage: selectedTower.damage,
      range: selectedTower.range,
      fireRate: selectedTower.fireRate,
      lastFire: 0,
    };

    gameStateRef.current.towers.push(tower);
    
    setAvailableCards(prev =>
      prev.map(card =>
        card.id === selectedCard ? { ...card, used: true } : card
      )
    );
    setSelectedCard(null);
    setMessage(`Tower placed! ${5 - gameStateRef.current.towers.length} slots remaining`);
    forceUpdate(v => v + 1);
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      const state = gameStateRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw path
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 60;
      ctx.beginPath();
      GAME_PATH.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Update and draw enemies
      state.enemies = state.enemies.filter(enemy => {
        if (enemy.hp <= 0) return false;

        const currentPoint = GAME_PATH[enemy.pathIndex];
        const nextPoint = GAME_PATH[enemy.pathIndex + 1];

        if (nextPoint) {
          const dx = nextPoint.x - enemy.x;
          const dy = nextPoint.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < enemy.speed) {
            enemy.pathIndex++;
            if (enemy.pathIndex >= GAME_PATH.length - 1) {
              state.lives--;
              if (state.lives <= 0) {
                state.gameOver = true;
                setMessage('💀 Game Over! Monster reached the end!');
              }
              return false;
            }
          } else {
            enemy.x += (dx / dist) * enemy.speed;
            enemy.y += (dy / dist) * enemy.speed;
          }
        }

        // Draw enemy
        ctx.fillStyle = monsterType === 2 ? '#ff9800' : monsterType === 3 ? '#9c27b0' : '#f44336';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.hp / enemy.maxHp), 4);

        return true;
      });

      // Towers shoot
      const now = Date.now();
      state.towers.forEach(tower => {
        if (now - tower.lastFire < tower.fireRate) return;

        const target = state.enemies.find(enemy => {
          const dist = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2);
          return dist <= tower.range;
        });

        if (target) {
          tower.lastFire = now;
          state.bullets.push({
            id: `bullet-${Date.now()}-${Math.random()}`,
            x: tower.x,
            y: tower.y,
            targetX: target.x,
            targetY: target.y,
            speed: 10,
            damage: tower.damage,
          });
        }
      });

      // Update bullets
      state.bullets = state.bullets.filter(bullet => {
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bullet.speed) {
          const enemy = state.enemies.find(e =>
            Math.sqrt((e.x - bullet.targetX) ** 2 + (e.y - bullet.targetY) ** 2) < 20
          );
          if (enemy) enemy.hp -= bullet.damage;
          return false;
        }

        bullet.x += (dx / dist) * bullet.speed;
        bullet.y += (dy / dist) * bullet.speed;

        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      // Draw towers
      state.towers.forEach(tower => {
        ctx.fillStyle = '#2196f3';
        ctx.fillRect(tower.x - 15, tower.y - 15, 30, 30);
        
        ctx.strokeStyle = '#2196f3';
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Check victory
      if (state.enemiesSpawned >= state.totalEnemies && state.enemies.length === 0 && !state.gameOver) {
        state.victory = true;
        setMessage('🎉 Victory! All monsters defeated!');
      }

      if (!state.gameOver && !state.victory) {
        animationId = requestAnimationFrame(gameLoop);
      }
    };

    gameLoop();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [monsterHp, monsterSpeed, monsterType]);

  const handleSubmitResult = () => {
    if (!account || !challengeId) return;

    const state = gameStateRef.current;
    const success = state.victory;

    setSubmitting(true);
    const tx = new Transaction();
    
    const [coin] = tx.splitCoins(tx.gas, [entryFee * 1_000_000_000]);
    
    tx.moveCall({
      target: `${PACKAGE_ID}::game::play_challenge`,
      arguments: [
        tx.object(challengeId),
        coin,
        tx.pure.bool(success),
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitted(true);
          if (success) {
            setMessage('🎉 Challenge completed! Reward sent to your wallet!');
          } else {
            setMessage('💀 Challenge failed. Entry fee forfeited.');
          }
          setSubmitting(false);
        },
        onError: (error) => {
          setMessage(`❌ Error: ${error.message}`);
          setSubmitting(false);
        },
      }
    );
  };

  const state = gameStateRef.current;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">⚔️ Challenge Mode</h1>
          <Link href="/challenge-list" className="bg-gray-700 text-white px-4 py-2 rounded-xl hover:bg-gray-600">
            ← Back
          </Link>
        </div>

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-3 mb-4">
            <p className="text-white text-sm">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onClick={handleCanvasClick}
              className="w-full border-4 border-gray-700 rounded-xl bg-gray-900 cursor-crosshair"
            />
          </div>

          <div className="space-y-4">
            {/* Monster Info */}
            <div className="bg-gray-800 rounded-xl p-4 border-2 border-red-500">
              <h3 className="text-white font-bold mb-2">👹 Monster</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">HP: <span className="text-red-400 font-bold">{monsterHp}</span></p>
                <p className="text-gray-400">Speed: <span className="text-blue-400 font-bold">{(monsterSpeed * 100).toFixed(0)}</span></p>
                <p className="text-gray-400">Count: <span className="text-white font-bold">20</span></p>
              </div>
            </div>

            {/* Tower Selection */}
            {!selectedTower && myTowers.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border-2 border-blue-500">
                <h3 className="text-white font-bold mb-2">Select Tower:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myTowers.map(tower => (
                    <div
                      key={tower.id}
                      onClick={() => handleSelectTower(tower)}
                      className="bg-gray-900 rounded p-2 cursor-pointer hover:bg-gray-700 border border-gray-700"
                    >
                      <p className={`text-xs font-bold ${RARITY_COLORS[tower.rarity]}`}>
                        {RARITY_NAMES[tower.rarity]}
                      </p>
                      <p className="text-xs text-gray-400">DMG: {tower.damage} | RNG: {tower.range}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTower && (
              <>
                {/* Tower Cards */}
                <div className="bg-gray-800 rounded-xl p-4 border-2 border-gray-700">
                  <h3 className="text-white font-bold mb-2">🗼 Tower Cards</h3>
                  <div className="grid grid-cols-5 gap-1">
                    {availableCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => !card.used && setSelectedCard(card.id)}
                        disabled={card.used}
                        className={`aspect-square rounded text-xl ${
                          card.used
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : selectedCard === card.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        {card.used ? '✓' : '🗼'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-gray-800 rounded-xl p-4 border-2 border-gray-700">
                  <h3 className="text-white font-bold mb-2">📊 Stats</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-white">Lives: ❤️ {state.lives}</p>
                    <p className="text-white">Towers: {state.towers.length}/5</p>
                    <p className="text-white">Enemies: {state.enemies.length}</p>
                    <p className="text-white">Spawned: {state.enemiesSpawned}/20</p>
                  </div>
                </div>

                {!state.gameOver && !state.victory && state.enemiesSpawned === 0 && (
                  <button
                    onClick={handleStartGame}
                    disabled={state.towers.length === 0}
                    className="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.towers.length === 0 ? 'Place towers first!' : 'Start Wave'}
                  </button>
                )}

                {(state.gameOver || state.victory) && !submitted && (
                  <button
                    onClick={handleSubmitResult}
                    disabled={submitting}
                    className="w-full bg-yellow-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : `Submit (${entryFee} SUI)`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <PlayChallengeContent />
    </Suspense>
  );
}
