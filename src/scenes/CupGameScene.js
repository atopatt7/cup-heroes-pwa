// CupGameScene.js — 杯球台（重新設計版本）
//
// 機制：
//  1. 玩家點擊/拖曳 → 移動上方杯子位置
//  2. 點擊放手處 → 釋放一顆球（每次點擊出一顆）
//  3. 中間有「能量門」：球穿透後依倍率分裂成多顆球
//  4. 底部：左右兩個斜坡，斜坡中間有開口，開口下方是收集杯

import { PhysicsEngine } from '../game/PhysicsEngine.js'
import { T } from '../utils/theme.js'
import { rrect } from '../utils/drawHelpers.js'

export class CupGameScene {
  constructor(canvas, ctx, gameState, onComplete) {
    this.canvas     = canvas
    this.ctx        = ctx
    this.gameState  = gameState
    this.onComplete = onComplete  // (totalScore) => void

    const W = canvas.width
    const H = canvas.height

    // ── 上方可移動杯子 ──────────────────────────────────────
    this.pourCup = {
      x:      W / 2,
      y:      72,
      w:      56,
      h:      40,
    }

    // ── 可用球數 ─────────────────────────────────────────────
    const chapter = gameState.chapterIdx || 0
    const wave    = gameState.waveIdx    || 0
    const bonus   = gameState.hero?.bonusBalls || 0
    this.maxBalls     = 8 + chapter * 2 + bonus
    this.ballsLeft    = this.maxBalls
    this.ballsInFlight = 0   // 正在飛行中的球數（避免太多同時存在）

    // ── 能量門（穿透型乘數）──────────────────────────────────
    this.gates = this._generateGates()

    // ── 底部斜坡配置 ─────────────────────────────────────────
    // 斜坡：左坡從左牆到中央開口左緣；右坡從中央開口右緣到右牆
    const slopeTopY    = H * 0.74
    const slopeBotY    = H * 0.82
    const gapHalfW     = 36          // 開口半寬
    const gapCenterX   = W / 2
    this.leftSlope  = { x1: 18,                  y1: slopeTopY, x2: gapCenterX - gapHalfW, y2: slopeBotY }
    this.rightSlope = { x1: gapCenterX + gapHalfW, y1: slopeBotY, x2: W - 18, y2: slopeTopY }
    this.gapLeft    = gapCenterX - gapHalfW
    this.gapRight   = gapCenterX + gapHalfW
    this.slopeBotY  = slopeBotY

    // ── 收集杯 ───────────────────────────────────────────────
    this.collectCup = {
      x:  gapCenterX,
      y:  slopeBotY + 44,
      w:  gapHalfW * 2 + 28,
      h:  56,
      count: 0,
    }

    // ── 球列表 ───────────────────────────────────────────────
    this.balls = []
    this.totalScore  = 0
    this.done        = false
    this.doneTimer   = 0

    // ── 浮動特效 ─────────────────────────────────────────────
    this.floats = []
    this.gatePulses = []   // { gateIdx, life }

    // ── 狀態機 ───────────────────────────────────────────────
    // 'aiming' → 玩家拖曳定位，點放球
    // 'end'    → 所有球落定，計分
    this.phase = 'aiming'

    // ── 觸控/滑鼠 ────────────────────────────────────────────
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp   = this._onPointerUp.bind(this)
    this._dragging = false
    this._lastTouchX = null

    canvas.addEventListener('pointerdown', this._onPointerDown)
    canvas.addEventListener('pointermove', this._onPointerMove)
    canvas.addEventListener('pointerup',   this._onPointerUp)
    canvas.addEventListener('touchmove',  (e) => e.preventDefault(), { passive: false })

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this._loop   = this._loop.bind(this)
  }

