'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID } from '@/lib/constants';
import { drawTower, drawEnemy } from '@/lib/gameRenderer';
import Link from 'next/link';

interface Tower {
  id: string;
  x: number;
  y: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFire: number;
  rarity: number;
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
  color: string;
}

interface HitEffect {
  id: string;
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [myTowers, setMyTowers] = useState<TowerNFT[]>([]);
  const [selectedTowerForPlacement, setSelectedTowerForPlacement] = useState<TowerNFT | null>(null);
  const [placedTowers, setPlacedTowers] = useState<TowerNFT[]>([]);
  const [message, setMessage] = useState('Click a tower from your list to place it on the map!');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  // Initialize and play background music
  useEffect(() => {
    const audio = new Audio('/1.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log('Autoplay prevented. Music will start on user interaction.');
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Warn before leaving page during active game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const state = gameStateRef.current;
      if (!state.gameOver && !state.victory) {
        e.preventDefault();
        e.returnValue = 'Leaving will forfeit your entry fee. Are you sure?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Toggle music
  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.log('Play failed:', err));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const gameStateRef = useRef({
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    hitEffects: [] as HitEffect[],
    lives: 10,
    gameOver: false,
    victory: false,
    enemiesSpawned: 0,
    totalEnemies: 20,
    isWaveActive: false,
  });

  const [, forceUpdate] = useState(0);

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

  // Select tower for placement
  const handleSelectTowerForPlacement = (tower: TowerNFT) => {
    if (placedTowers.some(t => t.id === tower.id)) {
      setMessage('❌ This tower has already been placed!');
      return;
    }
    if (placedTowers.length >= 5) {
      setMessage('❌ Maximum 5 towers! Start the challenge now.');
      return;
    }
    setSelectedTowerForPlacement(tower);
    setMessage(`✅ ${RARITY_NAMES[tower.rarity]} tower selected! Click on the map to place it.`);
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

  const handleStartWave = () => {
    if (gameStateRef.current.towers.length === 0) {
      setMessage('Place at least one tower before starting!');
      return;
    }
    gameStateRef.current.isWaveActive = true;
    setMessage('Challenge started! Defend against the monsters!');
    forceUpdate(v => v + 1);
    startSpawning();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    
    if (state.isWaveActive) {
      setMessage('❌ Cannot place towers during wave!');
      return;
    }
    
    if (!selectedTowerForPlacement) {
      setMessage('❌ Please select a tower from your list first!');
      return;
    }

    if (placedTowers.length >= 5) {
      setMessage('❌ Maximum 5 towers reached!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if clicking on path
    const isOnPath = () => {
      for (let i = 0; i < GAME_PATH.length - 1; i++) {
        const p1 = GAME_PATH[i];
        const p2 = GAME_PATH[i + 1];
        
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
        
        if (distance < 35) return true;
      }
      return false;
    };

    if (isOnPath()) {
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

    const tower: Tower = {
      id: `tower-${Date.now()}`,
      x,
      y,
      damage: selectedTowerForPlacement.damage,
      range: selectedTowerForPlacement.range,
      fireRate: selectedTowerForPlacement.fireRate,
      lastFire: 0,
      rarity: selectedTowerForPlacement.rarity,
    };

    state.towers.push(tower);
    setPlacedTowers(prev => [...prev, selectedTowerForPlacement]);
    setSelectedTowerForPlacement(null);
    
    const remaining = 5 - placedTowers.length - 1;
    if (remaining > 0) {
      setMessage(`✅ Tower placed! (${placedTowers.length + 1}/5) - Select another tower or start challenge.`);
    } else {
      setMessage(`✅ All 5 towers placed! Click "Start Challenge" to begin.`);
    }
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

      // Draw path with gradient
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 60;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      GAME_PATH.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Draw path border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 64;
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

        // Draw enemy as monster
        const enemyColor = monsterType === 2 ? '#ff9800' : monsterType === 3 ? '#9c27b0' : '#f44336';
        const size = monsterType === 3 ? 18 : monsterType === 2 ? 10 : 14;

        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.8, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        if (monsterType === 3) {
          // Tank Monster
          const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
          bodyGradient.addColorStop(0, enemyColor);
          bodyGradient.addColorStop(1, '#6a1b9a');
          ctx.fillStyle = bodyGradient;
          ctx.fillRect(-size * 0.9, -size * 0.6, size * 1.8, size * 1.4);
          
          ctx.fillStyle = '#4a148c';
          ctx.fillRect(-size * 0.7, -size * 0.4, size * 0.5, size * 0.3);
          ctx.fillRect(size * 0.2, -size * 0.4, size * 0.5, size * 0.3);
          
          ctx.fillStyle = enemyColor;
          ctx.beginPath();
          ctx.arc(0, -size * 0.3, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(-size * 0.3, -size * 0.4, size * 0.15, size * 0.15);
          ctx.fillRect(size * 0.15, -size * 0.4, size * 0.15, size * 0.15);
        } else if (monsterType === 2) {
          // Fast Monster
          const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
          bodyGradient.addColorStop(0, enemyColor);
          bodyGradient.addColorStop(1, '#e65100');
          ctx.fillStyle = bodyGradient;
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 0.6, size * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = enemyColor;
          ctx.beginPath();
          ctx.arc(0, -size * 0.5, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffeb3b';
          ctx.beginPath();
          ctx.arc(-size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
          ctx.arc(size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Normal Monster
          const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
          bodyGradient.addColorStop(0, enemyColor);
          bodyGradient.addColorStop(1, '#c62828');
          ctx.fillStyle = bodyGradient;
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = enemyColor;
          ctx.beginPath();
          ctx.arc(0, -size * 0.4, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(-size * 0.25, -size * 0.45, size * 0.15, 0, Math.PI * 2);
          ctx.arc(size * 0.25, -size * 0.45, size * 0.15, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(-size * 0.25, -size * 0.45, size * 0.08, 0, Math.PI * 2);
          ctx.arc(size * 0.25, -size * 0.45, size * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // HP bar
        const barWidth = size * 3;
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x - barWidth / 2 - 1, enemy.y - size - 12, barWidth + 2, 6);
        
        const hpPercent = enemy.hp / enemy.maxHp;
        const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#f44336';
        ctx.fillStyle = hpColor;
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - size - 11, barWidth * hpPercent, 4);

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
            speed: 15, // Increased from 10 to 15 for better hit rate
            damage: tower.damage,
            color: '#ffeb3b',
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
            Math.sqrt((e.x - bullet.targetX) ** 2 + (e.y - bullet.targetY) ** 2) < 30
          );
          if (enemy) {
            enemy.hp -= bullet.damage;
            // Add hit effect
            state.hitEffects.push({
              id: `hit-${Date.now()}-${Math.random()}`,
              x: bullet.targetX,
              y: bullet.targetY,
              frame: 0,
              maxFrames: 10,
            });
          }
          return false;
        }

        bullet.x += (dx / dist) * bullet.speed;
        bullet.y += (dy / dist) * bullet.speed;

        // Draw bullet with enhanced effects
        ctx.shadowBlur = 20;
        ctx.shadowColor = bullet.color;
        
        // Bullet trail
        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 12);
        gradient.addColorStop(0, bullet.color);
        gradient.addColorStop(0.5, bullet.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;

        return true;
      });

      // Update and draw hit effects with multiple layers
      state.hitEffects = state.hitEffects.filter(effect => {
        effect.frame++;
        
        const progress = effect.frame / effect.maxFrames;
        const alpha = 1 - progress;
        
        // Outer explosion ring
        const outerSize = 10 + progress * 25;
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, outerSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Middle ring
        const midSize = 5 + progress * 18;
        ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, midSize, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner flash
        if (progress < 0.3) {
          const flashAlpha = (1 - progress / 0.3);
          ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Spark particles
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i + (progress * Math.PI);
          const sparkDist = progress * 20;
          const sparkX = effect.x + Math.cos(angle) * sparkDist;
          const sparkY = effect.y + Math.sin(angle) * sparkDist;
          
          ctx.fillStyle = `rgba(255, 150, 0, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        return effect.frame < effect.maxFrames;
      });

      // Draw towers using shared renderer
      state.towers.forEach(tower => {
        // Find closest enemy for barrel rotation
        let targetAngle = -Math.PI / 2;
        const closestEnemy = state.enemies.reduce((closest: any, enemy) => {
          const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
          if (dist <= tower.range) {
            if (!closest) return enemy;
            const closestDist = Math.hypot(closest.x - tower.x, closest.y - tower.y);
            return dist < closestDist ? enemy : closest;
          }
          return closest;
        }, null);

        if (closestEnemy) {
          targetAngle = Math.atan2(closestEnemy.y - tower.y, closestEnemy.x - tower.x);
        }

        // Use shared drawing function
        drawTower(ctx, tower, targetAngle);
      });

      // Check game over (lives depleted)
      if (state.lives <= 0 && !state.gameOver) {
        state.gameOver = true;
        state.isWaveActive = false;
        setMessage('💀 Game Over! Monster reached the end!');
      }

      // Check victory
      if (state.isWaveActive && state.enemiesSpawned >= state.totalEnemies && state.enemies.length === 0 && !state.gameOver) {
        state.victory = true;
        state.isWaveActive = false;
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
    if (submitting || submitted) return; // Prevent double submission

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
      { transaction: tx as any },
      {
        onSuccess: () => {
          setSubmitted(true);
          if (success) {
            setMessage('🎉 Challenge completed! Reward sent to your wallet!');
          } else {
            setMessage('💀 Challenge failed. Entry fee forfeited.');
          }
          setSubmitting(false);
          
          // Auto-redirect to challenge list after 3 seconds
          setTimeout(() => {
            window.location.href = '/challenge-list';
          }, 3000);
        },
        onError: (error: any) => {
          setMessage(`❌ Error: ${error.message}`);
          setSubmitting(false);
        },
      }
    );
  };

  // Auto-submit when game ends
  useEffect(() => {
    const state = gameStateRef.current;
    if ((state.gameOver || state.victory) && !submitting && !submitted) {
      const timer = setTimeout(() => {
        handleSubmitResult();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStateRef.current.gameOver, gameStateRef.current.victory, submitting, submitted]);

  const state = gameStateRef.current;

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-7xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">⚔️ Challenge Mode</h1>
          <div className="flex gap-3">
            <button
              onClick={toggleMusic}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-colors border-2 border-gray-600 hover:border-cyan-400"
            >
              {isMusicPlaying ? '🔊 Music On' : '🔇 Music Off'}
            </button>
            <button
              onClick={() => {
                if (gameStateRef.current.gameOver || gameStateRef.current.victory) {
                  // Game finished, can leave freely
                  window.location.href = '/challenge-list';
                } else {
                  // Game in progress, show warning
                  const confirmed = confirm(
                    '⚠️ Warning: Leaving now will forfeit your entry fee and count as a loss. Are you sure?'
                  );
                  if (confirmed) {
                    window.location.href = '/challenge-list';
                  }
                }
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-xl hover:bg-gray-600"
            >
              ← Back
            </button>
          </div>
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

            {/* Selected Tower Info */}
            {selectedTowerForPlacement && (
              <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 border-2 border-cyan-400">
                <h3 className="text-cyan-300 font-bold mb-2">🎯 Selected Tower</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-white">⚔️ Damage: {selectedTowerForPlacement.damage}</p>
                  <p className="text-white">🎯 Range: {selectedTowerForPlacement.range}</p>
                  <p className={`font-bold ${RARITY_COLORS[selectedTowerForPlacement.rarity]}`}>
                    ⭐ {RARITY_NAMES[selectedTowerForPlacement.rarity]}
                  </p>
                </div>
                <p className="text-cyan-200 text-xs mt-2">Click on the map to place</p>
              </div>
            )}

            {/* Tower List */}
            {myTowers.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border-2 border-blue-500">
                <h3 className="text-white font-bold mb-2">
                  🗼 Your Towers ({placedTowers.length}/5 placed)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myTowers.map(tower => {
                    const isPlaced = placedTowers.some(t => t.id === tower.id);
                    const isSelected = selectedTowerForPlacement?.id === tower.id;
                    return (
                      <div
                        key={tower.id}
                        onClick={() => !isPlaced && !state.isWaveActive && handleSelectTowerForPlacement(tower)}
                        className={`rounded p-2 border-2 transition-all ${
                          isPlaced
                            ? 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-cyan-900 border-cyan-400 cursor-pointer'
                            : 'bg-gray-900 border-gray-700 hover:bg-gray-700 hover:border-blue-500 cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={`text-xs font-bold ${RARITY_COLORS[tower.rarity]}`}>
                              {RARITY_NAMES[tower.rarity]} {isPlaced && '✓'}
                            </p>
                            <p className="text-xs text-gray-400">
                              DMG: {tower.damage} | RNG: {tower.range}
                            </p>
                          </div>
                          {isSelected && <span className="text-cyan-400 text-xl">👉</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {placedTowers.length >= 5 && (
                  <p className="text-yellow-400 text-xs mt-2 text-center font-bold">
                    ⚠️ Maximum towers placed!
                  </p>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="bg-gray-800 rounded-xl p-4 border-2 border-gray-700">
              <h3 className="text-white font-bold mb-2">📊 Stats</h3>
              <div className="space-y-1 text-sm">
                <p className="text-white">Lives: ❤️ {state.lives}</p>
                <p className="text-white">Towers: {state.towers.length}/5</p>
                <p className="text-white">Enemies: {state.enemies.length}</p>
                <p className="text-white">Spawned: {state.enemiesSpawned}/{state.totalEnemies}</p>
              </div>
            </div>

            {!state.isWaveActive && !state.gameOver && !state.victory && (
              <button
                onClick={handleStartWave}
                disabled={state.towers.length === 0}
                className="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50"
              >
                {state.towers.length === 0 ? '⚠️ Place at least 1 tower!' : `🚀 Start Challenge (${state.towers.length} towers)`}
              </button>
            )}

            {state.isWaveActive && (
              <div className="w-full bg-red-500/20 border-2 border-red-500 rounded-xl px-4 py-3">
                <p className="text-red-400 font-bold text-center animate-pulse">⚔️ Challenge in Progress...</p>
              </div>
            )}

            {(state.gameOver || state.victory) && (
              <div className={`rounded-xl p-4 border-2 ${state.victory ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
                <p className={`font-bold text-center text-xl ${state.victory ? 'text-green-400' : 'text-red-400'}`}>
                  {state.victory ? '🎉 Victory!' : '💀 Failed!'}
                </p>
                {submitting && (
                  <p className="text-white text-sm text-center mt-2">
                    💫 Submitting result...
                  </p>
                )}
                {submitted && (
                  <>
                    <p className="text-white text-sm text-center mt-2">
                      ✅ {state.victory ? 'Entry fee returned!' : 'Entry fee forfeited.'}
                    </p>
                    <p className="text-gray-400 text-xs text-center mt-2">
                      Returning to challenges in 3 seconds...
                    </p>
                  </>
                )}
              </div>
            )}
            
            {submitted && (
              <button
                onClick={() => window.location.href = '/challenge-list'}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600"
              >
                ← Back to Challenges Now
              </button>
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
