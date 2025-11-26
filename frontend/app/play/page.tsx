'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { playAndSubmit } from '@/lib/contracts';
import { GAME_COST } from '@/lib/constants';
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
  type: 'normal' | 'fast' | 'tank';
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  color: string;
}

interface HitEffect {
  id: string;
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
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

const ENEMY_TYPES = {
  normal: { hp: 50, speed: 1.5, color: '#f44336' },
  fast: { hp: 30, speed: 3, color: '#ff9800' },
  tank: { hp: 150, speed: 0.8, color: '#9c27b0' },
};

function getWaveEnemies(wave: number) {
  const waves = [
    [{ type: 'normal' as const, count: 10 }],
    [{ type: 'normal' as const, count: 15 }],
    [{ type: 'normal' as const, count: 10 }, { type: 'fast' as const, count: 5 }],
    [{ type: 'normal' as const, count: 15 }, { type: 'fast' as const, count: 5 }],
    [
      { type: 'normal' as const, count: 10 },
      { type: 'fast' as const, count: 5 },
      { type: 'tank' as const, count: 3 },
    ],
  ];
  return waves[wave - 1] || [];
}

// Get NFT drop chance based on waves cleared
function getNFTDropChance(wavesCleared: number): number {
  if (wavesCleared >= 5) return 80;
  if (wavesCleared >= 4) return 50;
  if (wavesCleared >= 3) return 30;
  if (wavesCleared >= 2) return 20;
  return 0;
}

// Generate reward tower stats (simulating Move contract logic)
function generateRewardTower(wavesCleared: number) {
  const random = Math.random();
  
  // Determine rarity based on waves
  let rarity: number;
  let rarityName: string;
  
  if (wavesCleared >= 5) {
    // Wave 5: 50% Epic, 50% Legendary
    if (random < 0.5) {
      rarity = 3;
      rarityName = 'Epic';
    } else {
      rarity = 4;
      rarityName = 'Legendary';
    }
  } else if (wavesCleared >= 4) {
    // Wave 4: 30% Rare, 50% Epic, 20% Legendary
    if (random < 0.3) {
      rarity = 2;
      rarityName = 'Rare';
    } else if (random < 0.8) {
      rarity = 3;
      rarityName = 'Epic';
    } else {
      rarity = 4;
      rarityName = 'Legendary';
    }
  } else if (wavesCleared >= 3) {
    // Wave 3: 50% Rare, 50% Epic
    if (random < 0.5) {
      rarity = 2;
      rarityName = 'Rare';
    } else {
      rarity = 3;
      rarityName = 'Epic';
    }
  } else {
    // Wave 1-2: 70% Common, 30% Rare
    if (random < 0.7) {
      rarity = 1;
      rarityName = 'Common';
    } else {
      rarity = 2;
      rarityName = 'Rare';
    }
  }
  
  // Base stats by rarity
  let baseDamage: number, baseRange: number, baseFireRate: number;
  if (rarity === 1) {
    baseDamage = 15;
    baseRange = 100;
    baseFireRate = 1000;
  } else if (rarity === 2) {
    baseDamage = 25;
    baseRange = 120;
    baseFireRate = 900;
  } else if (rarity === 3) {
    baseDamage = 40;
    baseRange = 140;
    baseFireRate = 800;
  } else {
    baseDamage = 60;
    baseRange = 160;
    baseFireRate = 700;
  }
  
  // Add variance
  const damage = baseDamage + Math.floor(Math.random() * 8) + 1;
  const range = baseRange + Math.floor(Math.random() * 20) + 1;
  const fireRate = Math.max(baseFireRate - Math.floor(Math.random() * 200) - 1, 500);
  
  return { damage, range, fireRate, rarity, rarityName };
}

function PlayPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const towerNftId = searchParams.get('tower');
  
