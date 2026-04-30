/**
 * GameOverScene — 遊戲結束畫面
 */
export class GameOverScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.t = 0
  }

  onEnter({ gameState }) {
    this.gameState = gameState
    this.t = 0
    this._onTap = (e) => {
      e.preventDefault()
      // 重新開始：重置 gameState 並從第1波開始
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
    ctx.fillStyle = '#0a0000'
    ctx.fillRect(0, 0, W, H)

    // 粒子效果（簡單紅點）
    for (let i = 0; i < 8; i++) {
      const x = (W * (i + 1)) / 9
      const y = H * 0.5 + Math.sin(this.t * 1.5 + i) * 30
      ctx.fillStyle = `rgba(231,76,60,${0.2 + Math.sin(this.t + i) * 0.15})`
      ctx.beginPath()
      ctx.arc(x, y, 20 + i * 3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.textAlign = 'center'

    // 主標題
    ctx.shadowColor = '#e74c3c'
    ctx.shadowBlur = 30
    ctx.fillStyle = '#e74c3c'
    ctx.font = 'bold 64px sans-serif'
    ctx.fillText('GAME OVER', W / 2, H * 0.35)
    ctx.shadowBlur = 0

    ctx.fillStyle = '#888'
    ctx.font = '18px sans-serif'
    ctx.fillText(`到達第 ${this.gameState?.wave || 1} 波`, W / 2, H * 0.46)

    // 重玩按鈕（閃爍）
    const alpha = 0.6 + Math.sin(this.t * 2.5) * 0.4
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#fff'
    ctx.font = '20px sans-serif'
    ctx.fillText('點擊任意處重新開始', W / 2, H * 0.70)
    ctx.globalAlpha = 1
  }
}