  // ── 生成能量門 ────────────────────────────────────────────
  _generateGates() {
    const W       = this.canvas.width
    const H       = this.canvas.height
    const chapter = this.gameState.chapterIdx || 0

    // 門的 Y 位置：均勻分佈在上方杯子到斜坡之間
    const topY    = 140
    const botY    = this.canvas.height * 0.68
    const count   = 4 + chapter  // 章節越高門越多

    // 倍率池
    const multPools = [
      [2, 2, 3, 3],         // 第1章
      [2, 3, 3, 4, 5],      // 第2章
      [2, 3, 4, 5, 5, 8],   // 第3章
    ]
    const pool = multPools[Math.min(chapter, multPools.length - 1)]

    const gates = []
    for (let i = 0; i < count; i++) {
      const y    = topY + i * (botY - topY) / (count - 1)
      const mult = pool[Math.floor(Math.random() * pool.length)]
      // 門的左右邊界（左右各留一些空間，或橫跨全寬）
      // 交替：偶數關靠左偏，奇數關靠右偏，讓玩家需要瞄準
      const isWide = Math.random() < 0.4
      const gateW  = isWide ? W * 0.72 : W * 0.42
      const gateX  = isWide
        ? (W - gateW) / 2
        : 22 + Math.random() * (W - 44 - gateW)

      gates.push({
        x: gateX,
        y: y + (Math.random() - 0.5) * 20,
        w: gateW,
        mult,
        passed: new WeakSet(),  // 記錄哪些球已通過
        pulseTimer: 0,
      })
    }
    return gates
  }

