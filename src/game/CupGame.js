/**
 * CupGame - 杯球彈珠台
 *
 * 玩法：
 *   - 球從頂部落下，碰到格子反彈
 *   - 格子有乘數：×1 ×2 ×3 ×5
 *   - 底部有杯子接球
 *   - 最終資源 = Σ (球落入杯子時的乘數 × 基礎資源)
 *
 * 此模組只負責物理與邏輯，繪製由 CupGameScene 處理
 */

const GRAVITY = 980      // px/s²
const BALL_RADIUS = 12
const RESTITUTION = 0.6  // 彈力係數

export class CupGame {
  /**
   * @param {number} width  - 畫布寬度
   * @param {number} height - 畫布高度
   * @param {number} baseResource - 本波基礎資源量
   */
  constructor(width, height, baseResource = 20) {
    this.W = width
    this.H = height
    this.baseResource = baseResource
    this.balls = []
    this.pegs = []        // { x, y, multiplier }
    this.cups = []        // { x, y, w, multiplier }
    this.collected = []   // 已落入杯子的球資源
    this.active = true
    this._buildLayout()
  }

  /** 建立釘子與杯子佈局 */
  _buildLayout() {
    // ── 釘子（三角形排列）────────────────────────────────
    const rows = 5
    const startY = this.H * 0.25
    const rowGap = this.H * 0.1
    const mults = [1, 2, 3, 5, 3, 2, 1]

    for (let r = 0; r < rows; r++) {
      const cols = r + 3
      const spacing = this.W / (cols + 1)
      for (let c = 0; c < cols; c++) {
        this.pegs.push({
          x: spacing * (c + 1),
          y: startY + r * rowGap,
          r: 8,
        })
      }
    }

    // ── 杯子（底部，附乘數）──────────────────────────────
    const cupCount = 7
    const cupW = this.W / cupCount
    for (let i = 0; i < cupCount; i++) {
      this.cups.push({
        x: i * cupW,
        y: this.H * 0.88,
        w: cupW,
        h: 40,
        multiplier: mults[i],
      })
    }
  }

  /** 投球（從頂部隨機偏移位置落下） */
  dropBall() {
    if (!this.active) return
    this.balls.push({
      x: this.W / 2 + (Math.random() - 0.5) * 60,
      y: 40,
      vx: (Math.random() - 0.5) * 80,
      vy: 50,
      r: BALL_RADIUS,
      active: true,
    })
  }

  /** 物理更新 */
  update(delta) {
    for (const ball of this.balls) {
      if (!ball.active) continue

      // 重力
      ball.vy += GRAVITY * delta
      ball.x += ball.vx * delta
      ball.y += ball.vy * delta

      // 牆壁碰撞
      if (ball.x - ball.r < 0) {
        ball.x = ball.r
        ball.vx = Math.abs(ball.vx) * RESTITUTION
      }
      if (ball.x + ball.r > this.W) {
        ball.x = this.W - ball.r
        ball.vx = -Math.abs(ball.vx) * RESTITUTION
      }

      // 釘子碰撞
      for (const peg of this.pegs) {
        const dx = ball.x - peg.x
        const dy = ball.y - peg.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = ball.r + peg.r

        if (dist < minDist) {
          const nx = dx / dist
          const ny = dy / dist
          // 推出重疊
          ball.x = peg.x + nx * minDist
          ball.y = peg.y + ny * minDist
          // 反彈
          const dot = ball.vx * nx + ball.vy * ny
          ball.vx = (ball.vx - 2 * dot * nx) * RESTITUTION
          ball.vy = (ball.vy - 2 * dot * ny) * RESTITUTION
        }
      }

      // 杯子碰撞
      for (const cup of this.cups) {
        if (
          ball.y + ball.r >= cup.y &&
          ball.y - ball.r <= cup.y + cup.h &&
          ball.x >= cup.x &&
          ball.x <= cup.x + cup.w
        ) {
          ball.active = false
          const earned = this.baseResource * cup.multiplier
          this.collected.push({ multiplier: cup.multiplier, earned })
          break
        }
      }
    }

    // 如果所有球都落定，結束
    if (this.balls.length > 0 && this.balls.every((b) => !b.active)) {
      this.active = false
    }
  }

  /** 計算本局總資源 */
  getTotalResource() {
    return this.collected.reduce((sum, c) => sum + c.earned, 0)
  }
}
