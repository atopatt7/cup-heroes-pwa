import { CupGame } from '../game/CupGame.js'

/**
 * CupGameScene — 杯球彈珠台畫面
 *
 * 玩法：
 *   - 玩家點擊畫面投出一顆球（共 3 球）
 *   - 球碰到釘子反彈，最終落入底部有乘數的杯子
 *   - 全部球落定後顯示本波總資源，點擊繼續進升級選牌畫面
 */
export class CupGameScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.game = null
    this.ballsLeft = 3
    this.state = 'idle'   // 'idle' | 'dropping' | 'result'
    this.t = 0
    this.totalResource = 0
  }

  onEnter({ wave, heroManager, gameState }) {
    this.wave = wave
    this.hm = heroManager
    this.gameState = gameState
    this.t = 0
    this.ballsLeft = 3
    this.state = 'idle'
    this.totalResource = 0

    const baseResource = 10 + wave * 3
    this.game = new CupGame(this.canvas.width, this.canvas.height, baseResource)

    this._onTap = (e) => {
      e.preventDefault()
      this._handleTap()
    }
    this.canvas.addEventListener('pointerdown', this._onTap)
  }

  onExit() {
    this.canvas.removeEventListener('pointerdown', this._onTap)
  }

  _handleTap() {
    if (this.state === 'idle' || this.state === 'dropping') {
      if (this.ballsLeft > 0) {
        this.game.dropBall()
        this.ballsLeft--
        this.state = 'dropping'
      }
      return
    }

    if (this.state === 'result') {
      // 進入升級選牌
      this.sm.switchTo('upgrade', {
        wave: this.wave,
        heroManager: this.hm,
        gameState: this.gameState,
        resource: this.totalResource,
      })
    }
  }

  update(delta) {
    this.t += delta
    if (this.game) {
      this.game.update(delta)

      // 全部球落定 → 顯示結果
      if (this.state === 'dropping' && !this.game.active && this.ballsLeft === 0) {
        this.totalResource = this.game.getTotalResource()
        this.gameState.resource = (this.gameState.resource || 0) + this.totalResource
        this.state = 'result'
      }

      // 還有球但目前沒有活動的球 → 回 idle 等下一顆
      if (this.state === 'dropping' && this.ballsLeft > 0) {
        const activeBalls = this.game.balls.filter((b) => b.active)
        if (activeBalls.length === 0) this.state = 'idle'
      }
    }
  }

  draw(ctx) {
    const W = this.canvas.width
    const H = this.canvas.height
    const g = this.game
    if (!g) return

    // ── 背景 ─────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1a1a2e')
    bg.addColorStop(1, '#16213e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // ── 標題 ─────────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(`☕ Wave ${this.wave} — 杯球彈珠台`, W / 2, 36)

    ctx.fillStyle = '#aaa'
    ctx.font = '15px sans-serif'
    ctx.fillText(`剩餘球數：${'🔵'.repeat(this.ballsLeft)}${'⚫'.repeat(3 - this.ballsLeft)}`, W / 2, 62)

    // ── 釘子 ─────────────────────────────────────────────
    ctx.fillStyle = '#7f8c8d'
    for (const peg of g.pegs) {
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#95a5a6'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // ── 杯子 ─────────────────────────────────────────────
    const multColors = { 1: '#3498db', 2: '#27ae60', 3: '#e67e22', 5: '#e74c3c' }
    for (const cup of g.cups) {
      const color = multColors[cup.multiplier] || '#888'
      ctx.fillStyle = color + 'cc'
      ctx.fillRect(cup.x + 2, cup.y, cup.w - 4, cup.h)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(cup.x + 2, cup.y, cup.w - 4, cup.h)

      // 乘數文字
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`×${cup.multiplier}`, cup.x + cup.w / 2, cup.y + cup.h / 2 + 6)
    }

    // ── 球 ───────────────────────────────────────────────
    for (const ball of g.balls) {
      if (!ball.active) continue
      const grad = ctx.createRadialGradient(
        ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, 1,
        ball.x, ball.y, ball.r
      )
      grad.addColorStop(0, '#fff')
      grad.addColorStop(1, '#3498db')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#2980b9'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // ── 落定的球（顯示在杯子裡） ─────────────────────────
    g.balls.filter((b) => !b.active).forEach((ball, i) => {
      ctx.fillStyle = '#3498db88'
      ctx.beginPath()
      ctx.arc(ball.x, ball.y + 10, ball.r * 0.7, 0, Math.PI * 2)
      ctx.fill()
    })

    // ── 操作提示 ─────────────────────────────────────────
    if (this.state === 'idle' && this.ballsLeft > 0) {
      const pulse = 0.5 + Math.sin(this.t * 3) * 0.5
      ctx.globalAlpha = 0.6 + pulse * 0.4
      ctx.fillStyle = '#fff'
      ctx.font = '18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('👆 點擊投球', W / 2, H * 0.94)
      ctx.globalAlpha = 1
    }

    // ── 結果畫面 ─────────────────────────────────────────
    if (this.state === 'result') {
      // 半透明遮罩
      ctx.fillStyle = 'rgba(0,0,0,0.65)'
      ctx.fillRect(0, 0, W, H)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#f5c518'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('本波資源', W / 2, H * 0.38)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 64px sans-serif'
      ctx.fillText(`+${this.totalResource}`, W / 2, H * 0.50)

      // 明細
      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#ccc'
      this.game.collected.forEach((c, i) => {
        ctx.fillText(`×${c.multiplier} → +${c.earned}`, W / 2, H * 0.58 + i * 22)
      })

      // 繼續按鈕
      this._drawButton(ctx, W / 2, H * 0.78, 200, 48, '選擇升級 →', '#9b59b6', '#6c3483')
    }
  }

  _drawButton(ctx, cx, cy, w, h, label, c1, c2) {
    const x = cx - w / 2, y = cy - h / 2
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    this._roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy)
    ctx.textBaseline = 'alphabetic'
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
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
