/**
 * VictoryScene — 通關勝利畫面
 */
export class VictoryScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.t = 0
    this.stars = []
  }

  onEnter({ gameState }) {
    this.gameState = gameState
    this.t = 0
    // 生成背景星星
    this.stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }))

    this._onTap = (e) => {
      e.preventDefault()
      this.sm.switchTo('title')
    }
    this.canvas.addEventListener('pointerdown', this._onTap)
  }

  onExit() {
    this.canvas.removeEventListener('pointerdown', this._onTap)
  }

  update(delta) { this.t += delta }

  draw(ctx) {
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
      const alpha = 0.4 + Math.sin(this.t * s.speed + s.phase) * 0.4
      ctx.fillStyle = `rgba(255,255,200,${alpha})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.textAlign = 'center'

    // 彩帶效果
    const confettiColors = ['#f5c518', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6']
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(i * 1.3 + this.t * 0.8) * 0.5 + 0.5) * W
      const y = ((this.t * 80 * (0.5 + (i % 3) * 0.3) + i * 40) % (H + 40)) - 20
      ctx.fillStyle = confettiColors[i % confettiColors.length]
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.t + i)
      ctx.fillRect(-5, -3, 10, 6)
      ctx.restore()
    }

    // 主標題
    const bounce = Math.sin(this.t * 2.5) * 8
    ctx.shadowColor = '#f5c518'
    ctx.shadowBlur = 30
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 56px sans-serif'
    ctx.fillText('🏆 通關！', W / 2, H * 0.32 + bounce)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('你擊敗了黑龍！', W / 2, H * 0.46)

    ctx.fillStyle = '#aaa'
    ctx.font = '17px sans-serif'
    ctx.fillText(`累積資源：${this.gameState?.resource || 0}`, W / 2, H * 0.56)

    // 重玩按鈕
    const alpha = 0.6 + Math.sin(this.t * 2) * 0.4
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#fff'
    ctx.font = '19px sans-serif'
    ctx.fillText('點擊任意處返回標題', W / 2, H * 0.76)
    ctx.globalAlpha = 1
  }
}
