// CupGameScene.js
// 杯球彈珠台場景
// - 上方杯子可左右移動，持續倒球
// - 中間有隨機釘板，球會彈射
// - 底部有隨機乘數格
// - 所有球落定後計算總資源，進入升級場景

export class CupGameScene {
  constructor(canvas, ctx, gameState, onComplete) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = gameState;
    this.onComplete = onComplete; // (totalBalls) => void

    // 杯子設定
    this.cup = {
      x: canvas.width / 2,
      y: 60,
      width: 60,
      height: 40,
      speed: 6,
      ballsLeft: this._initialBalls(),
      pourRate: 0,      // 倒球計時器
      pourInterval: 8,  // 每幾 frame 倒一顆
    };

    // 鍵盤狀態
    this.keys = {};
    this._onKeyDown = (e) => { this.keys[e.key] = true; };
    this._onKeyUp   = (e) => { this.keys[e.key] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);

    // 觸控拖曳（手機）
    this.touchX = null;
    this._onTouchMove = (e) => {
      e.preventDefault();
      this.touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    };
    this._onTouchEnd = () => { this.touchX = null; };
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend',  this._onTouchEnd);

    // 物理球
    this.balls = [];
    this.settledCount = 0;
    this.totalScore = 0;
    this.done = false;
    this.doneTimer = 0; // 全部落定後等幾 frame 再結束

    // 釘子（隨機生成）
    this.pegs = this._generatePegs();

    // 底部格子（隨機乘數）
    this.slots = this._generateSlots();

