// BattleScene.js
// 自動回合制戰鬥場景
// - 雙方自動互打，有攻擊動畫與傷害數字
// - 玩家無需按攻擊，只觀看
// - 所有敵人死亡後 → 進入杯球台
// - 玩家 HP 歸零 → 遊戲結束

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

    const dmg = Math.max(1, Math.floor(this.player.atk - target.def * 0.5) + Math.floor(Math.random() * 5));
    target.hp = Math.max(0, target.hp - dmg);

    // 暴擊判定
    const isCrit = Math.random() < 0.15;
    const finalDmg = isCrit ? dmg * 2 : dmg;
    target.hp = Math.max(0, target.hp + dmg - finalDmg); // 修正

    this._addFloat(target.x, target.y - target.size / 2, isCrit ? `暴擊！${finalDmg}` : `-${dmg}`, isCrit ? '#ffd700' : '#ff6b6b');
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

    // 每隻存活的敵人攻擊玩家
    for (const enemy of alive) {
      const dmg = Math.max(1, Math.floor(enemy.atk - this.player.def * 0.4) + Math.floor(Math.random() * 4));
      this.player.hp = Math.max(0, this.player.hp - dmg);
      this._addFloat(
        this.player.x + (Math.random() - 0.5) * 30,
        this.player.y - 40,
        `-${dmg}`,
        '#ff4444'
      );
    }

    this.shakeTarget = 'player';
    this.shakeTimer = 8;

    if (this.player.hp <= 0) {
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

    // 背景
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, W, H);

    // 地面線
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();

    // 波次資訊
    ctx.fillStyle = '#aaa';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    const wave = this.gameState.currentWave || 1;
    const isBoss = wave % 5 === 0;
    ctx.fillStyle = isBoss ? '#ff4444' : '#aaa';
    ctx.fillText(isBoss ? `⚔ Boss Wave ${wave} ⚔` : `Wave ${wave} / 15`, W / 2, 24);

    // 回合狀態
    ctx.fillStyle = this.phase === 'player_attack' ? '#4fc3f7' : '#ff8a65';
    ctx.font = '12px sans-serif';
    ctx.fillText(this.phase === 'player_attack' ? '▶ 玩家攻擊中...' : '▶ 敵人攻擊中...', W / 2, 42);

    // 玩家
    this._drawPlayer();

    // 敵人
    this.enemies.forEach((enemy, i) => {
      if (enemy.hp > 0) this._drawEnemy(enemy, i);
    });

    // HP 條（玩家）
    this._drawHpBar(30, H - 70, 180, 18, this.player.hp, this.player.maxHp, this.player.name, '#4fc3f7');

    // HP 條（敵人）
    this.enemies.forEach((enemy, i) => {
      if (enemy.hp > 0) {
        this._drawHpBar(
          W - 220 - i * 10, H - 70 - i * 25,
          180, 16,
          enemy.hp, enemy.maxHp,
          enemy.name,
          enemy.isBoss ? '#e74c3c' : '#e67e22'
        );
      }
    });

    // 浮動傷害文字
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.text.includes('暴擊') ? 18 : 15}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  _drawPlayer() {
    const ctx = this.ctx;
    const { x, y } = this.player;
    const shake = this.shakeTarget === 'player' && this.shakeTimer > 0
      ? Math.sin(this.shakeTimer * 1.5) * 6 : 0;

    const px = x + shake;

    // 身體（杯子造型）
    ctx.fillStyle = '#5c8bd6';
    ctx.beginPath();
    ctx.moveTo(px - 25, y - 50);
    ctx.lineTo(px + 25, y - 50);
    ctx.lineTo(px + 18, y);
    ctx.lineTo(px - 18, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a6abf';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 頭（圓）
    ctx.beginPath();
    ctx.arc(px, y - 62, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#f5cba7';
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(px - 5, y - 64, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 5, y - 64, 2.5, 0, Math.PI * 2); ctx.fill();

    // 劍
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 22, y - 55);
    ctx.lineTo(px + 45, y - 80);
    ctx.stroke();

    // 名字
    ctx.fillStyle = '#4fc3f7';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.player.name, px, y + 16);
  }

  _drawEnemy(enemy, index) {
    const ctx = this.ctx;
    const shake = this.shakeTarget === 'enemy' && this.shakeTimer > 0
      ? Math.sin(this.shakeTimer * 1.5) * 6 : 0;

    const ex = enemy.x + shake;
    const ey = enemy.y;
    const s  = enemy.size;

    // 身體
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(ex, ey, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Boss 皇冠
    if (enemy.isBoss) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(ex - 20, ey - s / 2);
      ctx.lineTo(ex - 20, ey - s / 2 - 14);
      ctx.lineTo(ex - 8,  ey - s / 2 - 6);
      ctx.lineTo(ex,      ey - s / 2 - 18);
      ctx.lineTo(ex + 8,  ey - s / 2 - 6);
      ctx.lineTo(ex + 20, ey - s / 2 - 14);
      ctx.lineTo(ex + 20, ey - s / 2);
      ctx.closePath();
      ctx.fill();
    }

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex - 7, ey - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 7, ey - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(ex - 7, ey - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 7, ey - 5, 2.5, 0, Math.PI * 2); ctx.fill();

    // 名字
    ctx.fillStyle = '#eee';
    ctx.font = `${enemy.isBoss ? 13 : 11}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name, ex, ey + s / 2 + 16);
  }

  _drawHpBar(x, y, w, h, hp, maxHp, label, color) {
    const ctx = this.ctx;
    const pct = Math.max(0, hp / maxHp);

    // 背景
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);

    // 血條
    const barColor = pct > 0.5 ? color : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, w * pct, h);

    // 邊框
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}  ${Math.ceil(hp)} / ${maxHp}`, x + 4, y + h - 3);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
