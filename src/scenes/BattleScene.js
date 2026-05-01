// BattleScene.js
// 自動回合制戰鬥場景
// - 雙方自動互打，有攻擊動畫與傷害數字
// - 玩家無需按攻擊，只觀看
// - 所有敵人死亡後 → 進入杯球台
// - 玩家 HP 歸零 → 遊戲結束

import { BattleEngine }                            from '../game/BattleEngine.js'
import { T }                                       from '../utils/theme.js'
import { drawSky, drawGround, drawHpBar, rrect }   from '../utils/drawHelpers.js'

const BATTLE_CLOUDS = [
  { x: 40,  y: 60,  scale: 0.75 },
  { x: 220, y: 38,  scale: 0.95 },
  { x: 350, y: 75,  scale: 0.65 },
]

export class BattleScene {
  constructor(canvas, ctx, gameState, onVictory, onDefeat) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = gameState;
    this.onVictory = onVictory; // () => void
    this.onDefeat  = onDefeat;  // () => void

    // 玩家
    this.player = {
      name: gameState.hero?.name || 'Knight Cup',
      hp:     gameState.hero?.hp    || 100,
      maxHp:  gameState.hero?.maxHp || 100,
      atk:    gameState.hero?.atk   || 15,
      def:    gameState.hero?.def   || 5,
      x: 120, y: 260,
    };

    // 敵人（根據波次生成）
    this.enemies = this._generateEnemies();

    // 戰鬥狀態
    this.phase = 'player_attack'; // player_attack | enemy_attack | wait | end
    this.timer = 0;
    this.attackDelay = 60;  // frame 數，攻擊頻率
    this.currentEnemy = 0;  // 當前攻擊的敵人索引

    // 視覺效果
    this.floatingTexts = [];  // { x, y, text, color, life, maxLife }
    this.shakeTarget = null;  // 'player' | 'enemy_0' 等
    this.shakeTimer = 0;