    // 動畫 ID
    this.animId = null;
    this._loop = this._loop.bind(this);
  }

  // ─── 初始球數（根據波次） ───────────────────────────────
  _initialBalls() {
    const wave = this.gameState.currentWave || 1;
    return 10 + wave * 2; // wave 1 = 12顆, wave 15 = 40顆
  }

  // ─── 生成隨機釘子 ──────────────────────────────────────
  _generatePegs() {
    const pegs = [];
    const rows = 6;
    const cols = 9;
    const startY = 130;
    const endY   = this.canvas.height - 120;
    const startX = 60;
    const endX   = this.canvas.width - 60;

    for (let r = 0; r < rows; r++) {
      const count = cols - (r % 2 === 0 ? 0 : 1);
      const offsetX = r % 2 === 0 ? 0 : (endX - startX) / (cols * 2);
      for (let c = 0; c < count; c++) {
        const x = startX + offsetX + c * (endX - startX) / (count - 1 || 1);
        const y = startY + r * (endY - startY) / (rows - 1);
        // 隨機小偏移讓釘板更自然
        pegs.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 10,
          r: 5,
        });
      }
    }
    return pegs;
  }

  // ─── 生成隨機底部乘數格 ────────────────────────────────
  _generateSlots() {
    const count = 7;
    const slotW = (this.canvas.width - 40) / count;
    const y = this.canvas.height - 80;
    const multipliers = this._randomMultipliers(count);

    return Array.from({ length: count }, (_, i) => ({
      x: 20 + i * slotW,
      y,
      width: slotW,
      height: 70,
      multiplier: multipliers[i],
      scored: 0, // 有幾顆球落入
    }));
  }

  // 隨機但有一定分佈的乘數陣列
  _randomMultipliers(count) {
    const pool = [1, 1, 2, 2, 3, 5, 10];
    // 確保至少一個高乘數
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    // 隨機位置放一個大獎
    const jackpot = Math.random() < 0.3 ? 20 : 10;
    result[Math.floor(Math.random() * count)] = jackpot;
    return result;
  }

  // ─── 生成新球 ──────────────────────────────────────────
  _spawnBall() {
    if (this.cup.ballsLeft <= 0) return;
    this.cup.ballsLeft--;
    this.balls.push({
      x: this.cup.x + (Math.random() - 0.5) * 20,
      y: this.cup.y + this.cup.height,
      vx: (Math.random() - 0.5) * 2,
      vy: 1,
      r: 7,
      settled: false,
      slotIndex: -1,
    });
  }

  // ─── 主迴圈 ────────────────────────────────────────────
  start() {
    this.animId = requestAnimationFrame(this._loop);
  }

  _loop() {
    this._update();
    this._draw();
    if (!this.done) {
      this.animId = requestAnimationFrame(this._loop);
    }
  }

  _update() {
    // 移動杯子（鍵盤）
    if (this.keys['ArrowLeft']  || this.keys['a']) this.cup.x -= this.cup.speed;
    if (this.keys['ArrowRight'] || this.keys['d']) this.cup.x += this.cup.speed;
    // 觸控
    if (this.touchX !== null) this.cup.x = this.touchX;
    // 限制邊界
    this.cup.x = Math.max(this.cup.width / 2, Math.min(this.canvas.width - this.cup.width / 2, this.cup.x));

    // 倒球
    if (this.cup.ballsLeft > 0) {
      this.cup.pourRate++;
      if (this.cup.pourRate >= this.cup.pourInterval) {
        this.cup.pourRate = 0;
        this._spawnBall();
      }
    }

    // 更新每顆球
    const gravity = 0.35;
    const friction = 0.75;
    const bounce = 0.5;

    for (const ball of this.balls) {
      if (ball.settled) continue;

      ball.vy += gravity;
      ball.x  += ball.vx;
      ball.y  += ball.vy;

      // 左右牆壁
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -bounce; }
      if (ball.x + ball.r > this.canvas.width) { ball.x = this.canvas.width - ball.r; ball.vx *= -bounce; }

      // 與釘子碰撞
      for (const peg of this.pegs) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = ball.r + peg.r;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          // 推開
          ball.x = peg.x + nx * minDist;
          ball.y = peg.y + ny * minDist;
          // 反彈速度
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * bounce;
          ball.vy = (ball.vy - 2 * dot * ny) * bounce;
          ball.vx += (Math.random() - 0.5) * 0.5; // 隨機擾動
        }
      }

      // 球與球碰撞（簡化）
      for (const other of this.balls) {
        if (other === ball || other.settled) continue;
        const dx = ball.x - other.x;
        const dy = ball.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ball.r + other.r && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (ball.r + other.r - dist) / 2;
          ball.x  += nx * overlap;
          ball.y  += ny * overlap;
          other.x -= nx * overlap;
          other.y -= ny * overlap;
          const dvx = ball.vx - other.vx;
          const dvy = ball.vy - other.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot < 0) {
            ball.vx  -= dot * nx;
            ball.vy  -= dot * ny;
            other.vx += dot * nx;
            other.vy += dot * ny;
          }
        }
      }

      // 落入底部格子
      for (let i = 0; i < this.slots.length; i++) {
        const slot = this.slots[i];
        if (
          ball.y + ball.r >= slot.y &&
          ball.x >= slot.x &&
          ball.x <= slot.x + slot.width
        ) {
          ball.settled = true;
          ball.slotIndex = i;
          ball.x = slot.x + slot.width / 2;
          ball.y = slot.y + ball.r + 4;
          slot.scored++;
          this.totalScore += slot.multiplier;
          this.settledCount++;
          break;
        }
      }

      // 球掉出底部（容錯）
      if (ball.y > this.canvas.height + 20) {
        ball.settled = true;
        this.settledCount++;
      }

      // 速度過低視為靜止
      if (
        !ball.settled &&
        Math.abs(ball.vx) < 0.05 &&
        Math.abs(ball.vy) < 0.05 &&
        ball.y > this.canvas.height - 100
      ) {
        ball.settled = true;
        this.settledCount++;
      }
    }

    // 判斷全部結束
    const allSpawned = this.cup.ballsLeft <= 0;
    const allSettled = this.settledCount >= (this._initialBalls());
    if (allSpawned && allSettled && !this.done) {
      this.doneTimer++;
      if (this.doneTimer > 60) { // 等 1 秒再結束
        this.done = true;
        this._cleanup();
        this.onComplete(this.totalScore);
      }
    }
  }

  // ─── 繪製 ──────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // 標題
    ctx.fillStyle = '#e0e0ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('杯球台', W / 2, 24);

    // 剩餘球數
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`剩餘球數：${this.cup.ballsLeft}　落定：${this.settledCount}　得分：${this.totalScore}`, W / 2, 44);

    // 操作提示
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.fillText('← → 或 A D 移動杯子', W / 2, H - 12);

    // 釘子
    ctx.fillStyle = '#7ecbff';
    for (const peg of this.pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 底部格子
    const colors = {
      1: '#444', 2: '#2a5f2a', 3: '#1a3f7a', 5: '#6a1a7a',
      10: '#8a3a00', 20: '#8a0000',
    };
    for (const slot of this.slots) {
      const col = colors[slot.multiplier] || '#333';
      ctx.fillStyle = col;
      ctx.fillRect(slot.x + 1, slot.y, slot.width - 2, slot.height);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(slot.x + 1, slot.y, slot.width - 2, slot.height);

      // 乘數文字
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`×${slot.multiplier}`, slot.x + slot.width / 2, slot.y + 22);

      // 落入球數
      if (slot.scored > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '11px sans-serif';
        ctx.fillText(`+${slot.scored * slot.multiplier}`, slot.x + slot.width / 2, slot.y + 40);
      }
    }

    // 杯子
    this._drawCup();

    // 球
    for (const ball of this.balls) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = ball.settled ? '#888' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 全部結束提示
    if (this.cup.ballsLeft <= 0 && this.settledCount >= this._initialBalls() - 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(W / 2 - 100, H / 2 - 30, 200, 60);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`總計：${this.totalScore} 球`, W / 2, H / 2 + 6);
    }
  }

  _drawCup() {
    const ctx = this.ctx;
    const { x, y, width, height } = this.cup;
    const half = width / 2;

    // 杯身（梯形）
    ctx.beginPath();
    ctx.moveTo(x - half,      y);
    ctx.lineTo(x + half,      y);
    ctx.lineTo(x + half * 0.7, y + height);
    ctx.lineTo(x - half * 0.7, y + height);
    ctx.closePath();
    ctx.fillStyle = '#c8a46e';
    ctx.fill();
    ctx.strokeStyle = '#8a6a3e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 杯口高亮
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.lineTo(x + half, y);
    ctx.strokeStyle = '#f0d090';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 剩餘球數顯示在杯子上
    if (this.cup.ballsLeft > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.cup.ballsLeft, x, y + height / 2 + 5);
    }
  }

  // ─── 清理事件 ──────────────────────────────────────────
  _cleanup() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend',  this._onTouchEnd);
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  destroy() {
    this._cleanup();
  }
}
