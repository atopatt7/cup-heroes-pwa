/**
 * TitleScene - 標題畫面
 * 顯示遊戲 Logo 與「開始遊戲」按鈕
 */
export class TitleScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.t = 0 // 動畫計時器
    this.tapAnywhere = false
  }

  onEnter() {
    this.t = 0
    this.tapAnywhere = false
    this._onClick = (e) => {
      e.preventDefault()
      this.tapAnywhere = true
      // TODO: 切換到 'battle' 場景
      console.log('[TitleScene] 點擊！準備進入遊戲...')
    }
    this.canvas.addEventListener('pointerdown', this._onClick)
  }

  onExit() {
    this.canvas.removeEventListener('pointerdown', this._onClick)
  }

  update(delta) {
    this.t += delta
  }

  draw(ctx) {
    const W = this.canvas.width
    const H = this.canvas.height

    // ── 背景漸層 ──────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(1, '#16213e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // ── 標題文字 ──────────────────────────────────────────
    const bounce = Math.sin(this.t * 2) * 6
    ctx.save()
    ctx.textAlign = 'center'

    // 陰影
    ctx.shadowColor = '#e94560'
    ctx.shadowBlur = 24

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold 64px sans-serif`
    ctx.fillText('☕', W / 2, H * 0.32 + bounce)

    ctx.shadowBlur = 0
    ctx.fillStyle = '#f5c518'
    ctx.font = `bold 48px sans-serif`
    ctx.fillText('Cup Heroes', W / 2, H * 0.44 + bounce * 0.5)

    // 副標題
    ctx.fillStyle = '#aaa'
    ctx.font = '18px sans-serif'
    ctx.fillText('回合制杯子英雄冒險', W / 2, H * 0.52)

    // 點擊提示（閃爍）
    const alpha = 0.5 + Math.sin(this.t * 3) * 0.5
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#ffffff'
    ctx.font = '20px sans-serif'
    ctx.fillText('點擊任意處開始', W / 2, H * 0.72)
    ctx.globalAlpha = 1

    // 版本號
    ctx.fillStyle = '#555'
    ctx.font = '13px sans-serif'
    ctx.fillText('v0.1.0', W / 2, H - 24)

    ctx.restore()
  }
}
