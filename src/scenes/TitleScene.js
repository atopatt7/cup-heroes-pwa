import { T }                        from '../utils/theme.js'
import { drawSky, drawGround, drawBtn, rrect } from '../utils/drawHelpers.js'

export class TitleScene {
  constructor(canvas, ctx, onStart) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.onStart = onStart
    this.animId  = null
    this.t       = 0
    this.lastTs  = 0

    // 雲朵（x 會緩慢右移）
    this.clouds = [
      { x: 60,  y: 90,  scale: 0.9,  speed: 12 },
      { x: 200, y: 55,  scale: 1.1,  speed: 8  },
      { x: 320, y: 110, scale: 0.75, speed: 14 },
    ]

    // 彩帶 particle
    this.confetti = Array.from({ length: 28 }, (_, i) => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height * 0.6,
      vx:    (Math.random() - 0.5) * 22,
      vy:    15 + Math.random() * 25,
      r:     3 + Math.random() * 4,
      color: ['#f5c518','#e53935','#43a047','#1e88e5','#8e24aa','#fb8c00'][i % 6],
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 4,
    }))

    this._loop    = this._loop.bind(this)
    this._onClick = (e) => { e.preventDefault(); this.stop(); this.onStart() }
  }

  start() {
    this.canvas.addEventListener('pointerdown', this._onClick)
    this.animId = requestAnimationFrame(this._loop)
  }

  stop() {
    this.canvas.removeEventListener('pointerdown', this._onClick)
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
  }

  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t   += dt
    this.lastTs = ts
    this._update(dt)
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _update(dt) {
    const W = this.canvas.width
    const H = this.canvas.height

    // 雲朵漂移（到邊界就從左側重新出現）
    for (const c of this.clouds) {
      c.x += c.speed * dt
      if (c.x > W + 120) c.x = -120
    }

    // 彩帶降落
    for (const p of this.confetti) {
      p.x   += p.vx * dt
      p.y   += p.vy * dt
      p.rot += p.rotV * dt
      if (p.y > H + 20) {
        p.y  = -10
        p.x  = Math.random() * W
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height
    const groundY = H * 0.76

    // ── 天空 ──────────────────────────────────────────────
    drawSky(ctx, W, H, this.clouds)

    // ── 草地 / 地面 ───────────────────────────────────────
    drawGround(ctx, W, H, groundY)

    // ── 彩帶 ──────────────────────────────────────────────
    for (const p of this.confetti) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.globalAlpha = 0.75
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    const bounce = Math.sin(this.t * 2.5) * 8

    // ── 標題牌（木板風）─────────────────────────────────
    const signW = W * 0.84
    const signH = 110
    const signX = (W - signW) / 2
    const signY = H * 0.10

    // 木板陰影
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    rrect(ctx, signX + 5, signY + 8 + bounce * 0.3, signW, signH, 14)
    ctx.fill()
    // 木板本體
    const woodG = ctx.createLinearGradient(signX, signY, signX, signY + signH)
    woodG.addColorStop(0, '#d4956a')
    woodG.addColorStop(0.4, '#c07848')
    woodG.addColorStop(1,   '#8a4e22')
    ctx.fillStyle = woodG
    rrect(ctx, signX, signY + bounce * 0.3, signW, signH, 14)
    ctx.fill()
    // 木板高光
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rrect(ctx, signX + 4, signY + bounce * 0.3 + 4, signW - 8, signH / 3, 10)
    ctx.fill()
    // 木板邊框
    ctx.strokeStyle = T.woodDark; ctx.lineWidth = 3
    rrect(ctx, signX, signY + bounce * 0.3, signW, signH, 14)
    ctx.stroke()
    // 釘子
    for (const nx of [signX + 18, signX + signW - 18]) {
      for (const ny of [signY + bounce * 0.3 + 14, signY + bounce * 0.3 + signH - 14]) {
        ctx.fillStyle = '#5a3a1a'
        ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#c8a060'
        ctx.beginPath(); ctx.arc(nx - 1, ny - 1, 3, 0, Math.PI * 2); ctx.fill()
      }
    }

    // 主標題文字
    ctx.textAlign = 'center'
    ctx.shadowColor = T.woodDark; ctx.shadowBlur = 6
    ctx.fillStyle   = T.gold
    ctx.font        = 'bold 42px sans-serif'
    ctx.fillText('Cup Heroes', W / 2, signY + bounce * 0.3 + 52)
    ctx.shadowBlur  = 0
    ctx.fillStyle   = T.textWhite
    ctx.font        = '17px sans-serif'
    ctx.fillText('⚔️ 杯子英雄的冒險 ⚔️', W / 2, signY + bounce * 0.3 + 80)

    // ── 主角杯子（站在草地上）────────────────────────────
    this._drawHeroCup(ctx, W / 2, groundY - 12, bounce)

    // ── 出發按鈕 ──────────────────────────────────────────
    const btnPulse = 0.93 + Math.sin(this.t * 3.2) * 0.07
    ctx.save()
    ctx.translate(W / 2, H * 0.90)
    ctx.scale(btnPulse, btnPulse)
    drawBtn(ctx, 0, 0, 220, 56, '▶  點擊開始', T.btnRed, T.btnRedDark, 28)
    ctx.restore()

    // ── 版本號 ────────────────────────────────────────────
    ctx.fillStyle   = 'rgba(0,0,0,0.35)'
    ctx.font        = '12px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText('v0.3.0', W / 2, H - 12)
  }

  _drawHeroCup(ctx, x, groundY, bounce) {
    const y = groundY + bounce * 0.6

    // 陰影
    ctx.fillStyle   = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(x, groundY + 14, 28, 8, 0, 0, Math.PI * 2)
    ctx.fill()

    // 杯身（梯形）
    const cupW = 50, cupH = 60, cupBotW = 38
    const topX = x - cupW / 2
    const botX = x - cupBotW / 2
    const topY = y - cupH
    const botY = y

    const cupG = ctx.createLinearGradient(topX, topY, topX + cupW, topY)
    cupG.addColorStop(0,   '#2090f0')
    cupG.addColorStop(0.45,'#50b8ff')
    cupG.addColorStop(1,   '#0060c8')
    ctx.fillStyle = cupG
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.lineTo(topX + cupW, topY)
    ctx.lineTo(botX + cupBotW, botY)
    ctx.lineTo(botX, botY)
    ctx.closePath()
    ctx.fill()

    // 杯身高光
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.beginPath()
    ctx.moveTo(topX + 6, topY + 4)
    ctx.lineTo(topX + cupW * 0.45, topY + 4)
    ctx.lineTo(botX + cupBotW * 0.42, botY - 6)
    ctx.lineTo(botX + 6, botY - 6)
    ctx.closePath()
    ctx.fill()

    // 杯口
    const rimG = ctx.createLinearGradient(topX, topY, topX, topY + 10)
    rimG.addColorStop(0, '#70d0ff')
    rimG.addColorStop(1, '#1880d0')
    ctx.fillStyle = rimG
    ctx.fillRect(topX - 4, topY - 4, cupW + 8, 12)
    ctx.strokeStyle = '#005faa'; ctx.lineWidth = 1.5
    ctx.strokeRect(topX - 4, topY - 4, cupW + 8, 12)

    // 臉（眼睛 + 嘴巴）
    const eyeY = topY + cupH * 0.38
    // 眼白
    for (const ex of [x - 10, x + 10]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 7, 7, 0, 0, Math.PI * 2); ctx.fill()
      // 眼珠
      ctx.fillStyle = '#1a3a7a'
      ctx.beginPath(); ctx.ellipse(ex + 1, eyeY + 1, 4, 4, 0, 0, Math.PI * 2); ctx.fill()
      // 高光
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ex + 2, eyeY - 1, 2, 0, Math.PI * 2); ctx.fill()
    }
    // 嘴巴
    ctx.strokeStyle = '#1a3a7a'; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, eyeY + 14, 9, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()

    // 劍
    ctx.save()
    ctx.translate(x + 34, y - 38)
    ctx.rotate(-0.45)
    // 刀身
    ctx.fillStyle = '#d8e8f8'
    ctx.fillRect(-3, -28, 6, 34)
    ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 1
    ctx.strokeRect(-3, -28, 6, 34)
    // 護手
    ctx.fillStyle = T.gold
    ctx.fillRect(-9, 0, 18, 5)
    // 握柄
    ctx.fillStyle = T.woodMid
    ctx.fillRect(-2.5, 5, 5, 14)
    ctx.restore()

    // 杯體輪廓
    ctx.strokeStyle = '#005faa'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.lineTo(topX + cupW, topY)
    ctx.lineTo(botX + cupBotW, botY)
    ctx.lineTo(botX, botY)
    ctx.closePath()
    ctx.stroke()
  }
}
