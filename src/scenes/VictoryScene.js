export class VictoryScene {
  constructor(canvas, ctx, gameState, onRestart) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.gameState = gameState
    this.onRestart = onRestart
    this.animId    = null
    this.t         = 0
    this.lastTs    = 0

    // 背景星星
    this.stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.8 + 0.3,
    }))

    this._loop    = this._loop.bind(this)
    this._onClick = (e) => { e.preventDefault(); this.stop(); this.onRestart() }
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
    this.t += Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs = ts
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d0521')
    bg.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 星星
    for (const s of this.stars) {
      ctx.globalAlpha = 0.3 + Math.sin(this.t * s.speed + s.phase) * 0.35
      ctx.fillStyle   = '#fffde0'
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // 彩帶
    const colors = ['#f5c518', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22']
    for (let i = 0; i < 22; i++) {
      const x = (Math.sin(i * 1.3 + this.t * 0.7) * 0.5 + 0.5) * W
      const y = ((this.t * 70 * (0.4 + (i % 4) * 0.2) + i * 38) % (H + 40)) - 20
      ctx.fillStyle = colors[i % colors.length]
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.t * 1.5 + i)
      ctx.fillRect(-5, -3, 10, 6)
      ctx.restore()
    }

    ctx.textAlign = 'center'

    // 主標題
    const bounce = Math.sin(this.t * 2.5) * 7
    ctx.shadowColor = '#f5c518'
    ctx.shadowBlur  = 28
    ctx.fillStyle   = '#f5c518'
    ctx.font        = 'bold 58px sans-serif'
    ctx.fillText('🏆 通關！', W / 2, H * 0.32 + bounce)
    ctx.shadowBlur  = 0

    ctx.fillStyle = '#fff'
    ctx.font      = 'bold 26px sans-serif'
    ctx.fillText('你擊敗了所有敵人！', W / 2, H * 0.46)

    // 英雄最終數值
    const h = this.gameState.hero
    if (h) {
      ctx.fillStyle = '#aaa'
      ctx.font      = '16px sans-serif'
      ctx.fillText(`最終 ATK ${h.atk}  DEF ${h.def}  HP ${h.hp}/${h.maxHp}`, W / 2, H * 0.56)
    }

    // 返回提示（閃爍）
    ctx.globalAlpha = 0.55 + Math.sin(this.t * 2) * 0.45
    ctx.fillStyle   = '#fff'
    ctx.font        = '19px sans-serif'
    ctx.fillText('點擊任意處返回標題', W / 2, H * 0.78)
    ctx.globalAlpha = 1
  }
}
