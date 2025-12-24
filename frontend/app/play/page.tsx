'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from '@onelabs/dapp-kit';
import { Transaction } from '@onelabs/sui/transactions';
import { playAndSubmit } from '@/lib/contracts';
import { GAME_COST, PACKAGE_ID } from '@/lib/constants';
import Link from 'next/link';
import {networks} from '../providers';
import { useI18n } from '../providers';

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

const RARITY_NAMES = ['', 'Common', 'Rare', 'Epic', 'Legendary'];
const RARITY_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];

const NETWORK_RPC = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as keyof typeof networks;
const NETWORK_RPC_URL = networks[NETWORK_RPC].url;
// Tower Card Icon Component
function TowerCardIcon({ rarity }: { rarity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get colors based on rarity
    const rarityColors = {
      1: { light: '#9e9e9e', mid: '#757575', dark: '#424242', glow: '#bdbdbd' },
      2: { light: '#42a5f5', mid: '#2196f3', dark: '#1565c0', glow: '#64b5f6' },
      3: { light: '#ab47bc', mid: '#9c27b0', dark: '#6a1b9a', glow: '#ce93d8' },
      4: { light: '#ffd54f', mid: '#ffc107', dark: '#f57c00', glow: '#ffe082' },
    };
    const colors = rarityColors[rarity as keyof typeof rarityColors] || rarityColors[2];

    const centerX = 32;
    const centerY = 32;
    const scale = 0.8;

    // Base platform (hexagon)
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = centerX + Math.cos(angle) * 12 * scale;
      const y = centerY + 8 * scale + Math.sin(angle) * 12 * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Tower body
    const bodyGradient = ctx.createLinearGradient(centerX - 10 * scale, 0, centerX + 10 * scale, 0);
    bodyGradient.addColorStop(0, colors.dark);
    bodyGradient.addColorStop(0.5, colors.mid);
    bodyGradient.addColorStop(1, colors.dark);
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(centerX - 10 * scale, centerY - 5 * scale, 20 * scale, 15 * scale);

    // Body shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(centerX - 8 * scale, centerY - 3 * scale, 5 * scale, 11 * scale);

    // Turret base
    const turretGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 8 * scale);
    turretGradient.addColorStop(0, colors.light);
    turretGradient.addColorStop(1, colors.mid);
    ctx.fillStyle = turretGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Cannon barrel
    ctx.fillStyle = '#424242';
    ctx.fillRect(centerX, centerY - 2 * scale, 14 * scale, 4 * scale);

    // Turret top
    ctx.fillStyle = colors.glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Rarity stars
    if (rarity >= 2) {
      ctx.fillStyle = colors.glow;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      const stars = '⭐'.repeat(rarity - 1);
      ctx.fillText(stars, centerX, centerY - 14 * scale);
    }
  }, [rarity]);

  return <canvas ref={canvasRef} width={64} height={64} className="w-full h-full" />;
}

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
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useI18n();

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

  const [myTowers, setMyTowers] = useState<Array<{id: string, damage: number, range: number, fireRate: number, rarity: number}>>([]);
  const [selectedTowerForPlacement, setSelectedTowerForPlacement] = useState<{id: string, damage: number, range: number, fireRate: number, rarity: number} | null>(null);
  const [placedTowers, setPlacedTowers] = useState<Array<{id: string, damage: number, range: number, fireRate: number, rarity: number}>>([]);

  useEffect(() => {
    if (ownedTowers?.data) {
      const towers = ownedTowers.data
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
        .filter((t): t is {id: string, damage: number, range: number, fireRate: number, rarity: number} => t !== null);
      
      setMyTowers(towers);
    }
  }, [ownedTowers]);

  const playerTowers = placedTowers;
  const towerNftId = placedTowers.length > 0 ? placedTowers[0].id : null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    isPaused: false, // For wave transitions
  });

  // Initialize and play background music
  useEffect(() => {
    const audio = new Audio('/1.mp3');
    audio.loop = true;
    audio.volume = 0.3; // 30% volume
    audioRef.current = audio;

    // Try to play (may be blocked by browser autoplay policy)
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log('Autoplay prevented. Music will start on user interaction.');
      });
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showWaveTransition, setShowWaveTransition] = useState(false);
  const [transitionWave, setTransitionWave] = useState(1);
  const [showSacrificeModal, setShowSacrificeModal] = useState(false);
  const [sacrificeTowerId, setSacrificeTowerId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

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
  
  // Fetch all player's towers for sacrifice selection
  const { data: allTowers } = useSuiClientQuery(
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
      enabled: !!account?.address && showSacrificeModal,
    }
  );
  const [availableCards, setAvailableCards] = useState(() => 
    playerTowers.map((tower, index) => ({
      id: index,
      used: false,
      tower: tower
    }))
  );

  // Start wave
  const handleStartWave = () => {
    const state = gameStateRef.current;
    if (state.isWaveActive || state.wave > 5 || state.gameOver) return;

    state.isWaveActive = true;
    forceUpdate((n) => n + 1);
    setMessage(`⚔️ Wave ${state.wave} - Fight!`);

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
  const handleSubmitResult = async (wavesCleared: number, sacrificeTowerId?: string) => {
    console.log('=== handleSubmitResult called ===');
    console.log('wavesCleared:', wavesCleared);
    console.log('state.wave:', state.wave);
    console.log('state.victory:', state.victory);
    console.log('state.gameOver:', state.gameOver);
    console.log('sacrificeTowerId:', sacrificeTowerId);
    console.log('account:', account?.address);
    console.log('submitting:', submitting);
    console.log('submitted:', submitted);
    
    // Use sacrifice tower if provided, otherwise use the tower from game
    const towerToSubmit = sacrificeTowerId || towerNftId;
    
    if (wavesCleared < 5) {
      console.log('🔥 Tower will be BURNED:', towerToSubmit);
    } else {
      console.log('✅ Tower will be RETURNED:', towerToSubmit);
    }

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

    // If no tower to submit, save locally (test mode)
    if (!towerToSubmit) {
      console.log('Test mode - saving locally');
      setSubmitted(true);
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
    
    // Get GAME token
    try {
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
        setMessage('❌ No GAME tokens found!');
        setSubmitting(false);
        return;
      }
      
      const tx = new Transaction();
      tx.setGasBudget(100000000); // Set gas budget to 0.1 GAME
      
      const paymentAmount = GAME_COST; // GAME_COST is already in smallest units
      console.log('Payment amount:', paymentAmount);
      console.log('Tower to submit:', towerToSubmit);
      console.log('Game coin:', gameCoin.coinObjectId);
      
      playAndSubmit(tx, towerToSubmit, gameCoin.coinObjectId, paymentAmount, wavesCleared);

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: (result: any) => {
          console.log('✅ Result submitted successfully:', result);
          setSubmitting(false);
          setSubmitted(true);
          
          // Auto-redirect to home after 3 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          
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
        onError: (error: any) => {
          console.error('❌ Error submitting result:', error);
          setMessage(`❌ Error: ${error.message}`);
          setSubmitting(false);
        },
      }
    );
    } catch (error: any) {
      console.error('❌ Error in handleSubmitResult:', error);
      setMessage(`❌ Error: ${error.message}`);
      setSubmitting(false);
    }
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
      
      if (distance < 35) return true; // 35 pixels from path center (path width is 60)
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
    
    // Check if using new tower selection system
    if (selectedTowerForPlacement) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (isOnPath(x, y)) {
        setMessage('❌ Cannot build on the path!');
        return;
      }

      const tooClose = state.towers.some(
        (t) => Math.hypot(t.x - x, t.y - y) < 40
      );
      if (tooClose) {
        setMessage('❌ Too close to another tower!');
        return;
      }

      const newTower: Tower = {
        id: `tower-${Date.now()}`,
        x,
        y,
        damage: selectedTowerForPlacement.damage,
        range: selectedTowerForPlacement.range,
        fireRate: selectedTowerForPlacement.fireRate,
        lastFire: 0,
        rarity: selectedTowerForPlacement.rarity,
      };

      state.towers.push(newTower);
      setPlacedTowers([...placedTowers, selectedTowerForPlacement]);
      setSelectedTowerForPlacement(null);
      setMessage(`✅ Tower placed! (${placedTowers.length + 1}/${myTowers.length})`);
      return;
    }
    
    // Old card system (for backward compatibility)
    if (selectedCard === null) {
      setMessage('Please select a tower from your list first!');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isOnPath(x, y)) {
      setMessage('❌ Cannot build on the path!');
      return;
    }

    const tooClose = state.towers.some(
      (t) => Math.hypot(t.x - x, t.y - y) < 40
    );
    if (tooClose) {
      setMessage('❌ Too close to another tower!');
      return;
    }

    const selectedTowerData = availableCards.find(c => c.id === selectedCard)?.tower;
    if (!selectedTowerData) return;

    const newTower: Tower = {
      id: `tower-${Date.now()}`,
      x,
      y,
      damage: selectedTowerData.damage,
      range: selectedTowerData.range,
      fireRate: selectedTowerData.fireRate,
      lastFire: 0,
      rarity: selectedTowerData.rarity,
    };

    state.towers.push(newTower);
    
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

      // Skip game logic if paused (during wave transitions)
      if (state.isPaused) {
        forceUpdate((n) => n + 1);
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

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
            closestEnemy = enemy as Enemy;
            closestDist = dist;
          }
        });

        if (closestEnemy) {
          const bullet: Bullet = {
            id: `bullet-${Date.now()}-${Math.random()}`,
            x: tower.x,
            y: tower.y,
            targetX: (closestEnemy as Enemy).x,
            targetY: (closestEnemy as Enemy).y,
            speed: 15, // Increased from 10 to 15 for better hit rate
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
            (e) => Math.hypot(e.x - bullet.targetX, e.y - bullet.targetY) < 30
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
        // Calculate waves cleared: if wave is active, current wave failed, so wave-1
        // If wave not active, we're between waves, so also wave-1
        const wavesCleared = Math.max(0, state.wave - 1);
        setMessage(`💀 Game Over! Cleared ${wavesCleared} waves`);
        setShowGameOverModal(true);
      }

      // Check wave complete
      if (state.isWaveActive && state.enemies.length === 0 && !state.gameOver) {
        state.isWaveActive = false;
        if (state.wave >= 5) {
          // Wave 5 complete - Victory!
          state.victory = true;
          setMessage('🎉 Victory! You cleared all 5 waves!');
          setShowGameOverModal(true);
        } else {
          // Wave 1-4 complete - Pause game and show transition
          state.isPaused = true;
          const nextWave = state.wave + 1;
          setTransitionWave(nextWave);
          setShowWaveTransition(true);
          setMessage(`🎉 Wave ${state.wave} complete!`);
          
          // Auto-start next wave after 3 seconds
          setTimeout(() => {
            state.wave = nextWave;
            state.isPaused = false;
            setShowWaveTransition(false);
            handleStartWave();
          }, 3000);
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
      ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Find closest enemy for barrel rotation
      let targetAngle = -Math.PI / 2; // Default pointing up
      const closestEnemy = state.enemies.reduce((closest: Enemy | null, enemy) => {
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

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(tower.x, tower.y + 18, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Get colors based on rarity
      const rarityColors = {
        1: { light: '#9e9e9e', mid: '#757575', dark: '#424242', glow: '#bdbdbd' }, // Common - Gray
        2: { light: '#42a5f5', mid: '#2196f3', dark: '#1565c0', glow: '#64b5f6' }, // Rare - Blue
        3: { light: '#ab47bc', mid: '#9c27b0', dark: '#6a1b9a', glow: '#ce93d8' }, // Epic - Purple
        4: { light: '#ffd54f', mid: '#ffc107', dark: '#f57c00', glow: '#ffe082' }, // Legendary - Gold
      };
      const colors = rarityColors[tower.rarity as keyof typeof rarityColors] || rarityColors[2];

      // Base platform (hexagon)
      ctx.fillStyle = '#2a2a2a';
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = tower.x + Math.cos(angle) * 18;
        const y = tower.y + 12 + Math.sin(angle) * 18;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Base highlight with rarity color
      ctx.fillStyle = colors.dark + '40';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = tower.x + Math.cos(angle) * 14;
        const y = tower.y + 12 + Math.sin(angle) * 14;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Tower body (cylinder) with rarity color
      const bodyGradient = ctx.createLinearGradient(tower.x - 15, 0, tower.x + 15, 0);
      bodyGradient.addColorStop(0, colors.dark);
      bodyGradient.addColorStop(0.5, colors.mid);
      bodyGradient.addColorStop(1, colors.dark);
      ctx.fillStyle = bodyGradient;
      ctx.fillRect(tower.x - 15, tower.y - 8, 30, 20);

      // Body shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(tower.x - 12, tower.y - 6, 8, 16);

      // Body border with glow for higher rarity
      if (tower.rarity >= 3) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.glow;
      }
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 2;
      ctx.strokeRect(tower.x - 15, tower.y - 8, 30, 20);
      ctx.shadowBlur = 0;

      // Turret base (circle) with rarity color
      const turretGradient = ctx.createRadialGradient(tower.x, tower.y - 2, 0, tower.x, tower.y - 2, 12);
      turretGradient.addColorStop(0, colors.light);
      turretGradient.addColorStop(1, colors.mid);
      ctx.fillStyle = turretGradient;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 2, 12, 0, Math.PI * 2);
      ctx.fill();
      
      if (tower.rarity >= 3) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.glow;
      }
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Cannon barrel (rotates)
      ctx.save();
      ctx.translate(tower.x, tower.y - 2);
      ctx.rotate(targetAngle);

      // Barrel shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, -3, 20, 6);

      // Barrel
      const barrelGradient = ctx.createLinearGradient(0, -4, 0, 4);
      barrelGradient.addColorStop(0, '#424242');
      barrelGradient.addColorStop(0.5, '#616161');
      barrelGradient.addColorStop(1, '#424242');
      ctx.fillStyle = barrelGradient;
      ctx.fillRect(0, -4, 22, 8);

      // Barrel tip
      ctx.fillStyle = '#212121';
      ctx.fillRect(20, -3, 3, 6);

      // Barrel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(2, -3, 18, 2);

      ctx.restore();

      // Turret top detail (small circle) with rarity color
      ctx.fillStyle = colors.glow;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.mid;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Rarity stars above tower
      if (tower.rarity >= 2) {
        ctx.fillStyle = colors.glow;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const stars = '⭐'.repeat(tower.rarity - 1);
        ctx.fillText(stars, tower.x, tower.y - 20);
      }

      // Damage indicator with background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(tower.x - 18, tower.y + 16, 36, 14);
      
      // Border with rarity color
      ctx.strokeStyle = colors.mid;
      ctx.lineWidth = 2;
      ctx.strokeRect(tower.x - 18, tower.y + 16, 36, 14);
      
      ctx.fillStyle = colors.glow;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`⚔️${tower.damage}`, tower.x, tower.y + 23);
    });

    // Draw bullets with enhanced effects
    state.bullets.forEach((bullet) => {
      // Outer glow
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
    });

    // Draw hit effects with multiple layers
    state.hitEffects.forEach((effect) => {
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
    });

    // Draw enemies as monsters
    state.enemies.forEach((enemy) => {
      const size = enemy.type === 'tank' ? 18 : enemy.type === 'fast' ? 10 : 14;
      const color = ENEMY_TYPES[enemy.type].color;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.8, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (enemy.type === 'tank') {
        // Tank Monster - Big and armored
        // Body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        bodyGradient.addColorStop(0, color);
        bodyGradient.addColorStop(1, '#6a1b9a');
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-size * 0.9, -size * 0.6, size * 1.8, size * 1.4);
        
        // Armor plates
        ctx.fillStyle = '#4a148c';
        ctx.fillRect(-size * 0.7, -size * 0.4, size * 0.5, size * 0.3);
        ctx.fillRect(size * 0.2, -size * 0.4, size * 0.5, size * 0.3);
        ctx.fillRect(-size * 0.7, size * 0.1, size * 0.5, size * 0.3);
        ctx.fillRect(size * 0.2, size * 0.1, size * 0.5, size * 0.3);
        
        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -size * 0.3, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Horns
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size * 0.6);
        ctx.lineTo(-size * 0.7, -size);
        ctx.lineTo(-size * 0.3, -size * 0.5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.5, -size * 0.6);
        ctx.lineTo(size * 0.7, -size);
        ctx.lineTo(size * 0.3, -size * 0.5);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-size * 0.3, -size * 0.4, size * 0.15, size * 0.15);
        ctx.fillRect(size * 0.15, -size * 0.4, size * 0.15, size * 0.15);
        
      } else if (enemy.type === 'fast') {
        // Fast Monster - Slim and agile
        // Body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        bodyGradient.addColorStop(0, color);
        bodyGradient.addColorStop(1, '#e65100');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.6, size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -size * 0.5, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Ears/Spikes
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, -size * 0.7);
        ctx.lineTo(-size * 0.6, -size * 1.1);
        ctx.lineTo(-size * 0.2, -size * 0.6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(size * 0.4, -size * 0.7);
        ctx.lineTo(size * 0.6, -size * 1.1);
        ctx.lineTo(size * 0.2, -size * 0.6);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(-size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
        ctx.arc(size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.5);
        ctx.quadraticCurveTo(size * 0.8, size * 0.3, size * 1.2, size * 0.8);
        ctx.stroke();
        
      } else {
        // Normal Monster - Balanced
        // Body
        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        bodyGradient.addColorStop(0, color);
        bodyGradient.addColorStop(1, '#c62828');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, -size * 0.4, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
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
        
        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, size * 0.3, 0, Math.PI);
        ctx.stroke();
        
        // Arms
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(-size * 0.7, 0, size * 0.25, size * 0.5, -0.3, 0, Math.PI * 2);
        ctx.ellipse(size * 0.7, 0, size * 0.25, size * 0.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // HP Bar
      const hpPercent = enemy.hp / enemy.maxHp;
      const barWidth = size * 3;
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x - barWidth / 2 - 1, enemy.y - size - 12, barWidth + 2, 6);
      const hpColor = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FFC107' : '#f44336';
      ctx.fillStyle = hpColor;
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - size - 11, barWidth * hpPercent, 4);
    });
  });

  const state = gameStateRef.current;

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-8" style={{ backgroundImage: 'url(/background.png)' }}>
      <div className="max-w-6xl mx-auto bg-black/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-white">🎮 {t('towerDefense')}</h1>
          
          {/* Music Control Button */}
          <button
            onClick={toggleMusic}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-colors border-2 border-gray-600 hover:border-cyan-400"
          >
            {t(isMusicPlaying ? 'Music On' : 'Music Off')}
          </button>
        </div>

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
            {/* Tower List */}
            {myTowers.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-4 border-2 border-blue-500">
                <h3 className="text-white font-bold mb-2">
                  🗼 {t('selectTowersToPlace')}
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {myTowers.map(tower => {
                    const isPlaced = placedTowers.some(t => t.id === tower.id);
                    const isSelected = selectedTowerForPlacement?.id === tower.id;
                    
                    return (
                      <button
                        key={tower.id}
                        onClick={() => {
                          if (!isPlaced) {
                            setSelectedTowerForPlacement(tower);
                          }
                        }}
                        disabled={isPlaced}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          isPlaced
                            ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-cyan-600 hover:bg-cyan-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold ${RARITY_COLORS[tower.rarity]}`}>
                            {t(RARITY_NAMES[tower.rarity])}
                          </span>
                          {isPlaced && <span className="text-green-400">✓ {t('placed')}</span>}
                        </div>
                        <div className="text-sm text-gray-300 mt-1">
                          ⚔️ {tower.damage} | 🎯 {tower.range} | ⚡ {tower.fireRate}ms
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Tower Info */}
            {selectedCard !== null && (
              <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-4 border-2 border-cyan-400 backdrop-blur-sm">
                <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 font-bold mb-2">🎯 {t('Selected Tower')}</h3>
                <div className="space-y-1">
                  <p className="text-white">{t('Damage:')} {availableCards[selectedCard].tower.damage}</p>
                  <p className="text-white">{t('Range:')} {availableCards[selectedCard].tower.range}</p>
                  <p className="text-white">{t('Fire Rate:')} {availableCards[selectedCard].tower.fireRate}ms</p>
                  <p className={`font-bold ${['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'][availableCards[selectedCard].tower.rarity]}`}>
                    ⭐ {t(['', 'Common', 'Rare', 'Epic', 'Legendary'][availableCards[selectedCard].tower.rarity])}
                  </p>
                </div>
              </div>
            )}

            {/* Tower Cards */}
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-4 border-2 border-purple-400 backdrop-blur-sm">
              <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300 font-bold mb-3">🃏 {t('yourTowers', { count: availableCards.length })}</h3>
              <div className="grid grid-cols-5 gap-2">
                {availableCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => !card.used && setSelectedCard(card.id)}
                    disabled={card.used || state.isWaveActive}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                      card.used
                        ? 'bg-gray-800 border-gray-600 cursor-not-allowed opacity-50'
                        : selectedCard === card.id
                        ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-cyan-400 shadow-lg shadow-cyan-500/50 scale-105'
                        : 'bg-gradient-to-br from-gray-800 to-gray-900 border-purple-500/50 hover:border-cyan-400 hover:scale-105 cursor-pointer'
                    }`}
                  >
                    {card.used ? (
                      <span className="text-2xl text-gray-500">✓</span>
                    ) : (
                      <TowerCardIcon rarity={card.tower.rarity} />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-cyan-200 mt-2 text-center">
                {selectedCard !== null ? `⚔️${availableCards[selectedCard].tower.damage} 🎯${availableCards[selectedCard].tower.range}` : `👆 ${t('selectATower')}`}
              </p>
            </div>

            {/* Game Stats */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">📊 {t('Stats')}</h3>
              <p className="text-white">{t('wave')}: {state.wave}/5</p>
              <p className="text-white">{t('lives')}: ❤️ {state.lives}</p>
              <p className="text-white">{t('Towers')}: {state.towers.length}/5</p>
              <p className="text-white">{t('Enemies')}: {state.enemies.length}</p>
            </div>

            {!state.isWaveActive && !state.gameOver && !state.victory && state.wave === 1 && (
              <button
                onClick={handleStartWave}
                disabled={state.towers.length === 0}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {state.towers.length === 0 ? `⚠️ ${t('placeTowersFirst')}` : `🚀 ${t('startGame')}`}
              </button>
            )}
            
            {state.isWaveActive && (
              <div className="w-full bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500 rounded-xl px-4 py-3">
                <p className="text-red-400 font-bold text-center animate-pulse">⚔️ {t('waveInProgress', { wave: state.wave })}</p>
              </div>
            )}

            {(state.gameOver || state.victory) && (
              <>
                <div className="bg-gradient-to-br from-yellow-900 to-orange-900 rounded-xl p-4 border-2 border-yellow-500">
                  <h3 className="text-white font-bold mb-2 text-center">
                    {state.victory ? `🎉 ${t('Victory!')}` : `💀 ${t('gameOver')}`}
                  </h3>
                  <div className="text-center mb-3">
                    {(() => {
                      const wavesCleared = state.victory ? 5 : (state.wave > 1 ? state.wave - 1 : 0);
                      const dropChance = getNFTDropChance(wavesCleared);
                      return (
                        <>
                          <p className={`text-2xl font-bold ${dropChance > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {dropChance > 0 ? `🎁 ${dropChance}% ${t('nftDrop')}` : t('noReward')}
                          </p>
                          <p className="text-gray-300 text-sm">
                            {t('clearedWaves', { waves: wavesCleared })}
                          </p>
                          {dropChance > 0 && (
                            <p className="text-green-400 text-xs mt-1">
                              {t('chanceToGetRewardTower')}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {submitting && (
                    <p className="text-white text-sm text-center mb-2">
                      💫 {t('submittingToBlockchain')}
                    </p>
                  )}
                  {!towerNftId && (
                    <p className="text-gray-400 text-xs text-center">
                      {t('testModeNoSubmission')}
                    </p>
                  )}
                </div>

                {towerNftId && !submitting && !submitted && (
                  <button
                    onClick={() => handleSubmitResult(state.victory ? 5 : (state.wave > 1 ? state.wave - 1 : 0))}
                    className="w-full bg-yellow-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-yellow-600"
                  >
                    📤 {t('submitAndRoll')}
                  </button>
                )}

                {submitted && (
                  <div className="bg-green-500/20 border border-green-500 rounded-xl p-3">
                    <p className="text-green-400 text-center font-bold">✅ {t('resultSubmitted')}</p>
                  </div>
                )}

                <Link
                  href="/history"
                  className="block w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600 text-center"
                >
                  📊 {t('viewHistory')}
                </Link>

                <Link
                  href="/"
                  className="block w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 text-center"
                >
                  🎮 {t('playAgain')}
                </Link>
              </>
            )}

            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">💡 {t('tips')}</h3>
              <p className="text-xs text-gray-300">• {t('tipSelectCard')}</p>
              <p className="text-xs text-gray-300">• {t('tipBuildOnPath')}</p>
              <p className="text-xs text-gray-300">• {t('tipPlaceCorners')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Card Modal */}
      {showRewardCard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 border-4 border-yellow-500 max-w-md w-full mx-4 animate-bounce">
            <h2 className="text-3xl font-bold text-white text-center mb-6">
              🎰 {t('nftRewardRoll')}
            </h2>
            
            {!rewardResult ? (
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl animate-spin flex items-center justify-center">
                  <span className="text-6xl">🎁</span>
                </div>
                <p className="text-white text-xl font-bold">{t('rolling')}...</p>
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
                      {t(rewardResult.tower.rarityName)}
                    </p>
                    <p className="text-white text-xl mb-4">{t('Tower NFT!')}</p>
                    
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <div className="space-y-2 text-left">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('Damage:')}</span>
                          <span className="text-white font-bold">{rewardResult.tower.damage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('Range:')}</span>
                          <span className="text-white font-bold">{rewardResult.tower.range}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('Fire Rate:')}</span>
                          <span className="text-white font-bold">{rewardResult.tower.fireRate}ms</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-green-400 text-sm mb-4">✨ {t('addedToInventory')}</p>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-xl flex items-center justify-center">
                      <span className="text-6xl">📦</span>
                    </div>
                    <p className="text-gray-400 text-3xl font-bold mb-2">{t('No Drop')}</p>
                    <p className="text-white text-xl mb-4">{t('betterLuckNextTime')}</p>
                    <p className="text-gray-300 text-sm">{t('youHadChance', { chance: rewardResult.dropChance })}</p>
                  </>
                )}
                
                <button
                  onClick={() => setShowRewardCard(false)}
                  className="mt-6 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600"
                >
                  {t('close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wave Transition Animation */}
      {showWaveTransition && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="text-center">
            <div className="mb-8 animate-bounce">
              <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse">
                {t('waveTitle', { wave: transitionWave })}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="h-1 w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
                <div className="text-2xl text-cyan-400 font-bold animate-pulse">{t('incoming')}</div>
                <div className="h-1 w-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
              </div>
              
              <div className="text-white text-lg">
                {transitionWave === 2 && t('fastEnemiesIncoming')}
                {transitionWave === 3 && t('speedAndPower')}
                {transitionWave === 4 && t('tankUnitsDetected')}
                {transitionWave === 5 && t('finalWave')}
              </div>
              
              <div className="mt-8">
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400 rounded-xl">
                  <span className="text-cyan-300 font-bold">{t('prepareYourself')}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal - Only shows on Victory or Game Over */}
      {showGameOverModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-3xl p-8 border-4 shadow-2xl ${
            state.victory 
              ? 'bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 border-yellow-300'
              : 'bg-gradient-to-br from-red-600 via-purple-600 to-gray-800 border-red-400'
          }`}>
            <div className="text-center">
              <div className="text-8xl mb-4 animate-bounce">
                {state.victory ? '🏆' : '💀'}
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {t(state.victory ? 'victory' : 'gameOver')}
              </h2>
              
              <p className="text-2xl text-white mb-6 drop-shadow-lg">
                {state.victory 
                  ? t('clearedAllWaves') 
                  : t('clearedWaves', { waves: state.wave > 1 ? state.wave - 1 : 0 })
                }
              </p>

              {(() => {
                const wavesCleared = state.victory ? 5 : (state.wave > 1 ? state.wave - 1 : 0);
                const dropChance = getNFTDropChance(wavesCleared);
                const rewardInfo = getRewardInfo(wavesCleared);
                
                return dropChance > 0 ? (
                  <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mb-6 border-2 border-white/30">
                    <p className="text-white font-bold mb-2">🎁 {t('nftRewardChance')}</p>
                    <p className={`text-3xl font-bold ${rewardInfo.color}`}>
                      {dropChance}%
                    </p>
                    <p className="text-white text-sm mt-1">
                      {t('rarityTower', { rarity: rewardInfo.rarity })}
                    </p>
                  </div>
                ) : (
                  <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mb-6 border-2 border-white/30">
                    <p className="text-gray-300">{t('clear2WavesForNft')}</p>
                  </div>
                );
              })()}

              {!submitted ? (
                state.victory ? (
                  // Victory - Direct submit
                  <button
                    onClick={() => {
                      handleSubmitResult(5);
                    }}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg disabled:opacity-50"
                  >
                    {submitting ? `⏳ ${t('Submitting...')}` : `📤 ${t('submitResult')}`}
                  </button>
                ) : (
                  // Failed - Show sacrifice selection
                  <button
                    onClick={() => {
                      setShowGameOverModal(false);
                      setShowSacrificeModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-red-400 to-orange-400 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
                  >
                    ⚔️ {t('chooseTowerToSacrifice')}
                  </button>
                )
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-500/30 border-2 border-green-400 rounded-xl p-3">
                    <p className="text-white font-bold text-center">✅ {t('resultSubmitted')}</p>
                    <p className="text-white text-sm text-center mt-2">{t('redirectingToHome')}</p>
                  </div>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
                  >
                    🏠 {t('backToHomeNow')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sacrifice Tower Selection Modal */}
      {showSacrificeModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full bg-gradient-to-br from-red-900/90 to-gray-900/90 rounded-3xl p-8 border-4 border-red-500 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-4xl font-bold text-white mb-2">{t('chooseTowerToSacrifice')}</h2>
              <p className="text-red-300 text-lg">
                {t('failedToCompleteWaves')}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {t('clearedWaves', { waves: state.wave > 1 ? state.wave - 1 : 0 })}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto mb-6">
              {allTowers?.data?.map((obj: any) => {
                const content = obj.data?.content;
                if (content?.dataType !== 'moveObject' || !content.fields) return null;
                
                const tower = {
                  id: obj.data.objectId,
                  damage: Number(content.fields.damage),
                  range: Number(content.fields.range),
                  fireRate: Number(content.fields.fire_rate),
                  rarity: Number(content.fields.rarity),
                };
                
                const RARITY_COLORS: Record<number, string> = {
                  1: 'text-gray-400',
                  2: 'text-blue-400',
                  3: 'text-purple-400',
                  4: 'text-yellow-400',
                };

                return (
                  <div
                    key={tower.id}
                    onClick={() => setSacrificeTowerId(tower.id)}
                    className={`bg-gradient-to-br from-black/60 to-gray-900/60 rounded-xl p-4 cursor-pointer border-2 transition-all hover:scale-105 ${
                      sacrificeTowerId === tower.id
                        ? 'border-red-500 shadow-lg shadow-red-500/50'
                        : 'border-gray-700 hover:border-red-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-sm ${RARITY_COLORS[tower.rarity]}`}>
                        {t(RARITY_NAMES[tower.rarity])}
                      </span>
                      {sacrificeTowerId === tower.id && (
                        <span className="text-red-500 text-xl">🔥</span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">⚔️ {t('DMG:')}</span>
                        <span className="text-white font-bold">{tower.damage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">🎯 {t('RNG:')}</span>
                        <span className="text-white font-bold">{tower.range}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">⚡ {t('FR:')}</span>
                        <span className="text-white font-bold">{tower.fireRate}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <span className="text-gray-500 text-xs">
                        {tower.id.slice(0, 6)}...{tower.id.slice(-4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowSacrificeModal(false);
                  setShowGameOverModal(true);
                  setSacrificeTowerId(null);
                }}
                className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors"
              >
                {t('Back')}
              </button>
              
              <button
                onClick={() => {
                  if (!sacrificeTowerId) {
                    alert(t('selectTowerToSacrifice'));
                    return;
                  }
                  const wavesCleared = state.wave > 1 ? state.wave - 1 : 0;
                  setShowSacrificeModal(false);
                  setShowGameOverModal(true);
                  handleSubmitResult(wavesCleared, sacrificeTowerId);
                }}
                disabled={!sacrificeTowerId || submitting}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? `⏳ ${t('Submitting...')}` : `🔥 ${t('sacrificeAndSubmit')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  const { t } = useI18n();
  return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><p className="text-white">{t('Loading...')}</p></div>;
}

export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PlayPageContent />
    </Suspense>
  );
}
