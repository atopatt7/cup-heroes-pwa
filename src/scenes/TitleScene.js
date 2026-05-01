export class TitleScene {
  constructor(canvas, ctx, onStart) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.onStart = onStart
    this.animId  = null
    this.t       = 0
    this.lastTs  = 0

    // 星空粒子
    this.stars = Array.from({ length: 60 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.8 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.6 + 0.3,
    }))

    // 流星
    this.meteors = []
    this.meteorTimer = 0

    // 上升粒子（杯子周圍蒸氣）
    this.particles = []

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
    this.t += dt
    this.lastTs = ts
    this._update(dt)
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _update(dt) {
    const W = this.canvas.width
    const H = this.canvas.height

    // 流星
    this.meteorTimer += dt
    if (this.meteorTimer > 2.5 + Math.random() * 3) {
      this.meteorTimer = 0
      this.meteors.push({
        x:  Math.random() * W * 0.7,
        y:  Math.random() * H * 0.3,
        vx: 280 + Math.random() * 120,
        vy: 180 + Math.random() * 80,
        life: 1,
        len: 80 + Math.random() * 60,
      })
    }
    this.meteors = this.meteors.filter(m => m.life > 0)
    for (const m of this.meteors) {
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.life -= dt * 1.8
    }

    // 上升粒子
    if (this.t % 0.15 < dt) {
      const cupX = W / 2
      const cupY = H * 0.33
      this.particles.push({
        x:    cupX + (Math.random() - 0.5) * 40,
        y:    cupY,
        vx:   (Math.random() - 0.5) * 18,
        vy:   -(18 + Math.random() * 22),
        r:    2 + Math.random() * 3,
        life: 1,
      })
    }
    this.particles = this.particles.filter(p => p.life > 0)
    for (const p of this.particles) {
      p.x  += p.vx * dt
      p.y  += p.vy * dt
      p.vx *= 0.97
      p.life -= dt * 1.1
    }
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // ── 背景 ──────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0,   '#0d0d1e')
    bg.addColorStop(0.5, '#1a1a2e')
    bg.addColorStop(1,   '#0f1f3d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // ── 星空 ──────────────────────────────────────────────
    for (const s of this.stars) {
      const a = 0.25 + Math.sin(this.t * s.speed + s.phase) * 0.35
      ctx.globalAlpha = a
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ── 流星 ──────────────────────────────────────────────
    for (const m of this.meteors) {
      const alpha = m.life * 0.85
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth   = 1.5
      ctx.beginPath()
      const nx = -m.vx / Math.hypot(m.vx, m.vy)
      const ny = -m.vy / Math.hypot(m.vx, m.vy)
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x + nx * m.len * m.life, m.y + ny * m.len * m.life)
      const mg = ctx.createLinearGradient(m.x, m.y, m.x + nx * m.len, m.y + ny * m.len)
      mg.addColorStop(0, `rgba(255,255,255,${alpha})`)
      mg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = mg
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // ── 底部光暈 ──────────────────────────────────────────
    const glow = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.55)
    glow.addColorStop(0,   'rgba(90,50,180,0.18)')
    glow.addColorStop(0.5, 'rgba(40,20,100,0.10)')
    glow.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    const bounce = Math.sin(this.t * 2.2) * 7

    // ── 蒸氣粒子 ──────────────────────────────────────────
    for (const p of this.particles) {
      ctx.globalAlpha = p.life * 0.35
      ctx.fillStyle   = '#c8a0ff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.textAlign = 'center'

    // ── 杯子 emoji ────────────────────────────────────────
    ctx.shadowColor = '#b060ff'
    ctx.shadowBlur  = 36
    ctx.font = '80px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('☕', W / 2, H * 0.33 + bounce)
    ctx.shadowBlur = 0

    // ── 主標題 ────────────────────────────────────────────
    // 光暈層
    ctx.shadowColor = '#f5c518'
    ctx.shadowBlur  = 28
    ctx.fillStyle   = '#f5c518'
    ctx.font        = 'bold 50px sans-serif'
    ctx.fillText('Cup Heroes', W / 2, H * 0.46 + bounce * 0.5)

    // 白色邊框字（疊加）
    ctx.shadowBlur  = 0
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth   = 2
    ctx.strokeText('Cup Heroes', W / 2, H * 0.46 + bounce * 0.5)

    // ── 副標題 ────────────────────────────────────────────
    ctx.fillStyle = '#9ab0cc'
    ctx.font      = '17px sans-serif'
    ctx.fillText('回合制杯子英雄冒險', W / 2, H * 0.535)

    // ── 裝飾線 ────────────────────────────────────────────
    const lineY = H * 0.565
    const lineA = 0.3 + Math.sin(this.t * 1.2) * 0.15
    ctx.globalAlpha = lineA
    ctx.strokeStyle = '#5a4090'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(W * 0.15, lineY); ctx.lineTo(W * 0.85, lineY)
    ctx.stroke()
    ctx.globalAlpha = 1

    // ── 點擊提示（閃爍）──────────────────────────────────
    const blink = 0.4 + Math.sin(this.t * 2.8) * 0.45
    ctx.globalAlpha = blink
    // 按鈕背景
    const btnW = 200, btnH = 46
    const btnX = W / 2 - btnW / 2
    const btnY = H * 0.70 - btnH / 2
    const btnG = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH)
    btnG.addColorStop(0, 'rgba(90,50,180,0.55)')
    btnG.addColorStop(1, 'rgba(50,20,100,0.55)')
    ctx.fillStyle = btnG
    this._rrect(ctx, btnX, btnY, btnW, btnH, 23)
    ctx.fill()
    ctx.strokeStyle = 'rgba(180,120,255,0.6)'
    ctx.lineWidth   = 1.5
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.globalAlpha = blink
    ctx.fillStyle   = '#e8d8ff'
    ctx.font        = 'bold 18px sans-serif'
    ctx.fillText('▶  點擊開始', W / 2, H * 0.70 + 6)
    ctx.globalAlpha = 1

    // ── 版本號 ────────────────────────────────────────────
    ctx.fillStyle = '#2a2a4a'
    ctx.font      = '12px sans-serif'
    ctx.fillText('v0.3.0', W / 2, H - 20)
  }

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
}