    this.animId = null;
    this._loop = this._loop.bind(this);
  }

  // ─── 生成敵人 ──────────────────────────────────────────
  _generateEnemies() {
    const wave = this.gameState.currentWave || 1;
    const isBoss = wave % 5 === 0;

    if (isBoss) {
      return [{
        name: `Boss Lv.${Math.floor(wave / 5)}`,
        hp:    100 + wave * 20,
        maxHp: 100 + wave * 20,
        atk:   8  + wave * 2,
        def:   4  + wave,
        x: 360, y: 230,
        size: 70,
        color: '#c0392b',
        isBoss: true,
      }];
    }

    // 普通波次：1~3 隻敵人
    const count = Math.min(1 + Math.floor(wave / 3), 3);
    return Array.from({ length: count }, (_, i) => ({
      name:  ['Slime', 'Goblin', 'Orc'][i % 3],
      hp:    20 + wave * 8,
      maxHp: 20 + wave * 8,
      atk:   5  + wave * 1.5,
      def:   2  + Math.floor(wave / 2),
      x: 320 + i * 90, y: 250,
      size: 45,
      color: ['#27ae60', '#8e44ad', '#e67e22'][i % 3],
      isBoss: false,
    }));
  }

  // ─── 主迴圈 ────────────────────────────────────────────
  start() {
    this.animId = requestAnimationFrame(this._loop);
  }

  _loop() {
    this._update();
    this._draw();
    if (this.phase !== 'end') {
      this.animId = requestAnimationFrame(this._loop);
    }
  }

  _update() {
    this.timer++;

    // 更新浮動文字
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    for (const ft of this.floatingTexts) {
      ft.y -= 1.2;
      ft.life--;
    }

    // 震動
    if (this.shakeTimer > 0) this.shakeTimer--;

    if (this.phase === 'player_attack') {
      if (this.timer >= this.attackDelay) {
        this.timer = 0;
        this._doPlayerAttack();
      }
    } else if (this.phase === 'enemy_attack') {
      if (this.timer >= this.attackDelay) {
        this.timer = 0;
        this._doEnemyAttack();
      }
    }
  }

  _doPlayerAttack() {
    // 找第一個存活的敵人
    const target = this.enemies.find(e => e.hp > 0);
    if (!target) {
      this._victory();
      return;
    }

    const { damage, isCrit } = BattleEngine.playerAttack(this.player, target);

    this._addFloat(target.x, target.y - target.size / 2, isCrit ? `暴擊！${damage}` : `-${damage}`, isCrit ? '#ffd700' : '#ff6b6b');
    this.shakeTarget = 'enemy';
    this.shakeTimer = 8;

    if (target.hp <= 0) {
      this._addFloat(target.x, target.y - target.size, '擊倒！', '#00ff88');
    }

    // 切換到敵人攻擊
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (allDead) {
      this._victory();
    } else {
      this.phase = 'enemy_attack';
    }
  }

  _doEnemyAttack() {
    const alive = this.enemies.filter(e => e.hp > 0);
    if (alive.length === 0) { this._victory(); return; }

    const { results, playerDead } = BattleEngine.enemyAttack(alive, this.player);

    for (const { damage } of results) {
      this._addFloat(
        this.player.x + (Math.random() - 0.5) * 30,
        this.player.y - 40,
        `-${damage}`,
        '#ff4444'
      );
    }

    this.shakeTarget = 'player';
    this.shakeTimer = 8;

    if (playerDead) {
      this._defeat();
    } else {
      this.phase = 'player_attack';
    }
  }

  _victory() {
    this.phase = 'end';
    // 更新 gameState 的玩家 HP
    this.gameState.hero.hp = this.player.hp;
    this.gameState.currentWave = (this.gameState.currentWave || 1) + 1;
    if (this.animId) cancelAnimationFrame(this.animId);
    setTimeout(() => this.onVictory(), 800);
  }

  _defeat() {
    this.phase = 'end';
    if (this.animId) cancelAnimationFrame(this.animId);
    setTimeout(() => this.onDefeat(), 800);
  }

  _addFloat(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 50, maxLife: 50 });
  }

  // ─── 繪製 ──────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // ── 天空背景 ──────────────────────────────────────────
    const groundY = H - 100;
    drawSky(ctx, W, H, BATTLE_CLOUDS);
    drawGround(ctx, W, H, groundY);

    // ── 波次資訊牌 ────────────────────────────────────────
    const wave   = this.gameState.currentWave || 1;
    const isBoss = wave % 5 === 0;
    ctx.textAlign = 'center';

    // 牌子背景
    const panelW = 200, panelH = 44;
    const px     = W / 2 - panelW / 2;
    const woodGr = ctx.createLinearGradient(px, 4, px, 4 + panelH);
    woodGr.addColorStop(0, isBoss ? '#8b0000' : T.woodLight);
    woodGr.addColorStop(1, isBoss ? '#4a0000' : T.woodDark);
    ctx.fillStyle = woodGr;
    rrect(ctx, px, 4, panelW, panelH, 10); ctx.fill();
    ctx.strokeStyle = isBoss ? '#ff6666' : T.woodDark; ctx.lineWidth = 2;
    rrect(ctx, px, 4, panelW, panelH, 10); ctx.stroke();

    ctx.fillStyle = isBoss ? '#ff8888' : T.gold;
    ctx.font      = `bold ${isBoss ? 16 : 14}px sans-serif`;
    ctx.fillText(isBoss ? `👑 Boss Wave ${wave}！` : `Wave ${wave} / 15`, W / 2, 21);
    ctx.fillStyle = this.phase === 'player_attack' ? '#80e8ff' : '#ffb080';
    ctx.font      = '12px sans-serif';
    ctx.fillText(this.phase === 'player_attack' ? '⚔ 你的回合' : '🔥 敵人攻擊中', W / 2, 38);

    // ── 玩家 ──────────────────────────────────────────────
    this._drawPlayer();

    // ── 敵人 ──────────────────────────────────────────────
    this.enemies.forEach((enemy, i) => {
      if (enemy.hp > 0) this._drawEnemy(enemy, i);
    });

    // ── HP 條 ─────────────────────────────────────────────
    drawHpBar(ctx, 18, H - 88, 170, 20, this.player.hp, this.player.maxHp, this.player.name, T.heroBlue);
    this.enemies.forEach((enemy, i) => {
      if (enemy.hp > 0) {
        drawHpBar(ctx, W - 198 - i * 8, H - 88 - i * 26, 170, 18,
          enemy.hp, enemy.maxHp, enemy.name, enemy.isBoss ? '#e74c3c' : '#e67e22');
      }
    });

    // ── 浮動傷害文字 ──────────────────────────────────────
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      const isCritText = ft.text.includes('暴擊');
      ctx.fillStyle = ft.color;
      if (isCritText) { ctx.shadowColor = ft.color; ctx.shadowBlur = 12; }
      ctx.font = `bold ${isCritText ? 22 : 16}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  _drawPlayer() {
    const ctx  = this.ctx;
    const H    = this.canvas.height;
    const groundY = H - 100;
    const y    = groundY;
    const { x } = this.player;
    const shake = this.shakeTarget === 'player' && this.shakeTimer > 0
      ? Math.sin(this.shakeTimer * 1.5) * 6 : 0;
    const px = x + shake;

    // 陰影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(px, y + 4, 22, 6, 0, 0, Math.PI * 2); ctx.fill();

    // 杯身（梯形）
    const cw = 46, ch = 54, bw = 34;
    const ty = y - ch;
    const cupG = ctx.createLinearGradient(px - cw/2, ty, px + cw/2, ty);
    cupG.addColorStop(0,   '#2090f0');
    cupG.addColorStop(0.4, '#50b8ff');
    cupG.addColorStop(1,   '#0060c8');
    ctx.fillStyle = cupG;
    ctx.beginPath();
    ctx.moveTo(px - cw/2, ty); ctx.lineTo(px + cw/2, ty);
    ctx.lineTo(px + bw/2, y);  ctx.lineTo(px - bw/2, y);
    ctx.closePath(); ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(px - cw/2 + 5, ty + 4); ctx.lineTo(px + cw/2 * 0.5, ty + 4);
    ctx.lineTo(px + bw/2 * 0.5, y - 6); ctx.lineTo(px - bw/2 + 5, y - 6);
    ctx.closePath(); ctx.fill();
    // 杯口
    ctx.fillStyle = '#70d0ff';
    ctx.fillRect(px - cw/2 - 3, ty - 5, cw + 6, 10);
    ctx.strokeStyle = '#005faa'; ctx.lineWidth = 1.5;
    ctx.strokeRect(px - cw/2 - 3, ty - 5, cw + 6, 10);
    // 輪廓
    ctx.strokeStyle = '#005faa'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - cw/2, ty); ctx.lineTo(px + cw/2, ty);
    ctx.lineTo(px + bw/2, y);  ctx.lineTo(px - bw/2, y);
    ctx.closePath(); ctx.stroke();

    // 眼睛
    const eyeY = ty + ch * 0.36;
    for (const ex2 of [px - 9, px + 9]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(ex2, eyeY, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a3a7a';
      ctx.beginPath(); ctx.ellipse(ex2 + 1, eyeY + 1, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex2 + 2, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // 嘴
    ctx.strokeStyle = '#1a3a7a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, eyeY + 12, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

    // 劍
    ctx.save(); ctx.translate(px + 30, y - 36); ctx.rotate(-0.5);
    ctx.fillStyle = '#d8e8f8'; ctx.fillRect(-2.5, -24, 5, 30);
    ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 1; ctx.strokeRect(-2.5, -24, 5, 30);
    ctx.fillStyle = T.gold; ctx.fillRect(-8, 0, 16, 4);
    ctx.fillStyle = T.woodMid; ctx.fillRect(-2, 4, 4, 11);
    ctx.restore();

    // 名字
    ctx.fillStyle = T.textDark; ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.name, px, y + 18);
  }

  _drawEnemy(enemy, index) {
    const ctx   = this.ctx;
    const H     = this.canvas.height;
    const groundY = H - 100;
    const shake = this.shakeTarget === 'enemy' && this.shakeTimer > 0
      ? Math.sin(this.shakeTimer * 1.5) * 6 : 0;
    const ex = enemy.x + shake;
    const ey = groundY - enemy.size / 2;
    const s  = enemy.size;

    // 陰影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex, groundY + 4, s * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill();

    // 身體
    const eG = ctx.createRadialGradient(ex - s*0.15, ey - s*0.15, s*0.05, ex, ey, s*0.5);
    eG.addColorStop(0, _lighten(enemy.color, 40));
    eG.addColorStop(1, enemy.color);
    ctx.fillStyle = eG;
    ctx.beginPath(); ctx.arc(ex, ey, s / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = _darken(enemy.color, 40); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey, s / 2, 0, Math.PI * 2); ctx.stroke();

    // Boss 皇冠
    if (enemy.isBoss) {
      ctx.fillStyle = T.gold;
      ctx.beginPath();
      ctx.moveTo(ex - 20, ey - s/2 + 2);
      ctx.lineTo(ex - 20, ey - s/2 - 16);
      ctx.lineTo(ex - 8,  ey - s/2 - 6);
      ctx.lineTo(ex,      ey - s/2 - 20);
      ctx.lineTo(ex + 8,  ey - s/2 - 6);
      ctx.lineTo(ex + 20, ey - s/2 - 16);
      ctx.lineTo(ex + 20, ey - s/2 + 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = T.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // 眼睛（凶惡）
    for (const eyeX of [ex - 8, ex + 8]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(eyeX, ey - 6, 6, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8b0000';
      ctx.beginPath(); ctx.ellipse(eyeX + 1, ey - 5, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(eyeX + 2, ey - 7, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // 皺眉（Boss 才有）
    if (enemy.isBoss) {
      ctx.strokeStyle = '#4a0000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex - 14, ey - 14); ctx.lineTo(ex - 5, ey - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + 14, ey - 14); ctx.lineTo(ex + 5, ey - 10); ctx.stroke();
    }

    // 名字
    ctx.fillStyle = '#fff';
    ctx.font      = `bold ${enemy.isBoss ? 13 : 11}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(enemy.name, ex, groundY + 18);
    ctx.shadowBlur = 0;
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}

// ── 顏色工具 ──────────────────────────────────────────────
function _lighten(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1,3),16) + amount)
  const g = Math.min(255, parseInt(hex.slice(3,5),16) + amount)
  const b = Math.min(255, parseInt(hex.slice(5,7),16) + amount)
  return `rgb(${r},${g},${b})`
}
function _darken(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1,3),16) - amount)
  const g = Math.max(0, parseInt(hex.slice(3,5),16) - amount)
  const b = Math.max(0, parseInt(hex.slice(5,7),16) - amount)
  return `rgb(${r},${g},${b})`
}
