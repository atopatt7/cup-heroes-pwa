// CupGameScene.js — 杯球台（分段門 + 釘子版本，參考原版邏輯）
//
// 機制：
//  1. 玩家拖曳移動上方杯子，鬆手放球
//  2. 球落下遇到「分段門」：觸碰對應分段 → 分裂成 mult 顆
//  3. 門間的釘子是物理障礙，球會被彈偏 → 讓球容易miss高倍率分段
//  4. 底部斜坡引導球進中央收集杯，計算總收集球數

import { T } from '../utils/theme.js'
import { rrect } from '../utils/drawHelpers.js'

const MAX_LIVE_BALLS = 48   // 場上最多同時存在球數（防爆炸）

export class CupGameScene {
  constructor(canvas, ctx, gameState, onComplete) {
    this.canvas     = canvas
    this.ctx        = ctx
    this.gameState  = gameState
    this.onComplete = onComplete

    const W = canvas.width
    const H = canvas.height

    // ── 上方可移動杯子 ──────────────────────────────────────
    this.pourCup = { x: W / 2, y: 72, w: 56, h: 40 }

    // ── 可用球數 ─────────────────────────────────────────────
    const chapter      = gameState.chapterIdx || 0
    const bonus        = gameState.hero?.bonusBalls || 0
    this.ballsLeft     = 6 + chapter + bonus
    this.ballsInFlight = 0

    // ── 分段門 ───────────────────────────────────────────────
    this.gates = this._generateGates()

    // ── 底部斜坡 ─────────────────────────────────────────────
    const slopeTopY  = H * 0.74
    const slopeBotY  = H * 0.82
    const gapHalfW   = 36
    const gapCenterX = W / 2
    this.leftSlope  = { x1: 18, y1: slopeTopY, x2: gapCenterX - gapHalfW, y2: slopeBotY }
    this.rightSlope = { x1: gapCenterX + gapHalfW, y1: slopeBotY, x2: W - 18, y2: slopeTopY }
    this.gapLeft    = gapCenterX - gapHalfW
    this.gapRight   = gapCenterX + gapHalfW
    this.slopeBotY  = slopeBotY

    // ── 收集杯 ───────────────────────────────────────────────
    this.collectCup = {
      x: gapCenterX, y: slopeBotY + 44,
      w: gapHalfW * 2 + 28, h: 56, count: 0,
    }

    // ── 狀態 ─────────────────────────────────────────────────
    this.balls      = []
    this.totalScore = 0
    this.done       = false
    this.doneTimer  = 0
    this.floats     = []
    this.phase      = 'aiming'  // 'aiming' | 'waiting' | 'end'

    // ── 觸控/滑鼠 ────────────────────────────────────────────
    this._onPointerDown = this._onPointerDown.bind(this)
    this._onPointerMove = this._onPointerMove.bind(this)
    this._onPointerUp   = this._onPointerUp.bind(this)
    this._dragging = false

    canvas.addEventListener('pointerdown', this._onPointerDown)
    canvas.addEventListener('pointermove', this._onPointerMove)
    canvas.addEventListener('pointerup',   this._onPointerUp)
    canvas.addEventListener('touchmove',   e => e.preventDefault(), { passive: false })

    this.animId = null
    this.t      = 0
    this.lastTs = 0
    this._loop  = this._loop.bind(this)
  }

