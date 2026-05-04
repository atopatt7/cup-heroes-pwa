// CupGameScene.js
// 原版 Cup Heroes 杯球台機制
// - 上方杯子持續倒球，玩家可左右移動杯子改變落點
// - 中間有隨機橫板隔板，球碰到會往兩側流
// - 隔板上有乘數標籤，球經過會加乘球數
// - 最終球流進下方杯子收集，顯示總球數
// - 所有球落定後 → 進入升級場景

import { PhysicsEngine } from '../game/PhysicsEngine.js'

export class CupGameScene {
  constructor(canvas, ctx, gameState, onComplete) {
    this.canvas = canvas
    this.ctx = ctx
    this.gameState = gameState
    this.onComplete = onComplete // (totalBalls) => void
    const W = canvas.width
    const H = canvas.height
    // ── 上方杯子（倒球用）──
    this.pourCup = {
      x: W / 2,
      y: 60,
      width: 56,
      height: 38,
      speed: 7,
      ballsLeft: this._initialBalls(),
      pourRate: 0,
      pourInterval: 6,
    }
    // ── 下方收集杯 ──
    this.collectCup = {
      x: W / 2,
      y: H - 60,
      width: 80,
      height: 50,
      count: 0,
    }
    // ── 隔板（隨機生成）──
    this.boards = this._generateBoards()
    // ── 底部乘數槽 ──
    this.slots = this._generateSlots()
    // ── 物理球 ──
    this.balls = []
    this.settledCount = 0
    this.totalScore = 0
    this.done = false
    this.doneTimer = 0
    // ── 飄字特效 ──
    this.floats = []
    // ── 鍵盤 ──
    this.keys = {}
    this._onKeyDown = (e) => { this.keys[e.key] = true }
    this._onKeyUp   = (e) => { this.keys[e.key] = false }
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup',   this._onKeyUp)
    // ── 觸控 ──
    this.touchX = null
    this._onTouchMove = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      this.touchX = (e.touches[0].clientX - rect.left) * scaleX
    }
    this._onTouchEnd = () => { this.touchX = null }
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false })
    canvas.addEventListener('touchend',  this._onTouchEnd)
    this.animId = null
    this._loop = this._loop.bind(this)
  }
  _initialBalls() {
    const chapter = this.gameState.chapterIdx || 0
    const wave    = this.gameState.waveIdx    || 0
    const base    = 12 + chapter * 4 + wave * 2
    const bonus   = this.gameState.hero?.bonusBalls || 0
    return base + bonus
  }
  _generateBoards() {
    const W = this.canvas.width
    const H = this.canvas.height
    const boards = []
    const rows = 6
    const startY = 130
    const endY   = H - 200  // 留空間給底部杯槽
    // 乘數：章節越高越多高倍
    const chapter    = this.gameState.chapterIdx || 0
    const multipliers = chapter >= 2
      ? [2, 3, 3, 5, 5, 10]
      : chapter >= 1
        ? [2, 2, 3, 3, 5, 5]
        : [2, 2, 2, 3, 3, 4]

    for (let r = 0; r < rows; r++) {
      const y = startY + r * (endY - startY) / (rows - 1)
      const count = r % 2 === 0 ? 2 : 1
      const usedX = []
      for (let c = 0; c < count; c++) {
        const bw = 55 + Math.floor(Math.random() * 75)
        let bx
        let tries = 0
        do {
          bx = 22 + Math.random() * (W - 44 - bw)
          tries++
        } while (tries < 20 && usedX.some(ux => Math.abs(ux - bx) < bw + 16))
        usedX.push(bx)
        const mult = multipliers[Math.floor(Math.random() * multipliers.length)]
        boards.push({
          x: bx,
          y: y + (Math.random() - 0.5) * 16,
          width: bw,
          multiplier: mult,
          hitTimer: 0,
        })
      }
    }
    return boards
  }
  // 底部杯槽：固定位置，有不同乘數（原版 Cup Heroes 核心機制）
  _generateSlots() {
    const W    = this.canvas.width
    const H    = this.canvas.height
    const slotY = H - 148
    const chapter = this.gameState.chapterIdx || 0
    // 槽位乘數配置（章節越高，兩側懲罰越大，中心獎勵越高）
    const configs = [
      [1, 2, 5, 2, 1],       // 第1章
      [1, 2, 10, 2, 1],      // 第2章
      [0, 3, 15, 3, 0],      // 第3章（兩側0x懲罰！）
    ]
    const mults = configs[Math.min(chapter, configs.length - 1)]
    const slotW = (W - 36) / mults.length
    const colors = { 0:'#c62828', 1:'#546e7a', 2:'#1565c0', 3:'#6a1b9a', 5:'#f57f17', 10:'#2e7d32', 15:'#b71c1c' }

    return mults.map((m, i) => ({
      x:    18 + i * slotW,
      y:    slotY,
      w:    slotW - 4,
      h:    60,
      mult: m,
      color: colors[m] || '#1a237e',
      hitTimer: 0,
    }))
  }
  _spawnBall() {
    if (this.pourCup.ballsLeft <= 0) return
    this.pourCup.ballsLeft--
    this.balls.push({
      x: this.pourCup.x + (Math.random() - 0.5) * 10,
      y: this.pourCup.y + this.pourCup.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2,
      r: 6,
      multiplier: 1,
      settled: false,
      _hitBoards: new Set(),
    })
  }
  start() {
    this.animId = requestAnimationFrame(this._loop)
  }
  stop() {
    this._cleanup()
  }
  _loop() {
    this._update()
    this._draw()
    if (!this.done) {
      this.animId = requestAnimationFrame(this._loop)
    }
  }
  _update() {
    const W = this.canvas.width
    const H = this.canvas.height
    // 移動杯子
    if (this.keys['ArrowLeft']  || this.keys['a']) this.pourCup.x -= this.pourCup.speed
    if (this.keys['ArrowRight'] || this.keys['d']) this.pourCup.x += this.pourCup.speed
    if (this.touchX !== null) this.pourCup.x = this.touchX
    this.pourCup.x = Math.max(this.pourCup.width / 2, Math.min(W - this.pourCup.width / 2, this.pourCup.x))
    // 倒球
    if (this.pourCup.ballsLeft > 0) {
      this.pourCup.pourRate++
      if (this.pourCup.pourRate >= this.pourCup.pourInterval) {
        this.pourCup.pourRate = 0
        this._spawnBall()
      }
    }
    // 飄字
    this.floats = this.floats.filter(f => f.alpha > 0)
    for (const f of this.floats) {
      f.y -= 1.5
      f.alpha -= 0.02
    }
    // 隔板 hit timer
    for (const b of this.boards) {
      if (b.hitTimer > 0) b.hitTimer--
    }
    // 槽位 hit timer
    for (const s of this.slots) {
      if (s.hitTimer > 0) s.hitTimer--
    }
    for (const ball of this.balls) {
      if (ball.settled) continue

      PhysicsEngine.updateBall(ball, W)

      // 碰隔板
      for (const board of this.boards) {
        if (PhysicsEngine.checkBoardCollision(ball, board)) {
          ball.multiplier *= board.multiplier
          board.hitTimer = 12
          this.floats.push({
            x: ball.x,
            y: ball.y - 10,
            text: `×${board.multiplier}`,
            alpha: 1,
          })
        }
      }

      // 落入底部槽位
      let intoSlot = false
      for (const slot of this.slots) {
        if (
          ball.y + ball.r >= slot.y &&
          ball.y - ball.r < slot.y + slot.h &&
          ball.x >= slot.x &&
          ball.x <= slot.x + slot.w &&
          !ball.settled
        ) {
          ball.settled = true
          this.settledCount++
          const slotMult = slot.mult
          const earned   = Math.floor(ball.multiplier * slotMult)
          this.totalScore += Math.max(0, earned)
          slot.hitTimer = 30
          intoSlot = true
          const scoreText = slotMult === 0 ? '×0 💀' : `+${earned}`
          const scoreCol  = slotMult === 0 ? '#ff4444' : slotMult >= 10 ? '#ffd700' : '#a5f7a5'
          this.floats.push({ x: ball.x, y: slot.y - 12, text: scoreText, alpha: 1, color: scoreCol })
          break
        }
      }

      // 落入收集杯（備用）
      if (!intoSlot && PhysicsEngine.checkCupCollision(ball, this.collectCup)) {
        const cup = this.collectCup
        const cupTop = cup.y - cup.height / 2
        ball.settled = true
        ball.x = cup.x + (Math.random() - 0.5) * (cup.width * 0.5)
        ball.y = cupTop + ball.r + Math.random() * 8
        ball.vx = 0
        ball.vy = 0
        const earned = Math.floor(ball.multiplier)
        this.totalScore += earned
        cup.count += earned
        this.settledCount++
      }

      // 掉出底部
      if (ball.y > H + 20) {
        ball.settled = true
        this.settledCount++
      }
    }
    // 判斷結束
    const allSpawned = this.pourCup.ballsLeft <= 0
    const allSettled = this.settledCount >= this._initialBalls()
    if (allSpawned && allSettled && !this.done) {
      this.doneTimer++
      if (this.doneTimer > 90) {
        this.done = true
        this._cleanup()
        this.onComplete(this.totalScore)
      }
    }
  }
  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height
    // 背景（洞穴風）
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#2a1a0e')
    bg.addColorStop(1, '#1a0e06')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // 左右木牆
    ctx.fillStyle = '#8B5E3C'
    ctx.fillRect(0, 0, 18, H)
    ctx.fillRect(W - 18, 0, 18, H)
    ctx.fillStyle = '#6B4226'
    for (let i = 0; i < H; i += 40) {
      ctx.fillRect(0, i, 18, 3)
      ctx.fillRect(W - 18, i, 18, 3)
    }
    // 頂部資訊列
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(18, 0, W - 36, 52)
    ctx.fillStyle = '#f5deb3'
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    const chLabel = `第${(this.gameState.chapterIdx||0)+1}章`
    ctx.fillText(`${chLabel} 杯球台`, W / 2, 20)
    ctx.fillStyle = '#bbb'
    ctx.font = '12px sans-serif'
    ctx.fillText(`剩餘：${this.pourCup.ballsLeft}　落定：${this.settledCount}　🪙 得分：${this.totalScore}`, W / 2, 40)

    // 底部乘數槽
    for (const slot of this.slots) {
      const isHit = slot.hitTimer > 0
      const alpha = isHit ? 1 : 0.78
      ctx.globalAlpha = alpha

      // 槽底色
      ctx.fillStyle = slot.color
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h)

      // 發光邊框
      if (isHit) {
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 12
      }
      ctx.strokeStyle = isHit ? '#fff' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth   = isHit ? 2 : 1
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h)
      ctx.shadowBlur  = 0

      // 乘數文字
      ctx.fillStyle   = '#fff'
      ctx.font        = `bold ${slot.mult >= 10 ? 16 : 20}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText(`×${slot.mult}`, slot.x + slot.w / 2, slot.y + 28)

      ctx.globalAlpha = 1
    }
    // 槽位標籤下方
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(18, this.canvas.height - 88, W - 36, 20)
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('目標：進入高分槽！', W / 2, this.canvas.height - 73)
    // 操作提示
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '11px sans-serif'
    ctx.fillText('← → 或拖曳移動杯子', W / 2, H - 8)
    // 隔板
    for (const board of this.boards) {
      const isHit = board.hitTimer > 0
      const grad = ctx.createLinearGradient(board.x, board.y - 6, board.x, board.y + 6)
      grad.addColorStop(0, isHit ? '#ffe066' : '#f0a030')
      grad.addColorStop(1, isHit ? '#ffaa00' : '#b06010')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(board.x, board.y - 6, board.width, 12, 4)
      ctx.fill()
      ctx.strokeStyle = isHit ? '#fff8' : '#7a4010'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // 乘數標籤
      const labelW = 36
      const labelH = 20
      const lx = board.x + board.width / 2 - labelW / 2
      const ly = board.y - 6 - labelH - 2
      ctx.fillStyle = isHit ? '#fff' : '#1a0e06'
      ctx.fillRect(lx, ly, labelW, labelH)
      ctx.strokeStyle = isHit ? '#ffd700' : '#f0a030'
      ctx.lineWidth = 1.5
      ctx.strokeRect(lx, ly, labelW, labelH)
      ctx.fillStyle = isHit ? '#f80' : '#ffd700'
      ctx.font = `bold 12px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`×${board.multiplier}`, board.x + board.width / 2, ly + 14)
    }
    // 上方倒球杯
    this._drawPourCup()
    // 下方收集杯
    this._drawCollectCup()
    // 球
    for (const ball of this.balls) {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      const ballGrad = ctx.createRadialGradient(
        ball.x - 2, ball.y - 2, 1,
        ball.x, ball.y, ball.r
      )
      ballGrad.addColorStop(0, '#ffffff')
      ballGrad.addColorStop(1, ball.settled ? '#999' : '#c8d8f0')
      ctx.fillStyle = ballGrad
      ctx.fill()
    }
    // 飄字
    for (const f of this.floats) {
      ctx.globalAlpha = f.alpha
      ctx.fillStyle   = f.color || '#ffd700'
      ctx.font        = 'bold 15px sans-serif'
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur  = 0
    }
    ctx.globalAlpha = 1
    // 結束提示
    const allDone = this.pourCup.ballsLeft <= 0 &&
      this.settledCount >= this._initialBalls() - 1
    if (allDone) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(W / 2 - 120, H / 2 - 40, 240, 80)
      ctx.strokeStyle = '#f0a030'
      ctx.lineWidth = 2
      ctx.strokeRect(W / 2 - 120, H / 2 - 40, 240, 80)
      ctx.fillStyle = '#ffd700'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`總計：${this.totalScore} 球`, W / 2, H / 2 + 10)
    }
  }
  _drawPourCup() {
    const ctx = this.ctx
    const { x, y, width, height, ballsLeft } = this.pourCup
    const hw = width / 2
    // 杯身（梯形，開口朝下）
    ctx.beginPath()
    ctx.moveTo(x - hw,        y)
    ctx.lineTo(x + hw,        y)
    ctx.lineTo(x + hw * 0.65, y + height)
    ctx.lineTo(x - hw * 0.65, y + height)
    ctx.closePath()
    const grad = ctx.createLinearGradient(x - hw, y, x + hw, y)
    grad.addColorStop(0, '#d4a96a')
    grad.addColorStop(0.5, '#f0c88a')
    grad.addColorStop(1, '#c8904a')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = '#8a5a20'
    ctx.lineWidth = 2
    ctx.stroke()
    // 杯口高亮
    ctx.beginPath()
    ctx.moveTo(x - hw, y + 3)
    ctx.lineTo(x + hw, y + 3)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    // 手柄
    ctx.beginPath()
    ctx.moveTo(x + hw, y + 8)
    ctx.bezierCurveTo(x + hw + 18, y + 8, x + hw + 18, y + height - 8, x + hw, y + height - 8)
    ctx.strokeStyle = '#8a5a20'
    ctx.lineWidth = 3
    ctx.stroke()
    // 球數
    if (ballsLeft > 0) {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(ballsLeft, x, y + height / 2 + 5)
    }
  }
  _drawCollectCup() {
    const ctx = this.ctx
    const { x, y, width, height, count } = this.collectCup
    const hw = width / 2
    const top = y - height / 2
    // 杯身（梯形，開口朝上）
    ctx.beginPath()
    ctx.moveTo(x - hw * 0.65, top)
    ctx.lineTo(x + hw * 0.65, top)
    ctx.lineTo(x + hw,        top + height)
    ctx.lineTo(x - hw,        top + height)
    ctx.closePath()
    const grad = ctx.createLinearGradient(x - hw, top, x + hw, top)
    grad.addColorStop(0, '#a07840')
    grad.addColorStop(0.5, '#c8a060')
    grad.addColorStop(1, '#a07840')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = '#6a4010'
    ctx.lineWidth = 2.5
    ctx.stroke()
    // 杯口
    ctx.beginPath()
    ctx.moveTo(x - hw * 0.65, top + 3)
    ctx.lineTo(x + hw * 0.65, top + 3)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.stroke()
    // 收集球數
    ctx.fillStyle = '#ffd700'
    ctx.font = `bold ${count >= 100 ? 18 : 22}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(count, x, top + height / 2 + 8)
  }
  _cleanup() {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup',   this._onKeyUp)
    this.canvas.removeEventListener('touchmove', this._onTouchMove)
    this.canvas.removeEventListener('touchend',  this._onTouchEnd)
    if (this.animId) cancelAnimationFrame(this.animId)
  }
  destroy() {
    this._cleanup()
  }
}
