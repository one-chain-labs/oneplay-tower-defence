'use client';

import { useState, useEffect, useRef } from 'react';

interface Tower {
  id: string;
  x: number;
  y: number;
  level: number;
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

const TOWER_STATS = {
  1: { damage: 15, range: 100, fireRate: 1000, cost: 50 },
  2: { damage: 30, range: 120, fireRate: 800, cost: 50 },
  3: { damage: 60, range: 150, fireRate: 600, cost: 100 },
};

const ENEMY_TYPES = {
  normal: { hp: 50, speed: 1.5, color: '#f44336' },
  fast: { hp: 30, speed: 3, color: '#ff9800' },
  tank: { hp: 150, speed: 0.8, color: '#9c27b0' },
};

export default function TestGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    hitEffects: [] as HitEffect[],
    wave: 1,
    lives: 10,
    gold: 150,
    isWaveActive: false,
  });

  const [, forceUpdate] = useState(0);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [message, setMessage] = useState('Click to place towers, then start wave!');

  // Place tower
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current;
    if (state.isWaveActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking existing tower
    const clickedTower = state.towers.find(
      (t) => Math.hypot(t.x - x, t.y - y) < 20
    );

    if (clickedTower) {
      setSelectedTower(clickedTower.id);
      return;
    }

    // Check if can afford tower
    const towerCost = TOWER_STATS[1].cost;
    if (state.gold < towerCost) {
      setMessage(`Not enough gold! Need ${towerCost} gold to place tower`);
      return;
    }

    // Place new tower
    const newTower: Tower = {
      id: `tower-${Date.now()}`,
      x,
      y,
      level: 1,
      ...TOWER_STATS[1],
      lastFire: 0,
    };

    state.towers.push(newTower);
    state.gold -= towerCost;
    forceUpdate((n) => n + 1);
    setMessage(`Tower placed! (${state.gold} gold remaining)`);
  };

  // Upgrade tower
  const handleUpgrade = () => {
    if (!selectedTower) return;

    const state = gameStateRef.current;
    const tower = state.towers.find((t) => t.id === selectedTower);
    if (!tower || tower.level >= 3) return;

    const newLevel = (tower.level + 1) as 1 | 2 | 3;
    const cost = newLevel === 2 ? 50 : 100;

    if (state.gold >= cost) {
      state.gold -= cost;
      tower.level = newLevel;
      tower.damage = TOWER_STATS[newLevel].damage;
      tower.range = TOWER_STATS[newLevel].range;
      tower.fireRate = TOWER_STATS[newLevel].fireRate;
      forceUpdate((n) => n + 1);
      setMessage(`Tower upgraded to level ${newLevel}!`);
    }
  };

  // Start wave
  const handleStartWave = () => {
    const state = gameStateRef.current;
    if (state.isWaveActive || state.wave > 5) return;

    state.isWaveActive = true;
    forceUpdate((n) => n + 1);
    setMessage(`Wave ${state.wave} started!`);

    // Spawn enemies
    const waveConfig = [
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

    const waveEnemies = waveConfig[state.wave - 1] || [];
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
          // Enemy reached end
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

        // Find closest enemy in range
        let closestEnemy: Enemy | null = null;
        let closestDist = Infinity;

        state.enemies.forEach((enemy) => {
          const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
          if (dist <= tower.range && dist < closestDist) {
            closestEnemy = enemy as any;
            closestDist = dist;
          }
        });

        if (closestEnemy) {
          // Create bullet
          const colors = ['#4CAF50', '#2196F3', '#FF9800'];
          const bullet: Bullet = {
            id: `bullet-${Date.now()}-${Math.random()}`,
            x: tower.x,
            y: tower.y - 10,
            targetX: (closestEnemy as any).x,
            targetY: (closestEnemy as any).y,
            speed: 10,
            damage: tower.damage,
            color: colors[tower.level - 1],
          };
          state.bullets.push(bullet);

          tower.lastFire = now;
        }
      });

      // Move bullets and check hits
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const dist = Math.hypot(dx, dy);

        if (dist < bullet.speed) {
          // Bullet hit - find enemy at target location
          const hitEnemy = state.enemies.find(
            (e) => Math.hypot(e.x - bullet.targetX, e.y - bullet.targetY) < 20
          );

          if (hitEnemy) {
            hitEnemy.hp -= bullet.damage;

            // Create hit effect
            state.hitEffects.push({
              id: `hit-${Date.now()}-${Math.random()}`,
              x: bullet.targetX,
              y: bullet.targetY,
              frame: 0,
              maxFrames: 10,
            });

            // Check if enemy died
            if (hitEnemy.hp <= 0) {
              const index = state.enemies.indexOf(hitEnemy);
              if (index !== -1) {
                state.enemies.splice(index, 1);
                state.gold += 10;
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

      // Check wave complete
      if (state.isWaveActive && state.enemies.length === 0) {
        state.isWaveActive = false;
        if (state.wave >= 5) {
          setMessage('🎉 Victory! You cleared all 5 waves!');
        } else {
          state.wave++;
          setMessage(`Wave ${state.wave - 1} complete! Start wave ${state.wave}`);
        }
      }

      // Check game over
      if (state.lives <= 0) {
        state.isWaveActive = false;
        setMessage(`💀 Game Over! You cleared ${state.wave - 1} waves`);
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

    // Clear
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

    // Draw towers
    state.towers.forEach((tower) => {
      // Range
      if (selectedTower === tower.id) {
        ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const colors = ['#4CAF50', '#2196F3', '#FF9800'];
      const color = colors[tower.level - 1];

      // Tower base (stone platform)
      ctx.fillStyle = '#555';
      ctx.fillRect(tower.x - 20, tower.y + 10, 40, 8);
      ctx.fillStyle = '#666';
      ctx.fillRect(tower.x - 18, tower.y + 12, 36, 4);

      // Tower body (cannon)
      ctx.fillStyle = color;
      ctx.fillRect(tower.x - 12, tower.y - 10, 24, 20);
      
      // Tower top
      ctx.fillStyle = '#333';
      ctx.fillRect(tower.x - 14, tower.y - 12, 28, 4);

      // Cannon barrel
      ctx.fillStyle = '#222';
      ctx.fillRect(tower.x - 4, tower.y - 15, 8, 10);

      // Level indicator (gems)
      for (let i = 0; i < tower.level; i++) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(tower.x - 8 + i * 8, tower.y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glow effect
      const gradient = ctx.createRadialGradient(tower.x, tower.y - 5, 0, tower.x, tower.y - 5, 25);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(tower.x - 25, tower.y - 30, 50, 50);
    });

    // Draw bullets
    state.bullets.forEach((bullet) => {
      // Bullet trail
      ctx.strokeStyle = bullet.color + '40';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const dx = bullet.targetX - bullet.x;
      const dy = bullet.targetY - bullet.y;
      const dist = Math.hypot(dx, dy);
      const trailLength = 15;
      const trailX = bullet.x - (dx / dist) * trailLength;
      const trailY = bullet.y - (dy / dist) * trailLength;
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();

      // Bullet glow
      const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 8);
      gradient.addColorStop(0, bullet.color);
      gradient.addColorStop(0.5, bullet.color + '80');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Bullet core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw hit effects
    state.hitEffects.forEach((effect) => {
      const progress = effect.frame / effect.maxFrames;
      const size = 5 + progress * 15;
      const alpha = 1 - progress;

      // Explosion circle
      ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
      ctx.stroke();

      // Inner flash
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Particles
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const particleX = effect.x + Math.cos(angle) * size;
        const particleY = effect.y + Math.sin(angle) * size;
        ctx.fillStyle = `rgba(255, 150, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw enemies
    state.enemies.forEach((enemy) => {
      const size = enemy.type === 'tank' ? 14 : enemy.type === 'fast' ? 8 : 10;
      const color = ENEMY_TYPES[enemy.type].color;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y + size + 2, size, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Enemy body
      if (enemy.type === 'tank') {
        // Tank - square with treads
        ctx.fillStyle = color;
        ctx.fillRect(enemy.x - size, enemy.y - size, size * 2, size * 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x - size, enemy.y - size + 3, size * 2, 3);
        ctx.fillRect(enemy.x - size, enemy.y + size - 6, size * 2, 3);
        // Turret
        ctx.fillStyle = color;
        ctx.fillRect(enemy.x - 6, enemy.y - 6, 12, 12);
        ctx.fillRect(enemy.x, enemy.y - 3, 8, 6);
      } else if (enemy.type === 'fast') {
        // Fast - triangle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - size);
        ctx.lineTo(enemy.x - size, enemy.y + size);
        ctx.lineTo(enemy.x + size, enemy.y + size);
        ctx.closePath();
        ctx.fill();
        // Speed lines
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x - size - 5, enemy.y);
        ctx.lineTo(enemy.x - size - 10, enemy.y);
        ctx.stroke();
      } else {
        // Normal - circle with face
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(enemy.x - 3, enemy.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + 3, enemy.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // HP bar background
      const barWidth = size * 3;
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x - barWidth / 2 - 1, enemy.y - size - 8, barWidth + 2, 6);
      
      // HP bar
      const hpPercent = enemy.hp / enemy.maxHp;
      const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#f44336';
      ctx.fillStyle = hpColor;
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - size - 7, barWidth * hpPercent, 4);
    });
  });

  const state = gameStateRef.current;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">🏰 Tower Defense Test</h1>

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
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">Stats</h3>
              <p className="text-white">Wave: {state.wave}/5</p>
              <p className="text-white">Lives: ❤️ {state.lives}</p>
              <p className="text-white">Gold: 💰 {state.gold}</p>
              <p className="text-white">Enemies: {state.enemies.length}</p>
            </div>

            {!state.isWaveActive && state.wave <= 5 && state.lives > 0 && (
              <button
                onClick={handleStartWave}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600"
              >
                Start Wave {state.wave}
              </button>
            )}

            {selectedTower && (
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-white font-bold mb-2">Selected Tower</h3>
                {state.towers.find((t) => t.id === selectedTower)?.level === 3 ? (
                  <p className="text-gray-400">Max level</p>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={state.gold < 50}
                    className="w-full bg-yellow-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Upgrade (
                    {state.towers.find((t) => t.id === selectedTower)?.level === 1 ? '50' : '100'}{' '}
                    gold)
                  </button>
                )}
              </div>
            )}

            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">Controls</h3>
              <p className="text-sm text-gray-300">• Click to place tower (50g)</p>
              <p className="text-sm text-gray-300">• Click tower to select</p>
              <p className="text-sm text-gray-300">• Upgrade with gold</p>
              <p className="text-sm text-gray-300">• Kill enemies for gold</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">Enemies</h3>
              <p className="text-sm text-red-400">🔴 Normal (50 HP)</p>
              <p className="text-sm text-orange-400">🟠 Fast (30 HP)</p>
              <p className="text-sm text-purple-400">🟣 Tank (150 HP)</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">Tower Levels</h3>
              <p className="text-sm text-green-400">� LTv1: 15 dmg</p>
              <p className="text-sm text-blue-400">🔵 Lv2: 30 dmg (50g)</p>
              <p className="text-sm text-orange-400">🟠 Lv3: 60 dmg (100g)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