  // ── 觸控事件 ──────────────────────────────────────────────
  _getCanvasPos(e) {
    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const src    = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    }
  }

  _onPointerDown(e) {
    e.preventDefault()
    this._dragging = true
    const pos = this._getCanvasPos(e)
    // 拖曳時移動杯子
    this.pourCup.x = Math.max(28, Math.min(this.canvas.width - 28, pos.x))
  }

  _onPointerMove(e) {
    e.preventDefault()
    if (!this._dragging) return
    const pos = this._getCanvasPos(e)
    this.pourCup.x = Math.max(28, Math.min(this.canvas.width - 28, pos.x))
  }

  _onPointerUp(e) {
    e.preventDefault()
    if (!this._dragging) return
    this._dragging = false

    // 釋放球
    if (this.phase === 'aiming' && this.ballsLeft > 0 && this.ballsInFlight < 6) {
      this._releaseBall(this.pourCup.x, this.pourCup.y + this.pourCup.h + 2)
      this.ballsLeft--
      if (this.ballsLeft === 0) this.phase = 'waiting'
    } else if (this.phase === 'end') {
      this.done = true
      this._cleanup()
      this.onComplete(this.totalScore)
    }
  }

  _releaseBall(x, y, vxExtra = 0) {
    this.ballsInFlight++
    this.balls.push({
      x,
      y,
      vx: vxExtra + (Math.random() - 0.5) * 0.8,
      vy: 1.5,
      r:  7,
      settled:   false,
      inCup:     false,
      _hitBoards: new Set(),
      mult: 1,  // 累積的分數倍率（不影響球分裂，只影響最終計分）
      color: _ballColor(),
    })
  }

  // ── 主迴圈 ────────────────────────────────────────────────
  start() {
    this.animId = requestAnimationFrame(this._loop)
  }

  stop() {
    this._cleanup()
  }

  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t      += dt
    this.lastTs  = ts
    this._update(dt)
    this._draw()
    if (!this.done) {
      this.animId = requestAnimationFrame(this._loop)
    }
  }

  _update(dt) {
    const W = this.canvas.width
    const H = this.canvas.height

    // 浮動文字淡出
    this.floats = this.floats.filter(f => f.life > 0)
    for (const f of this.floats) {
      f.y    -= 1.8 * dt * 60
      f.life -= dt * 60
    }

    // 門脈衝
    for (const g of this.gates) {
      if (g.pulseTimer > 0) g.pulseTimer -= dt * 60
    }

    // 更新球
    for (const ball of this.balls) {
      if (ball.settled) continue

      // 重力與摩擦
      ball.vy += 0.38 * dt * 60
      ball.vx *= 0.998
      ball.x  += ball.vx * dt * 60
      ball.vy  = Math.min(ball.vy, 18)

      // 左右牆
      if (ball.x - ball.r < 18) { ball.x = 18 + ball.r; ball.vx = Math.abs(ball.vx) * 0.7 }
      if (ball.x + ball.r > W - 18) { ball.x = W - 18 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7 }

      // 更新 Y
      ball.y += ball.vy * dt * 60

      // 碰到斜坡（檢測）
      this._checkSlope(ball)

      // 能量門穿透檢測（不阻擋，只加成）
      for (const gate of this.gates) {
        if (!gate.passed.has(ball) &&
            ball.y + ball.r >= gate.y &&
            ball.y - ball.r <= gate.y + 8 &&
            ball.x >= gate.x && ball.x <= gate.x + gate.w) {

          gate.passed.add(ball)
          gate.pulseTimer = 30

          const mult = gate.mult
          // 分裂成 mult 顆（原本1顆 → 變 mult 顆）
          for (let k = 1; k < mult; k++) {
            const spread = (k - (mult - 1) / 2) * 22
            this._releaseBall(ball.x + spread, ball.y, spread * 0.12)
          }

          this.floats.push({
            x: ball.x, y: gate.y - 14,
            text: `×${mult}`,
            color: _gateColor(mult),
            life: 55,
            size: 20,
          })
        }
      }

      // 落入收集杯
      const cup = this.collectCup
      const cupTop = cup.y - cup.h / 2 + 8
      if (!ball.inCup &&
          ball.y + ball.r >= cupTop &&
          ball.x >= cup.x - cup.w / 2 &&
          ball.x <= cup.x + cup.w / 2) {
        ball.settled = true
        ball.inCup   = true
        ball.vx = 0; ball.vy = 0
        ball.x = cup.x + (Math.random() - 0.5) * (cup.w * 0.5)
        ball.y = cupTop + ball.r + cup.count * 2
        this.totalScore++
        cup.count++
        this.ballsInFlight = Math.max(0, this.ballsInFlight - 1)
        this.floats.push({
          x: cup.x + (Math.random() - 0.5) * 40,
          y: cupTop - 14,
          text: '+1',
          color: '#a5f7a5',
          life: 40,
          size: 15,
        })
      }

      // 掉出底部（miss）
      if (ball.y > H + 20) {
        ball.settled = true
        this.ballsInFlight = Math.max(0, this.ballsInFlight - 1)
      }
    }

    // 判斷結束
    if (this.phase !== 'aiming' && this.phase !== 'end') {
      const allSettled = this.balls.every(b => b.settled)
      if (allSettled) {
        this.doneTimer += dt * 60
        if (this.doneTimer > 80) {
          this.phase = 'end'
        }
      }
    }
  }

  _checkSlope(ball) {
    const ls = this.leftSlope
    const rs = this.rightSlope

    // 左斜坡：從 (ls.x1,ls.y1) 到 (ls.x2,ls.y2)
    // 如果球在斜坡 x 範圍內，且 y 碰到斜坡線
    {
      const t = (ball.x - ls.x1) / (ls.x2 - ls.x1)
      if (t >= 0 && t <= 1) {
        const slopeY = ls.y1 + t * (ls.y2 - ls.y1)
        if (ball.y + ball.r >= slopeY && ball.vy > 0) {
          ball.y  = slopeY - ball.r
          // 斜坡法線向右上
          const dx = ls.x2 - ls.x1, dy = ls.y2 - ls.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = -dy / len, ny = dx / len  // 法線
          const dot = ball.vx * nx + ball.vy * ny
          ball.vx = ball.vx - 2 * dot * nx
          ball.vy = ball.vy - 2 * dot * ny
          ball.vx *= 0.7; ball.vy *= 0.7
          ball.vy = Math.min(ball.vy, -0.5)
        }
      }
    }

    // 右斜坡
    {
      const t = (ball.x - rs.x1) / (rs.x2 - rs.x1)
      if (t >= 0 && t <= 1) {
        const slopeY = rs.y1 + t * (rs.y2 - rs.y1)
        if (ball.y + ball.r >= slopeY && ball.vy > 0) {
          ball.y  = slopeY - ball.r
          const dx = rs.x2 - rs.x1, dy = rs.y2 - rs.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = -dy / len, ny = dx / len
          const dot = ball.vx * nx + ball.vy * ny
          ball.vx = ball.vx - 2 * dot * nx
          ball.vy = ball.vy - 2 * dot * ny
          ball.vx *= 0.7; ball.vy *= 0.7
          ball.vy = Math.min(ball.vy, -0.5)
        }
      }
    }
  }

  // ── 繪圖 ──────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // ── 背景 ──
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d1830')
    bg.addColorStop(1, '#05101f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 背景粒子效果
    for (let i = 0; i < 18; i++) {
      const px = ((i * 83 + this.t * 18) % W)
      const py = (i * 57 + Math.sin(this.t * 0.5 + i) * 20) % (H * 0.75)
      ctx.globalAlpha = 0.12
      ctx.fillStyle   = '#4488ff'
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // 左右牆
    ctx.fillStyle = '#1a2a4a'
    ctx.fillRect(0, 0, 18, H)
    ctx.fillRect(W - 18, 0, 18, H)
    ctx.strokeStyle = '#2a4a8a'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(18, H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W - 18, 0); ctx.lineTo(W - 18, H); ctx.stroke()

    // ── 頂部資訊 ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,10,40,0.70)'
    ctx.fillRect(18, 0, W - 36, 52)
    ctx.fillStyle = '#f5c518'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('⚙️ 能量球台', W / 2, 22)
    ctx.fillStyle = '#88aacc'; ctx.font = '12px sans-serif'
    ctx.fillText(`剩餘：${this.ballsLeft}  球數：${this.totalScore}  🏆 收集越多越好！`, W / 2, 42)

    // ── 能量門 ──────────────────────────────────────────────
    for (const gate of this.gates) {
      const isPulsing = gate.pulseTimer > 0
      const pulse     = isPulsing ? Math.min(1, gate.pulseTimer / 10) : 0
      const gateCol   = _gateColor(gate.mult)

      // 門體（發光橫線）
      const grad = ctx.createLinearGradient(gate.x, 0, gate.x + gate.w, 0)
      grad.addColorStop(0,   `${gateCol}00`)
      grad.addColorStop(0.1, `${gateCol}88`)
      grad.addColorStop(0.5, `${gateCol}ff`)
      grad.addColorStop(0.9, `${gateCol}88`)
      grad.addColorStop(1,   `${gateCol}00`)
      ctx.strokeStyle = grad
      ctx.lineWidth   = isPulsing ? 4 + pulse * 4 : 3
      if (isPulsing) { ctx.shadowColor = gateCol; ctx.shadowBlur = 16 }
      ctx.beginPath()
      ctx.moveTo(gate.x, gate.y + 4)
      ctx.lineTo(gate.x + gate.w, gate.y + 4)
      ctx.stroke()
      ctx.shadowBlur = 0

      // 倍率標籤（中央）
      const labelW = gate.mult >= 5 ? 44 : 38
      const lx     = gate.x + gate.w / 2 - labelW / 2
      const ly     = gate.y - 18

      ctx.fillStyle = isPulsing ? gateCol : gateCol + 'bb'
      rrect(ctx, lx, ly, labelW, 20, 6); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = `bold ${gate.mult >= 8 ? 11 : 13}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`×${gate.mult}`, gate.x + gate.w / 2, ly + 14)

      // 粒子效果（門兩端）
      if (isPulsing) {
        for (const ex of [gate.x, gate.x + gate.w]) {
          ctx.fillStyle = gateCol
          ctx.globalAlpha = pulse * 0.8
          ctx.beginPath(); ctx.arc(ex, gate.y + 4, 5 * pulse, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    // ── 底部斜坡 ────────────────────────────────────────────
    this._drawSlopes(ctx, W, H)

    // ── 收集杯 ───────────────────────────────────────────────
    this._drawCollectCup(ctx)

    // ── 上方倒球杯 ───────────────────────────────────────────
    this._drawPourCup(ctx)

    // ── 球 ───────────────────────────────────────────────────
    for (const ball of this.balls) {
      if (ball.y > H + 10) continue
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      const bg2 = ctx.createRadialGradient(
        ball.x - 2, ball.y - 2, 1,
        ball.x, ball.y, ball.r
      )
      bg2.addColorStop(0, '#ffffff')
      bg2.addColorStop(0.4, ball.color || '#c8e8ff')
      bg2.addColorStop(1,   ball.settled ? '#8899aa' : (ball.color || '#6090d0') + 'cc')
      ctx.fillStyle = bg2
      if (!ball.settled) { ctx.shadowColor = ball.color || '#6090d0'; ctx.shadowBlur = 6 }
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // ── 浮動文字 ────────────────────────────────────────────
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 25)
      ctx.fillStyle   = f.color || '#ffd700'
      ctx.font        = `bold ${f.size || 18}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur  = 0
    }
    ctx.globalAlpha = 1

    // ── 底部操作提示 / 結束畫面 ────────────────────────────
    if (this.phase === 'aiming' && this.ballsLeft > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(this.t * 2.5) * 0.4
      ctx.fillStyle   = '#88aacc'
      ctx.font        = '13px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText('👆 點擊移動杯子並釋放球', W / 2, H - 14)
      ctx.globalAlpha = 1
    }

    if (this.phase === 'end') {
      // 結束遮罩
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, H * 0.38, W, 110)
      ctx.fillStyle   = '#f5c518'
      ctx.font        = 'bold 26px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(`🎉 收集 ${this.totalScore} 顆！`, W / 2, H * 0.38 + 40)
      ctx.fillStyle = '#88aacc'
      ctx.font      = '16px sans-serif'
      ctx.fillText('點擊繼續', W / 2, H * 0.38 + 75)
    }
  }

  _drawSlopes(ctx, W, H) {
    const ls = this.leftSlope
    const rs = this.rightSlope

    // 斜坡填充色
    const slopeGrad = ctx.createLinearGradient(0, ls.y1, 0, this.slopeBotY)
    slopeGrad.addColorStop(0, '#1a3060')
    slopeGrad.addColorStop(1, '#0d1840')
    ctx.fillStyle = slopeGrad

    // 左斜坡（填充到左牆底部）
    ctx.beginPath()
    ctx.moveTo(ls.x1, ls.y1)
    ctx.lineTo(ls.x2, ls.y2)
    ctx.lineTo(ls.x1, ls.y2)  // 左牆底
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(ls.x1, ls.y1)
    ctx.lineTo(ls.x2, ls.y2)
    ctx.stroke()

    // 發光線
    ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(ls.x1, ls.y1 - 2)
    ctx.lineTo(ls.x2, ls.y2 - 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // 右斜坡
    ctx.fillStyle = slopeGrad
    ctx.beginPath()
    ctx.moveTo(rs.x1, rs.y1)
    ctx.lineTo(rs.x2, rs.y2)
    ctx.lineTo(rs.x2, rs.y1)  // 右牆底對應高度
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(rs.x1, rs.y1)
    ctx.lineTo(rs.x2, rs.y2)
    ctx.stroke()

    ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 1
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(rs.x1, rs.y1 - 2)
    ctx.lineTo(rs.x2, rs.y2 - 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // 開口標示（中央）
    const gapY  = this.slopeBotY
    const gapX1 = this.gapLeft
    const gapX2 = this.gapRight
    ctx.strokeStyle = '#ffd700aa'; ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(gapX1, gapY); ctx.lineTo(gapX1, gapY + 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(gapX2, gapY); ctx.lineTo(gapX2, gapY + 10); ctx.stroke()
    ctx.setLineDash([])
  }

  _drawCollectCup(ctx) {
    const cup  = this.collectCup
    const hw   = cup.w / 2
    const top  = cup.y - cup.h / 2
    const W    = this.canvas.width

    // 杯身（梯形，開口朝上）
    const grad = ctx.createLinearGradient(cup.x - hw, top, cup.x + hw, top)
    grad.addColorStop(0,   '#1a3a8a')
    grad.addColorStop(0.3, '#2a5acc')
    grad.addColorStop(0.7, '#2a5acc')
    grad.addColorStop(1,   '#1a3a8a')
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(cup.x - hw * 0.7, top)          // 開口左
    ctx.lineTo(cup.x + hw * 0.7, top)          // 開口右
    ctx.lineTo(cup.x + hw,       top + cup.h)  // 底右
    ctx.lineTo(cup.x - hw,       top + cup.h)  // 底左
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2.5
    ctx.stroke()

    // 杯口高光
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cup.x - hw * 0.7, top + 3)
    ctx.lineTo(cup.x + hw * 0.7, top + 3)
    ctx.stroke()

    // 計數
    ctx.fillStyle   = '#f5c518'
    ctx.font        = `bold ${cup.count >= 100 ? 20 : 24}px sans-serif`
    ctx.textAlign   = 'center'
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8
    ctx.fillText(cup.count, cup.x, top + cup.h / 2 + 8)
    ctx.shadowBlur  = 0
  }

  _drawPourCup(ctx) {
    const { x, y, w, h } = this.pourCup
    const hw = w / 2

    // 指示箭頭
    ctx.fillStyle   = 'rgba(255,220,50,0.6)'
    ctx.font        = '16px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText('▼', x, y - 8)

    // 杯身（梯形，開口向下）
    const grad = ctx.createLinearGradient(x - hw, y, x + hw, y)
    grad.addColorStop(0, '#c07040')
    grad.addColorStop(0.5, '#e0a060')
    grad.addColorStop(1,   '#c07040')
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(x - hw, y)
    ctx.lineTo(x + hw, y)
    ctx.lineTo(x + hw * 0.65, y + h)
    ctx.lineTo(x - hw * 0.65, y + h)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#8a4a10'; ctx.lineWidth = 2; ctx.stroke()

    // 球數
    if (this.ballsLeft > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(this.ballsLeft, x, y + h / 2 + 6)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px sans-serif'
      ctx.fillText('空', x, y + h / 2 + 6)
    }

    // 手柄
    ctx.beginPath()
    ctx.moveTo(x + hw, y + 8)
    ctx.bezierCurveTo(x + hw + 16, y + 8, x + hw + 16, y + h - 8, x + hw, y + h - 8)
    ctx.strokeStyle = '#8a4a10'; ctx.lineWidth = 3; ctx.stroke()
  }

  _cleanup() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    this.canvas.removeEventListener('pointermove', this._onPointerMove)
    this.canvas.removeEventListener('pointerup',   this._onPointerUp)
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
  }

  destroy() {
    this._cleanup()
  }
}

// ── 工具 ──────────────────────────────────────────────────
function _gateColor(mult) {
  if (mult <= 2)  return '#2196F3'
  if (mult <= 3)  return '#4CAF50'
  if (mult <= 5)  return '#FF9800'
  if (mult <= 8)  return '#E91E63'
  return '#9C27B0'  // 8+
}

const BALL_COLORS = [
  '#64b5f6', '#ef9a9a', '#a5d6a7', '#fff176',
  '#ffcc80', '#ce93d8', '#80cbc4', '#f48fb1',
]
let _ballColorIdx = 0
function _ballColor() {
  return BALL_COLORS[(_ballColorIdx++) % BALL_COLORS.length]
}