  // ── 生成分段門（類原版：每列 2-3 段，段間有釘子）──────────
  _generateGates() {
    const W       = this.canvas.width
    const H       = this.canvas.height
    const chapter = this.gameState.chapterIdx || 0
    const topY    = 155
    const botY    = H * 0.70

    // ── 模板池（按難度分三級）──────────────────────────────
    // 設計原則：每個模板都合理，高倍率段較窄（由 _buildGateRow 自動計算）
    // basic：最高 X3，適合新手 / 開場門
    // mid  ：含 X4，中等挑戰
    // high ：含 X5，高階獎勵
    const POOLS = {
      basic: [
        [2, 2],
        [2, 3], [3, 2],
        [2, 2, 2],
        [3, 2, 2], [2, 2, 3], [2, 3, 2],
      ],
      mid: [
        [4, 2], [2, 4],
        [3, 3],
        [4, 2, 2], [2, 4, 2], [2, 2, 4],
        [4, 3, 2], [2, 3, 4], [3, 4, 2],
        [3, 3, 2], [2, 3, 3],
      ],
      high: [
        [5, 2], [2, 5],
        [5, 3], [3, 5],
        [5, 2, 2], [2, 5, 2], [2, 2, 5],
        [5, 3, 2], [2, 3, 5],
        [5, 4, 2], [4, 5, 2], [2, 4, 5],
      ],
    }

    // 從指定池隨機取一個模板，並隨機打亂段的左右順序
    const pick = (tier) => _shuffle([...POOLS[tier][Math.floor(Math.random() * POOLS[tier].length)]])

    // ── 每章抽取策略 ─────────────────────────────────────────
    // 章節越高 → 門越多、高倍率段越常見
    let rowMults
    if (chapter === 0) {
      // 第 1 章：2 列，先 basic 暖身、再 mid 挑戰
      rowMults = [
        pick('basic'),
        pick('mid'),
      ]
    } else if (chapter === 1) {
      // 第 2 章：3 列，mid 為主，60% 機率出現一個 high
      rowMults = [
        pick('mid'),
        pick('mid'),
        Math.random() < 0.6 ? pick('high') : pick('mid'),
      ]
    } else {
      // 第 3 章：3 列，high 為主，第一列偶爾是 mid
      rowMults = [
        Math.random() < 0.35 ? pick('mid') : pick('high'),
        pick('high'),
        pick('high'),
      ]
    }

    const nRow = rowMults.length
    return rowMults.map((mults, i) => {
      const y = topY + (botY - topY) * ((i + 0.5) / nRow)
      return this._buildGateRow(y, mults, W)
    })
  }

  // 建立單列門（含分段 + 釘子）
  _buildGateRow(y, mults, W) {
    const wallPad = 20          // 距左右牆的留白
    const totalW  = W - wallPad * 2
    const PIN_GAP = 16          // 每個釘子佔的水平寬度
    const numPins = mults.length - 1
    const availW  = totalW - numPins * PIN_GAP

    // 寬度按 1/√mult 分配：高倍率段較窄、低倍率段較寬
    const weights = mults.map(m => 1 / Math.sqrt(m))
    const wSum    = weights.reduce((a, b) => a + b, 0)

    let x = wallPad
    const segments = []
    const pins     = []

    mults.forEach((m, i) => {
      const w = Math.max(28, Math.round(availW * weights[i] / wSum))
      segments.push({ x, w, mult: m, passed: new WeakSet() })
      x += w
      if (i < mults.length - 1) {
        // 釘子圓心在兩段間隙中央，略高於門頂
        pins.push({ x: x + PIN_GAP / 2, y: y - 8, r: 6 })
        x += PIN_GAP
      }
    })

    return { y, h: 14, segments, pins, pulseTimer: 0 }
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

    if (this.phase === 'aiming' && this.ballsLeft > 0) {
      this._releaseBall(this.pourCup.x, this.pourCup.y + this.pourCup.h + 2)
      this.ballsLeft--
      if (this.ballsLeft === 0) this.phase = 'waiting'
    } else if (this.phase === 'end') {
      this.done = true
      this._cleanup()
      this.onComplete(this.totalScore)
    }
  }

  // 釋放球，返回球物件（供 seg.passed 立即標記用）
  _releaseBall(x, y, vxExtra = 0, vyInit = 1.5) {
    this.ballsInFlight++
    const ball = {
      x, y,
      vx: vxExtra + (Math.random() - 0.5) * 0.8,
      vy: vyInit,
      r:  7,
      settled: false,
      inCup:   false,
      mult:    1,
      color:   _ballColor(),
    }
    this.balls.push(ball)
    return ball
  }

