// PhysicsEngine.js — 球的物理計算，與畫面無關
export const PhysicsEngine = {
  GRAVITY:  0.4,
  BOUNCE:   0.3,
  FRICTION: 0.995,
  WALL_LEFT:  18,

  // 更新單顆球的位置與速度
  updateBall(ball, canvasWidth) {
    ball.vy += this.GRAVITY
    ball.vx *= this.FRICTION
    ball.x  += ball.vx
    ball.y  += ball.vy

    // 左右牆壁
    if (ball.x - ball.r < this.WALL_LEFT) {
      ball.x = this.WALL_LEFT + ball.r
      ball.vx *= -this.BOUNCE
    }
    if (ball.x + ball.r > canvasWidth - this.WALL_LEFT) {
      ball.x = canvasWidth - this.WALL_LEFT - ball.r
      ball.vx *= -this.BOUNCE
    }
  },

  // 檢查球是否碰到隔板，回傳是否碰撞
  checkBoardCollision(ball, board) {
    if (ball._hitBoards?.has(board)) return false
    if (ball.vy <= 0) return false

    const bY = board.y
    if (
      ball.y + ball.r >= bY - 6 &&
      ball.y + ball.r <= bY + 14 &&
      ball.x >= board.x - ball.r &&
      ball.x <= board.x + board.width + ball.r
    ) {
      ball.y = bY - 6 - ball.r
      ball.vy *= -this.BOUNCE
      const mid = board.x + board.width / 2
      ball.vx = ball.x < mid
        ? -(2.5 + Math.random() * 2)
        :  (2.5 + Math.random() * 2)
      if (!ball._hitBoards) ball._hitBoards = new Set()
      ball._hitBoards.add(board)
      return true
    }
    return false
  },

  // 檢查球是否進入收集杯
  checkCupCollision(ball, cup) {
    const cupLeft  = cup.x - cup.width / 2
    const cupRight = cup.x + cup.width / 2
    const cupTop   = cup.y - cup.height / 2
    return (
      ball.y + ball.r >= cupTop &&
      ball.x >= cupLeft &&
      ball.x <= cupRight
    )
  },
}