  // Get tower NFT stats from URL
  const nftDamage = Number(searchParams.get('damage')) || 30;
  const nftRange = Number(searchParams.get('range')) || 120;
  const nftFireRate = Number(searchParams.get('fireRate')) || 800;
  const nftRarity = Number(searchParams.get('rarity')) || 2;

  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    hitEffects: [] as HitEffect[],
    wave: 1,
    lives: 10,
    isWaveActive: false,
    gameOver: false,
    victory: false,
  });

  const [, forceUpdate] = useState(0);
  const [message, setMessage] = useState('Select a tower card and place it on the map!');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showRewardCard, setShowRewardCard] = useState(false);
  const [rewardResult, setRewardResult] = useState<{ 
    gotReward: boolean; 
    dropChance: number;
    tower?: { damage: number; range: number; fireRate: number; rarity: number; rarityName: string };
  } | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [availableCards, setAvailableCards] = useState([
    { id: 1, used: false },
    { id: 2, used: false },
    { id: 3, used: false },
    { id: 4, used: false },
    { id: 5, used: false },
  ]);

  // Start wave
  const handleStartWave = () => {
    const state = gameStateRef.current;
    if (state.isWaveActive || state.wave > 5 || state.gameOver) return;

    state.isWaveActive = true;
    forceUpdate((n) => n + 1);
    setMessage(`Wave ${state.wave} started!`);

    const waveEnemies = getWaveEnemies(state.wave);
    let enemyId = 0;
    let spawnDelay = 0;

    waveEnemies.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const stats = ENEMY_TYPES[type];
          const newEnemy: Enemy = {
            id: `enemy-${enemyId++}-${Date.now()}`,
            x: GAME_PATH[0].x,
            y: GAME_PATH[0].y,
            hp: stats.hp * state.wave,
            maxHp: stats.hp * state.wave,
            speed: stats.speed,
            pathIndex: 0,
            type,
          };
          state.enemies.push(newEnemy);
        }, spawnDelay);
        spawnDelay += 800;
      }
    });
  };

  // Calculate reward chance and rarity
  const getRewardInfo = (waves: number): { chance: number; rarity: string; color: string } => {
    if (waves >= 5) return { chance: 80, rarity: 'Epic/Legendary', color: 'text-purple-400' };
    if (waves >= 4) return { chance: 50, rarity: 'Rare/Epic', color: 'text-blue-400' };
    if (waves >= 3) return { chance: 30, rarity: 'Rare', color: 'text-blue-400' };
    if (waves >= 2) return { chance: 20, rarity: 'Common/Rare', color: 'text-gray-400' };
    return { chance: 0, rarity: 'None', color: 'text-gray-500' };
  };

  // Submit result to blockchain
  const handleSubmitResult = (wavesCleared: number) => {
    console.log('=== handleSubmitResult called ===');
    console.log('wavesCleared:', wavesCleared);
    console.log('towerNftId:', towerNftId);
    console.log('account:', account?.address);
    console.log('submitting:', submitting);
    console.log('submitted:', submitted);

    if (!account) {
      console.log('No account connected');
      setMessage('❌ Please connect wallet to submit result');
      return;
    }

    if (submitting || submitted) {
      console.log('Already submitted or submitting');
      setMessage('⚠️ Result already submitted!');
      return;
    }

    const dropChance = getNFTDropChance(wavesCleared);

    // If no towerNftId, save locally (test mode)
    if (!towerNftId) {
      console.log('Test mode - saving locally');
      const rewardText = dropChance > 0 
        ? `${dropChance}% chance for NFT Tower!` 
        : 'No reward (need 2+ waves)';
      setMessage(`🎮 Game completed! Cleared ${wavesCleared} waves. ${rewardText} (Test mode)`);
      
      // Save to localStorage for history
      const localHistory = JSON.parse(localStorage.getItem('gameHistory') || '[]');
      localHistory.unshift({
        wavesCleared,
        reward: 0, // No actual reward in test mode
        timestamp: Date.now(),
        testMode: true,
      });
      localStorage.setItem('gameHistory', JSON.stringify(localHistory.slice(0, 50)));
      return;
    }

    console.log('Submitting to blockchain...');
    setSubmitting(true);
    setMessage(`💫 Submitting ${wavesCleared} waves to blockchain...`);
    
    const tx = new Transaction();
    playAndSubmit(tx, towerNftId, GAME_COST * 1_000_000_000, wavesCleared);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          console.log('✅ Result submitted successfully:', result);
          setSubmitting(false);
          setSubmitted(true);
          
          // Show reward card animation
          if (dropChance > 0) {
            setMessage('🎰 Rolling for NFT reward...');
            setShowRewardCard(true);
            
            // Simulate roll after 2 seconds
            setTimeout(() => {
              const roll = Math.random() * 100;
              const gotReward = roll < dropChance;
              
              if (gotReward) {
                const tower = generateRewardTower(wavesCleared);
                setRewardResult({ gotReward, dropChance, tower });
                setMessage('🎉 You got an NFT Tower! Check your inventory.');
              } else {
                setRewardResult({ gotReward, dropChance });
                setMessage(`😢 No drop this time. Better luck next time!`);
              }
            }, 2000);
          } else {
            setMessage(`Game completed! Cleared ${wavesCleared} waves. (Need 2+ waves for rewards)`);
          }
        },
        onError: (error) => {
          console.error('❌ Error submitting result:', error);
          setMessage(`❌ Error: ${error.message}`);
          setSubmitting(false);
        },
      }
    );
  };

  // Check if position is on path
  const isOnPath = (x: number, y: number): boolean => {
    for (let i = 0; i < GAME_PATH.length - 1; i++) {
      const p1 = GAME_PATH[i];
      const p2 = GAME_PATH[i + 1];
      
      // Check distance to line segment
      const A = x - p1.x;
      const B = y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      
      if (lenSq !== 0) param = dot / lenSq;
      
      let xx, yy;
      
      if (param < 0) {
        xx = p1.x;
        yy = p1.y;
      } else if (param > 1) {
        xx = p2.x;
        yy = p2.y;
      } else {
        xx = p1.x + param * C;
        yy = p1.y + param * D;
      }
      
      const dx = x - xx;
      const dy = y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 30) return true; // 30 = path width/2 + buffer
    }
    return false;
  };

  // Place tower (using NFT stats)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    
    if (state.isWaveActive) {
      setMessage('Cannot place towers during wave!');
      return;
    }
    
    if (selectedCard === null) {
      setMessage('Please select a tower card first!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if on path
    if (isOnPath(x, y)) {
      setMessage('❌ Cannot build on the path!');
      return;
    }

    // Check if too close to other towers
    const tooClose = state.towers.some(
      (t) => Math.hypot(t.x - x, t.y - y) < 40
    );
    if (tooClose) {
      setMessage('❌ Too close to another tower!');
      return;
    }

    // Use NFT tower stats
    const newTower: Tower = {
      id: `tower-${Date.now()}`,
      x,
      y,
      damage: nftDamage,
      range: nftRange,
      fireRate: nftFireRate,
      lastFire: 0,
    };

    state.towers.push(newTower);
    
    // Mark card as used
    setAvailableCards((cards) =>
      cards.map((card) =>
        card.id === selectedCard ? { ...card, used: true } : card
      )
    );
    setSelectedCard(null);
    
    forceUpdate((n) => n + 1);
    setMessage(`Tower placed! (${state.towers.length}/5)`);
  };

  // Game loop
  useEffect(() => {
    const state = gameStateRef.current;
    let animationId: number;

    const gameLoop = () => {
      const now = Date.now();

      // Move enemies
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i];
        const target = GAME_PATH[enemy.pathIndex + 1];

        if (!target) {
          state.lives--;
          state.enemies.splice(i, 1);
          continue;
        }

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 5) {
          enemy.pathIndex++;
        } else {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        }
      }

      // Towers shoot
      state.towers.forEach((tower) => {
        if (now - tower.lastFire < tower.fireRate) return;

        let closestEnemy: Enemy | null = null;
        let closestDist = Infinity;

        state.enemies.forEach((enemy) => {
          const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
          if (dist <= tower.range && dist < closestDist) {
            closestEnemy = enemy;
            closestDist = dist;
          }
        });

        if (closestEnemy) {
          const bullet: Bullet = {
            id: `bullet-${Date.now()}-${Math.random()}`,
            x: tower.x,
            y: tower.y,
            targetX: closestEnemy.x,
            targetY: closestEnemy.y,
            speed: 10,
            damage: tower.damage,
            color: '#2196F3',
          };
          state.bullets.push(bullet);
          tower.lastFire = now;
        }
      });

      // Move bullets
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.hypot(dx, dy);

        if (dist < bullet.speed) {
          const hitEnemy = state.enemies.find(
            (e) => Math.hypot(e.x - bullet.targetX, e.y - bullet.targetY) < 20
          );

          if (hitEnemy) {
            hitEnemy.hp -= bullet.damage;

            state.hitEffects.push({
              id: `hit-${Date.now()}-${Math.random()}`,
              x: bullet.targetX,
              y: bullet.targetY,
              frame: 0,
              maxFrames: 10,
            });

            if (hitEnemy.hp <= 0) {
              const index = state.enemies.indexOf(hitEnemy);
              if (index !== -1) {
                state.enemies.splice(index, 1);
              }
            }
          }

          state.bullets.splice(i, 1);
        } else {
          bullet.x += (dx / dist) * bullet.speed;
          bullet.y += (dy / dist) * bullet.speed;
        }
      }

      // Update hit effects
      for (let i = state.hitEffects.length - 1; i >= 0; i--) {
        state.hitEffects[i].frame++;
        if (state.hitEffects[i].frame >= state.hitEffects[i].maxFrames) {
          state.hitEffects.splice(i, 1);
        }
      }

      // Check game over (lives depleted)
      if (state.lives <= 0 && !state.gameOver) {
        state.gameOver = true;
        state.isWaveActive = false;
        const wavesCleared = state.wave > 1 ? state.wave - 1 : 0;
        setMessage(`💀 Game Over! Cleared ${wavesCleared} waves`);
        handleSubmitResult(wavesCleared);
      }

      // Check wave complete
      if (state.isWaveActive && state.enemies.length === 0 && !state.gameOver) {
        state.isWaveActive = false;
        if (state.wave >= 5) {
          state.victory = true;
          setMessage('🎉 Victory! You cleared all 5 waves!');
          handleSubmitResult(5);
        } else {
          state.wave++;
          setMessage(`Wave ${state.wave - 1} complete! Start wave ${state.wave}`);
        }
      }

      forceUpdate((n) => n + 1);
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw path
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 40;
    ctx.beginPath();
    GAME_PATH.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw path borders (red outline)
    ctx.strokeStyle = '#ff000040';
    ctx.lineWidth = 44;
    ctx.beginPath();
    GAME_PATH.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw towers
    state.towers.forEach((tower) => {
      // Range circle (faint)
      ctx.fillStyle = 'rgba(33, 150, 243, 0.05)';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fill();

      // Tower base
      ctx.fillStyle = '#555';
      ctx.fillRect(tower.x - 20, tower.y + 10, 40, 8);
      ctx.fillStyle = '#666';
      ctx.fillRect(tower.x - 18, tower.y + 12, 36, 4);

      // Tower body
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(tower.x - 12, tower.y - 10, 24, 20);
      
      // Tower top
      ctx.fillStyle = '#333';
      ctx.fillRect(tower.x - 14, tower.y - 12, 28, 4);

      // Cannon barrel
      ctx.fillStyle = '#222';
      ctx.fillRect(tower.x - 4, tower.y - 15, 8, 10);

      // Damage indicator
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(tower.damage.toString(), tower.x, tower.y + 25);
    });

    // Draw bullets
    state.bullets.forEach((bullet) => {
      const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 8);
      gradient.addColorStop(0, bullet.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw hit effects
    state.hitEffects.forEach((effect) => {
      const progress = effect.frame / effect.maxFrames;
      const size = 5 + progress * 15;
      const alpha = 1 - progress;
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw enemies
    state.enemies.forEach((enemy) => {
      const size = enemy.type === 'tank' ? 14 : enemy.type === 'fast' ? 8 : 10;
      const color = ENEMY_TYPES[enemy.type].color;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
      ctx.fill();

      const hpPercent = enemy.hp / enemy.maxHp;
      const barWidth = size * 3;
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x - barWidth / 2 - 1, enemy.y - size - 8, barWidth + 2, 6);
      const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#f44336';
      ctx.fillStyle = hpColor;
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - size - 7, barWidth * hpPercent, 4);
    });
  });

  const state = gameStateRef.current;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">🎮 Tower Defense</h1>

        {message && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-4">
            <p className="text-white">{message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onClick={handleCanvasClick}
              className="border-4 border-gray-700 rounded-xl cursor-crosshair bg-gray-800"
            />
          </div>

          <div className="space-y-4">
            {/* Tower NFT Stats */}
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl p-4 border-2 border-purple-500">
              <h3 className="text-white font-bold mb-2">🎯 Your Tower NFT</h3>
              <div className="space-y-1">
                <p className="text-white">⚔️ Damage: {nftDamage}</p>
                <p className="text-white">🎯 Range: {nftRange}</p>
                <p className="text-white">⚡ Fire Rate: {nftFireRate}ms</p>
                <p className={`font-bold ${['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'][nftRarity]}`}>
                  ⭐ {['', 'Common', 'Rare', 'Epic', 'Legendary'][nftRarity]}
                </p>
              </div>
            </div>

            {/* Tower Cards */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">🃏 Tower Cards (5)</h3>
              <div className="grid grid-cols-5 gap-2">
                {availableCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => !card.used && setSelectedCard(card.id)}
                    disabled={card.used || state.isWaveActive}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-all ${
                      card.used
                        ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                        : selectedCard === card.id
                        ? 'bg-blue-500 border-blue-300 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-700 border-gray-500 text-white hover:border-blue-400 cursor-pointer'
                    }`}
                  >
                    {card.used ? '✓' : '🗼'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {selectedCard ? 'Click on map to place tower' : 'Select a card to place tower'}
              </p>
            </div>

            {/* Game Stats */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">📊 Stats</h3>
              <p className="text-white">Wave: {state.wave}/5</p>
              <p className="text-white">Lives: ❤️ {state.lives}</p>
              <p className="text-white">Towers: {state.towers.length}/5</p>
              <p className="text-white">Enemies: {state.enemies.length}</p>
            </div>

            {!state.isWaveActive && !state.gameOver && !state.victory && state.wave <= 5 && (
              <button
                onClick={handleStartWave}
                disabled={state.towers.length === 0}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.towers.length === 0 ? 'Place towers first!' : `Start Wave ${state.wave}`}
              </button>
            )}

            {(state.gameOver || state.victory) && (
              <>
                <div className="bg-gradient-to-br from-yellow-900 to-orange-900 rounded-xl p-4 border-2 border-yellow-500">
                  <h3 className="text-white font-bold mb-2 text-center">
                    {state.victory ? '🎉 Victory!' : '💀 Game Over'}
                  </h3>
                  <div className="text-center mb-3">
                    {(() => {
                      const wavesCleared = state.victory ? 5 : (state.wave > 1 ? state.wave - 1 : 0);
                      const dropChance = getNFTDropChance(wavesCleared);
                      return (
                        <>
                          <p className={`text-2xl font-bold ${dropChance > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {dropChance > 0 ? `🎁 ${dropChance}% NFT Drop` : 'No Reward'}
                          </p>
                          <p className="text-gray-300 text-sm">
                            Cleared {wavesCleared} waves
                          </p>
                          {dropChance > 0 && (
                            <p className="text-green-400 text-xs mt-1">
                              Chance to get reward tower NFT!
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {submitting && (
                    <p className="text-white text-sm text-center mb-2">
                      💫 Submitting result to blockchain...
                    </p>
                  )}
                  {!towerNftId && (
                    <p className="text-gray-400 text-xs text-center">
                      (Test mode - no blockchain submission)
                    </p>
                  )}
                </div>

                {towerNftId && !submitting && !submitted && (
                  <button
                    onClick={() => handleSubmitResult(state.victory ? 5 : (state.wave > 1 ? state.wave - 1 : 0))}
                    className="w-full bg-yellow-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-yellow-600"
                  >
                    📤 Submit Result & Roll for Reward
                  </button>
                )}

                {submitted && (
                  <div className="bg-green-500/20 border border-green-500 rounded-xl p-3">
                    <p className="text-green-400 text-center font-bold">✅ Result Submitted!</p>
                  </div>
                )}

                <Link
                  href="/history"
                  className="block w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600 text-center"
                >
                  📊 View History
                </Link>

                <Link
                  href="/"
                  className="block w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 text-center"
                >
                  🎮 Play Again
                </Link>
              </>
            )}

            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">💡 Tips</h3>
              <p className="text-xs text-gray-300">• Select card first</p>
              <p className="text-xs text-gray-300">• Can't build on path</p>
              <p className="text-xs text-gray-300">• Place near corners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Card Modal */}
      {showRewardCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 border-4 border-yellow-500 max-w-md w-full mx-4 animate-bounce">
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              🎰 NFT Reward Roll
            </h2>
            
            {!rewardResult ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl animate-spin flex items-center justify-center">
                  <span className="text-6xl">🎁</span>
                </div>
                <p className="text-white text-xl font-bold">Rolling...</p>
              </div>
            ) : (
              <div className="text-center">
                {rewardResult.gotReward && rewardResult.tower ? (
                  <>
                    <div className={`w-32 h-32 mx-auto mb-4 rounded-xl flex items-center justify-center animate-pulse ${
                      rewardResult.tower.rarity === 4 ? 'bg-yellow-500' :
                      rewardResult.tower.rarity === 3 ? 'bg-purple-500' :
                      rewardResult.tower.rarity === 2 ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      <span className="text-6xl">🗼</span>
                    </div>
                    <p className={`text-3xl font-bold mb-2 ${
                      rewardResult.tower.rarity === 4 ? 'text-yellow-400' :
                      rewardResult.tower.rarity === 3 ? 'text-purple-400' :
                      rewardResult.tower.rarity === 2 ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {rewardResult.tower.rarityName}
                    </p>
                    <p className="text-white text-xl mb-4">Tower NFT!</p>
                    
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="space-y-2 text-left">
                        <div className="flex justify-between">
                          <span className="text-gray-400">⚔️ Damage:</span>
                          <span className="text-white font-bold">{rewardResult.tower.damage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">🎯 Range:</span>
                          <span className="text-white font-bold">{rewardResult.tower.range}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">⚡ Fire Rate:</span>
                          <span className="text-white font-bold">{rewardResult.tower.fireRate}ms</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-green-400 text-sm mb-4">✨ Added to your inventory!</p>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-xl flex items-center justify-center">
                      <span className="text-6xl">📦</span>
                    </div>
                    <p className="text-gray-400 text-3xl font-bold mb-2">No Drop</p>
                    <p className="text-white text-xl mb-4">Better luck next time!</p>
                    <p className="text-gray-300 text-sm">You had {rewardResult.dropChance}% chance</p>
                  </>
                )}
                
                <button
                  onClick={() => setShowRewardCard(false)}
                  className="mt-6 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-white">Loading...</p></div>}>
      <PlayPageContent />
    </Suspense>
  );
}