  // ── 主迴圈 ────────────────────────────────────────────────
  start() { this.animId = requestAnimationFrame(this._loop) }
  stop()  { this._cleanup() }

  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t      += dt
    this.lastTs  = ts
    this._update(dt)
    this._draw()
    if (!this.done) this.animId = requestAnimationFrame(this._loop)
  }

  _update(dt) {
    const W = this.canvas.width
    const H = this.canvas.height

    // 浮動文字
    this.floats = this.floats.filter(f => f.life > 0)
    for (const f of this.floats) { f.y -= 1.8 * dt * 60; f.life -= dt * 60 }

    // 門脈衝計時
    for (const g of this.gates) { if (g.pulseTimer > 0) g.pulseTimer -= dt * 60 }

    // ── 球物理更新 ──────────────────────────────────────────
    for (const ball of this.balls) {
      if (ball.settled) continue

      // 重力 + 摩擦
      ball.vy += 0.38 * dt * 60
      ball.vx *= 0.998
      ball.vy  = Math.min(ball.vy, 18)
      ball.x  += ball.vx * dt * 60
      ball.y  += ball.vy * dt * 60

      // 左右牆
      if (ball.x - ball.r < 18)      { ball.x = 18 + ball.r;      ball.vx =  Math.abs(ball.vx) * 0.7 }
      if (ball.x + ball.r > W - 18)  { ball.x = W - 18 - ball.r;  ball.vx = -Math.abs(ball.vx) * 0.7 }

      // 斜坡
      this._checkSlope(ball)

      // 落入收集杯
      const cup    = this.collectCup
      const cupTop = cup.y - cup.h / 2 + 8
      if (!ball.inCup &&
          ball.y + ball.r >= cupTop &&
          ball.x >= cup.x - cup.w / 2 &&
          ball.x <= cup.x + cup.w / 2) {
        ball.settled = true
        ball.inCup   = true
        ball.vx = 0; ball.vy = 0
        this.totalScore++
        cup.count++
        this.ballsInFlight = Math.max(0, this.ballsInFlight - 1)
        this.floats.push({
          x: cup.x + (Math.random() - 0.5) * 40, y: cupTop - 14,
          text: '+1', color: '#a5f7a5', life: 40, size: 15,
        })
      }

      // 底部出界
      if (ball.y > H + 20) {
        ball.settled = true
        this.ballsInFlight = Math.max(0, this.ballsInFlight - 1)
      }
    }

    // ── 門 & 釘子碰撞（snapshot 防止新球被當幀立即迭代）──────
    const snapshot = this.balls.slice()
    for (const ball of snapshot) {
      if (ball.settled) continue

      for (const gate of this.gates) {
        // 釘子物理彈射（位置修正 + 速度反射）
        for (const pin of gate.pins) {
          const dx = ball.x - pin.x
          const dy = ball.y - pin.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          const md = ball.r + pin.r
          if (d < md && d > 0.01) {
            const nx = dx / d, ny = dy / d
            ball.x = pin.x + nx * md
            ball.y = pin.y + ny * md
            const dot = ball.vx * nx + ball.vy * ny
            if (dot < 0) {
              ball.vx -= 2 * dot * nx
              ball.vy -= 2 * dot * ny
              ball.vx *= 0.72; ball.vy *= 0.72
            }
          }
        }

        // 分段門碰撞 → 觸發分裂
        for (const seg of gate.segments) {
          if (!seg.passed.has(ball) &&
              ball.y + ball.r >= gate.y &&
              ball.y - ball.r <= gate.y + gate.h + 4 &&
              ball.x + ball.r > seg.x &&
              ball.x - ball.r < seg.x + seg.w) {

            seg.passed.add(ball)
            gate.pulseTimer = 30

            const mult     = seg.mult
            const canSpawn = Math.max(0, MAX_LIVE_BALLS - this.balls.length)
            const spawnCnt = Math.min(mult - 1, canSpawn)

            for (let k = 0; k < spawnCnt; k++) {
              const spread = (k - (spawnCnt - 1) / 2) * 18
              const nb = this._releaseBall(
                ball.x + spread,
                gate.y + gate.h + ball.r + 2,
                spread * 0.1,
                Math.max(ball.vy * 0.8, 1.5)
              )
              seg.passed.add(nb)   // 立即標記新球，防止同幀再觸發
            }

            this.floats.push({
              x: ball.x, y: gate.y - 16,
              text: `×${mult}`,
              color: _segColor(mult),
              life: 55, size: 20,
            })
          }
        }
      }
    }

    // 定期清除已結算球（避免陣列無限增長）
    if (this.balls.length > 80) this.balls = this.balls.filter(b => !b.settled)

    // 判斷結束（所有球 settled 後延遲 1.3 秒進結算）
    if (this.phase === 'waiting') {
      if (this.balls.length > 0 && this.balls.every(b => b.settled)) {
        this.doneTimer += dt * 60
        if (this.doneTimer > 80) this.phase = 'end'
      }
    }
  }

  _checkSlope(ball) {
    const ls = this.leftSlope
    const rs = this.rightSlope

    {
      const t = (ball.x - ls.x1) / (ls.x2 - ls.x1)
      if (t >= 0 && t <= 1) {
        const slopeY = ls.y1 + t * (ls.y2 - ls.y1)
        if (ball.y + ball.r >= slopeY && ball.vy > 0) {
          ball.y  = slopeY - ball.r
          const dx = ls.x2 - ls.x1, dy = ls.y2 - ls.y1
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

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d1830')
    bg.addColorStop(1, '#05101f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 背景粒子
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

    // 頂部資訊列
    ctx.fillStyle = 'rgba(0,10,40,0.75)'
    ctx.fillRect(18, 0, W - 36, 52)
    ctx.fillStyle = '#f5c518'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('⚙️ 能量球台', W / 2, 22)
    ctx.fillStyle = '#88aacc'; ctx.font = '12px sans-serif'
    ctx.fillText(`剩餘：${this.ballsLeft}  球數：${this.totalScore}  🏆 收集越多越好！`, W / 2, 42)

    // ── 分段門 & 釘子 ──────────────────────────────────────
    for (const gate of this.gates) {
      const isPulsing = gate.pulseTimer > 0

      // 分段
      for (const seg of gate.segments) {
        const col = _segColor(seg.mult)

        // 主體
        ctx.fillStyle = col
        if (isPulsing) { ctx.shadowColor = col; ctx.shadowBlur = 10 }
        rrect(ctx, seg.x, gate.y, seg.w, gate.h, 4)
        ctx.fill()
        ctx.shadowBlur = 0

        // 高光條
        ctx.fillStyle = 'rgba(255,255,255,0.28)'
        rrect(ctx, seg.x + 2, gate.y + 1, seg.w - 4, gate.h * 0.45, 3)
        ctx.fill()

        // 倍率文字
        const fs = seg.w < 55 ? 11 : 13
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${fs}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 3
        ctx.fillText(`X${seg.mult}`, seg.x + seg.w / 2, gate.y + gate.h / 2)
        ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic'
      }

      // 釘子（柱身 + 圓頭）
      for (const pin of gate.pins) {
        // 柱身（嵌入門頂上方）
        ctx.fillStyle = '#7a6a58'
        rrect(ctx, pin.x - 4, gate.y - 14, 8, 16, 2)
        ctx.fill()

        // 圓頭（漸層）
        const pg = ctx.createRadialGradient(pin.x - 2, pin.y - 2, 1, pin.x, pin.y, pin.r)
        pg.addColorStop(0, '#d0c0a8')
        pg.addColorStop(1, '#7a6a58')
        ctx.fillStyle = pg
        ctx.beginPath(); ctx.arc(pin.x, pin.y, pin.r, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#5a4a38'; ctx.lineWidth = 1.5; ctx.stroke()
      }
    }

    // 底部斜坡
    this._drawSlopes(ctx, W, H)
    // 收集杯
    this._drawCollectCup(ctx)
    // 上方倒球杯
    this._drawPourCup(ctx)

    // 球
    for (const ball of this.balls) {
      if (ball.inCup || ball.y > H + 10) continue
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      if (!ball.settled) {
        const bg2 = ctx.createRadialGradient(
          ball.x - 2, ball.y - 2, 1,
          ball.x, ball.y, ball.r
        )
        bg2.addColorStop(0, '#ffffff')
        bg2.addColorStop(0.45, ball.color || '#c8e8ff')
        bg2.addColorStop(1, (ball.color || '#6090d0') + 'cc')
        ctx.fillStyle = bg2
      } else {
        ctx.fillStyle = '#8899aacc'
      }
      ctx.fill()
    }

    // 浮動文字
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 25)
      ctx.fillStyle   = f.color || '#ffd700'
      ctx.font        = `bold ${f.size || 18}px sans-serif`
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1

    // 底部提示 / 結算畫面
    if (this.phase === 'aiming' && this.ballsLeft > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(this.t * 2.5) * 0.4
      ctx.fillStyle = '#88aacc'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('👆 點擊移動杯子並釋放球', W / 2, H - 14)
      ctx.globalAlpha = 1
    }

    if (this.phase === 'end') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, H * 0.38, W, 110)
      ctx.fillStyle = '#f5c518'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`🎉 收集 ${this.totalScore} 顆！`, W / 2, H * 0.38 + 40)
      ctx.fillStyle = '#88aacc'; ctx.font = '16px sans-serif'
      ctx.fillText('點擊繼續', W / 2, H * 0.38 + 75)
    }
  }

  _drawSlopes(ctx, W, H) {
    const ls = this.leftSlope
    const rs = this.rightSlope

    const slopeGrad = ctx.createLinearGradient(0, ls.y1, 0, this.slopeBotY)
    slopeGrad.addColorStop(0, '#1a3060')
    slopeGrad.addColorStop(1, '#0d1840')
    ctx.fillStyle = slopeGrad

    // 左斜坡
    ctx.beginPath()
    ctx.moveTo(ls.x1, ls.y1); ctx.lineTo(ls.x2, ls.y2)
    ctx.lineTo(ls.x1, ls.y2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(ls.x1, ls.y1); ctx.lineTo(ls.x2, ls.y2); ctx.stroke()
    ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4
    ctx.beginPath(); ctx.moveTo(ls.x1, ls.y1 - 2); ctx.lineTo(ls.x2, ls.y2 - 2); ctx.stroke()
    ctx.globalAlpha = 1

    // 右斜坡
    ctx.fillStyle = slopeGrad
    ctx.beginPath()
    ctx.moveTo(rs.x1, rs.y1); ctx.lineTo(rs.x2, rs.y2)
    ctx.lineTo(rs.x2, rs.y1); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(rs.x1, rs.y1); ctx.lineTo(rs.x2, rs.y2); ctx.stroke()
    ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4
    ctx.beginPath(); ctx.moveTo(rs.x1, rs.y1 - 2); ctx.lineTo(rs.x2, rs.y2 - 2); ctx.stroke()
    ctx.globalAlpha = 1

    // 開口標線
    const gapY = this.slopeBotY
    ctx.strokeStyle = '#ffd700aa'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(this.gapLeft, gapY); ctx.lineTo(this.gapLeft, gapY + 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(this.gapRight, gapY); ctx.lineTo(this.gapRight, gapY + 10); ctx.stroke()
    ctx.setLineDash([])
  }

  _drawCollectCup(ctx) {
    const cup  = this.collectCup
    const hw   = cup.w / 2
    const top  = cup.y - cup.h / 2

    const grad = ctx.createLinearGradient(cup.x - hw, top, cup.x + hw, top)
    grad.addColorStop(0,   '#1a3a8a')
    grad.addColorStop(0.3, '#2a5acc')
    grad.addColorStop(0.7, '#2a5acc')
    grad.addColorStop(1,   '#1a3a8a')
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(cup.x - hw * 0.7, top)
    ctx.lineTo(cup.x + hw * 0.7, top)
    ctx.lineTo(cup.x + hw,       top + cup.h)
    ctx.lineTo(cup.x - hw,       top + cup.h)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2.5; ctx.stroke()

    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cup.x - hw * 0.7, top + 3); ctx.lineTo(cup.x + hw * 0.7, top + 3); ctx.stroke()

    ctx.fillStyle = '#f5c518'
    ctx.font = `bold ${cup.count >= 100 ? 20 : 24}px sans-serif`
    ctx.textAlign = 'center'
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8
    ctx.fillText(cup.count, cup.x, top + cup.h / 2 + 8)
    ctx.shadowBlur = 0
  }

  _drawPourCup(ctx) {
    const { x, y, w, h } = this.pourCup
    const hw = w / 2

    ctx.fillStyle = 'rgba(255,220,50,0.6)'; ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'; ctx.fillText('▼', x, y - 8)

    const grad = ctx.createLinearGradient(x - hw, y, x + hw, y)
    grad.addColorStop(0,   '#c07040')
    grad.addColorStop(0.5, '#e0a060')
    grad.addColorStop(1,   '#c07040')
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(x - hw, y); ctx.lineTo(x + hw, y)
    ctx.lineTo(x + hw * 0.65, y + h); ctx.lineTo(x - hw * 0.65, y + h)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = '#8a4a10'; ctx.lineWidth = 2; ctx.stroke()

    if (this.ballsLeft > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(this.ballsLeft, x, y + h / 2 + 6)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '13px sans-serif'
      ctx.fillText('空', x, y + h / 2 + 6)
    }

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

  destroy() { this._cleanup() }
}

// ── 工具函式 ──────────────────────────────────────────────
// 分段顏色（參考原版）
function _segColor(mult) {
  if (mult <= 2) return '#f5a623'   // 金黃 X2
  if (mult <= 3) return '#e89200'   // 深金 X3
  if (mult <= 4) return '#4caf50'   // 綠色 X4
  return '#1a9e3a'                  // 深綠 X5+
}

// Fisher-Yates 洗牌（用於隨機打亂分段左右順序）
function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const BALL_COLORS = [
  '#64b5f6', '#ef9a9a', '#a5d6a7', '#fff176',
  '#ffcc80', '#ce93d8', '#80cbc4', '#f48fb1',
]
let _ballColorIdx = 0
function _ballColor() {
  return BALL_COLORS[(_ballColorIdx++) % BALL_COLORS.length]
}
