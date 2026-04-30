export class TitleScene {
  constructor(canvas, ctx, onStart) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.onStart = onStart
    this.animId  = null
    this.t       = 0
    this.lastTs  = 0

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
    this.t += Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs = ts
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // 背景漸層
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1a1a2e')
    bg.addColorStop(1, '#16213e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 背景星點
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + 50) % W)
      const sy = ((i * 97  + 30) % H)
      const sa = 0.3 + Math.sin(this.t * 1.5 + i) * 0.3
      ctx.globalAlpha = sa
      ctx.beginPath()
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const bounce = Math.sin(this.t * 2) * 6
    ctx.textAlign = 'center'

    // 杯子 emoji
    ctx.shadowColor = '#e94560'
    ctx.shadowBlur  = 24
    ctx.font = '72px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('☕', W / 2, H * 0.32 + bounce)
    ctx.shadowBlur = 0

    // 標題
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('Cup Heroes', W / 2, H * 0.44 + bounce * 0.5)

    // 副標題
    ctx.fillStyle = '#aaa'
    ctx.font = '18px sans-serif'
    ctx.fillText('回合制杯子英雄冒險', W / 2, H * 0.52)

    // 點擊提示（閃爍）
    ctx.globalAlpha = 0.5 + Math.sin(this.t * 3) * 0.5
    ctx.fillStyle = '#ffffff'
    ctx.font = '20px sans-serif'
    ctx.fillText('點擊任意處開始', W / 2, H * 0.72)
    ctx.globalAlpha = 1

    // 版本號
    ctx.fillStyle = '#444'
    ctx.font = '13px sans-serif'
    ctx.fillText('v0.2.0', W / 2, H - 24)
  }
}
