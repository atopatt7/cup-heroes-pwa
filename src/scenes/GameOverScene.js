export class GameOverScene {
  constructor(canvas, ctx, gameState, onRestart) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.gameState = gameState
    this.onRestart = onRestart
    this.animId    = null
    this.t         = 0
    this.lastTs    = 0

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
    ctx.fillStyle = '#0a0000'
    ctx.fillRect(0, 0, W, H)

    // 紅色光暈
    for (let i = 0; i < 6; i++) {
      const x = (W * (i + 1)) / 7
      const y = H * 0.5 + Math.sin(this.t * 1.5 + i) * 28
      ctx.fillStyle = `rgba(180,20,20,${0.12 + Math.sin(this.t + i) * 0.06})`
      ctx.beginPath()
      ctx.arc(x, y, 55 + i * 8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.textAlign = 'center'

    // 主標題
    ctx.shadowColor = '#e74c3c'
    ctx.shadowBlur  = 32
    ctx.fillStyle   = '#e74c3c'
    ctx.font        = 'bold 62px sans-serif'
    ctx.fillText('GAME OVER', W / 2, H * 0.36)
    ctx.shadowBlur  = 0

    // 波次
    const wave = (this.gameState.currentWave || 1)
    ctx.fillStyle = '#888'
    ctx.font      = '20px sans-serif'
    ctx.fillText(`到達第 ${wave} 波`, W / 2, H * 0.48)

    // 英雄數值
    const h = this.gameState.hero
    if (h) {
      ctx.fillStyle = '#555'
      ctx.font      = '15px sans-serif'
      ctx.fillText(`ATK ${h.atk}  DEF ${h.def}  MaxHP ${h.maxHp}`, W / 2, H * 0.56)
    }

    // 重玩提示（閃爍）
    ctx.globalAlpha = 0.55 + Math.sin(this.t * 2.5) * 0.45
    ctx.fillStyle   = '#ccc'
    ctx.font        = '19px sans-serif'
    ctx.fillText('點擊任意處重新開始', W / 2, H * 0.74)
    ctx.globalAlpha = 1
  }
}
