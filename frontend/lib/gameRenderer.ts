// Shared game rendering functions for Tower Defense

// Rarity colors for towers
export const RARITY_COLORS = {
  1: { light: '#9e9e9e', mid: '#757575', dark: '#424242', glow: '#bdbdbd' }, // Common - Gray
  2: { light: '#42a5f5', mid: '#2196f3', dark: '#1565c0', glow: '#64b5f6' }, // Rare - Blue
  3: { light: '#ab47bc', mid: '#9c27b0', dark: '#6a1b9a', glow: '#ce93d8' }, // Epic - Purple
  4: { light: '#ffd54f', mid: '#ffc107', dark: '#f57c00', glow: '#ffe082' }, // Legendary - Gold
};

interface Tower {
  x: number;
  y: number;
  damage: number;
  range: number;
  rarity: number;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'normal' | 'fast' | 'tank';
}

// Draw a tower with rarity-based colors
export function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Tower,
  targetAngle: number = -Math.PI / 2
) {
  const colors = RARITY_COLORS[tower.rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS[2];

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

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(tower.x, tower.y + 18, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

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
}

// Draw an enemy as a monster
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  monsterType: number = 1
) {
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
    // Tank Monster - Big and armored
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    bodyGradient.addColorStop(0, enemyColor);
    bodyGradient.addColorStop(1, '#6a1b9a');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-size * 0.9, -size * 0.6, size * 1.8, size * 1.4);
    
    ctx.fillStyle = '#4a148c';
    ctx.fillRect(-size * 0.7, -size * 0.4, size * 0.5, size * 0.3);
    ctx.fillRect(size * 0.2, -size * 0.4, size * 0.5, size * 0.3);
    ctx.fillRect(-size * 0.7, size * 0.1, size * 0.5, size * 0.3);
    ctx.fillRect(size * 0.2, size * 0.1, size * 0.5, size * 0.3);
    
    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
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
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-size * 0.3, -size * 0.4, size * 0.15, size * 0.15);
    ctx.fillRect(size * 0.15, -size * 0.4, size * 0.15, size * 0.15);
    
  } else if (monsterType === 2) {
    // Fast Monster - Slim and agile
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
    
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
    ctx.arc(size * 0.2, -size * 0.5, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = enemyColor;
    ctx.lineWidth = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.quadraticCurveTo(size * 0.8, size * 0.3, size * 1.2, size * 0.8);
    ctx.stroke();
    
  } else {
    // Normal Monster - Balanced
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
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.3, 0, Math.PI);
    ctx.stroke();
    
    ctx.fillStyle = enemyColor;
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
}
