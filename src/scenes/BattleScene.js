// BattleScene.js — 自動戰鬥場景（卡牌效果 + 章節系統）
import { createBattleState, playerAttack, enemyAttack, checkBattleEnd, getNextTarget } from '../game/AutoBattle.js'
import { generateWaveEnemies, getWaveLabel, CHAPTERS } from '../data/chapters.js'
import { CARDS, RARITY } from '../data/cards.js'
import { SpriteManager } from '../game/SpriteManager.js'
import { T } from '../utils/theme.js'
import { drawSky, drawGround, drawHpBar, drawBtn, rrect } from '../utils/drawHelpers.js'

const CLOUDS = [
  { x: 40,  y: 55,  scale: 0.75, speed: 10 },
  { x: 210, y: 35,  scale: 0.95, speed: 7  },
  { x: 345, y: 70,  scale: 0.65, speed: 13 },
]

export class BattleScene {
  constructor(canvas, ctx, gameState, onVictory, onDefeat) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.gameState = gameState
    this.onVictory = onVictory
    this.onDefeat  = onDefeat

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this._loop   = this._loop.bind(this)

    // 雲朵副本（有 x 位置）
    this.clouds = CLOUDS.map(c => ({ ...c }))

    // 章節 / 波次
    this.chapterIdx = (gameState.chapterIdx ?? 0)
    this.waveIdx    = (gameState.waveIdx    ?? 0)

    // 生成敵人
    const rawEnemies = generateWaveEnemies(this.chapterIdx, this.waveIdx)
    const groundY    = canvas.height * 0.72
    const enemyBaseY = groundY - 10

    // 設定敵人 Y 位置
    rawEnemies.forEach(e => { e.y = enemyBaseY })

    // 建立戰鬥狀態
    this.bs = createBattleState(gameState.hero, rawEnemies)

    // 玩家位置
    this.playerX = 88
    this.playerY = groundY

    // 攻擊計時 (frame)
    // spd = 1.0 → 每 70 frame 攻擊一次，spd = 1.5 → 每 47 frame
    this.attackInterval = Math.round(70 / (gameState.hero?.spd || 1.0))
    this.attackTimer    = 0
    this.phase          = 'player_turn'  // player_turn | enemy_turn | end

    // 視覺浮動文字
    this.floats = []

    // 敵人/玩家震動
    this.shakeTarget = null
    this.shakeTimer  = 0

    // 結束延遲（戰鬥結束後等幾 frame 再切換）
    this.endTimer = 0

    // 卡牌提示顯示
    this.cardBanner = null   // { text, color, life }

    // 章節標題顯示
    this.bannerLife = 120    // 開場顯示章節名

    // 效果清單從 AutoBattle 回傳
    this.lastResult = null
  }

  start() {
    this.animId = requestAnimationFrame(this._loop)
  }

  stop() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
  }

  // ─── 主迴圈 ──────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t      += dt
    this.lastTs  = ts
    this._update(dt)
    this._draw()
    if (!this.done) {
      this.animId = requestAnimationFrame(this._loop)
    }
  }

  _update(dt) {
    const state = this.bs

    // 雲朵漂移
    const W = this.canvas.width
    for (const c of this.clouds) {
      c.x += c.speed * dt
      if (c.x > W + 120) c.x = -120
    }

    // 浮動文字
    this.floats = this.floats.filter(f => f.life > 0)
    for (const f of this.floats) {
      f.y   -= 1.5 * dt * 60
      f.life -= dt * 60
    }

    // 卡牌提示橫幅
    if (this.cardBanner) {
      this.cardBanner.life -= dt * 60
      if (this.cardBanner.life <= 0) this.cardBanner = null
    }

    // 震動
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 60

    // 章節開場倒計時
    if (this.bannerLife > 0) { this.bannerLife -= dt * 60; return }

    // 結束後等待
    if (this.phase === 'end') {
      this.endTimer -= dt * 60
      if (this.endTimer <= 0) {
        this.done = true
        if (state.result === 'victory') this.onVictory()
        else this.onDefeat()
      }
      return
    }

    // 攻擊計時
    this.attackTimer += dt * 60

    if (this.phase === 'player_turn' && this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0
      this._doPlayerTurn()
    } else if (this.phase === 'enemy_turn' && this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0
      this._doEnemyTurn()
    }
  }

  _doPlayerTurn() {
    const state = this.bs
    const result = playerAttack(state)
    if (!result) { this.phase = 'player_turn'; return }

    const { damage, isCrit, target, extraDamage } = result

    // 浮動傷害數字
    this._addFloat(target.x, target.y - target.size * 0.6,
      isCrit ? `暴擊！${damage}` : `-${damage}`,
      isCrit ? '#ffd700' : '#ff8888')

    if (extraDamage > 0) {
      this._addFloat(target.x + 20, target.y - target.size * 0.9, `+${extraDamage}`, '#ffcc44')
    }

    this.shakeTarget = 'enemy'
    this.shakeTimer  = 10

    // 顯示觸發的卡牌效果
    for (const eff of state.effects) {
      this._showCardBanner(eff.text, eff.color)
    }
    state.effects.length = 0

    if (target.hp <= 0) {
      this._addFloat(target.x, target.y - target.size * 1.0, '擊倒！', '#00e676')
    }

    const end = checkBattleEnd(state)
    if (end) { this._endBattle(); return }

    this.phase = 'enemy_turn'
  }

  _doEnemyTurn() {
    const state = this.bs
    const results = enemyAttack(state)
    if (!results) { this.phase = 'player_turn'; return }

    for (const { damage } of results) {
      this._addFloat(
        this.playerX + (Math.random() - 0.5) * 25,
        this.playerY - 70,
        `-${damage}`, '#ff5555')
    }

    this.shakeTarget = 'player'
    this.shakeTimer  = 10

    // 顯示觸發的 on_hit 卡牌效果
    for (const eff of state.effects) {
      this._showCardBanner(eff.text, eff.color)
    }
    state.effects.length = 0

    const end = checkBattleEnd(state)
    if (end) { this._endBattle(); return }

    this.phase = 'player_turn'
  }

  _endBattle() {
    this.phase    = 'end'
    this.endTimer = 90
    this.done     = false
    const msg = this.bs.result === 'victory' ? '勝利！' : '陣亡...'
    const col = this.bs.result === 'victory' ? '#ffd700' : '#ff5555'
    this._addFloat(this.canvas.width / 2, this.canvas.height * 0.45, msg, col, 80)
  }

  // ─── 繪圖 ────────────────────────────────────────────────
  _draw() {
    const ctx  = this.ctx
    const W    = this.canvas.width
    const H    = this.canvas.height
    const gY   = H * 0.72
    const state = this.bs

    // 天空 + 地面
    drawSky(ctx, W, H, this.clouds)
    drawGround(ctx, W, H, gY)

    // 開場章節標題
    if (this.bannerLife > 0) {
      this._drawOpenBanner(W, H)
      return
    }

    // 波次資訊板
    this._drawWavePanel(ctx, W, H)

    // 玩家 HP 條
    const pShakeX = this.shakeTarget === 'player' && this.shakeTimer > 0
      ? Math.sin(this.shakeTimer * 1.4) * 6 : 0
    drawHpBar(ctx, 10 + pShakeX, H - 58, 170, 22,
      state.player.hp, state.player.maxHp,
      state.player.nameZh || state.player.name, '#4fc3f7')

    // 玩家角色
    this._drawPlayer(ctx, this.playerX + pShakeX, this.playerY)

    // 敵人
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i]
      if (e.hp <= 0) continue

      const eShakeX = this.shakeTarget === 'enemy' && this.shakeTimer > 0
        ? Math.sin(this.shakeTimer * 1.4) * 6 : 0

      this._drawEnemy(ctx, e, e.x + eShakeX)
      drawHpBar(ctx,
        e.x + eShakeX - e.size * 0.65,
        e.y - e.size - 22,
        e.size * 1.3, 16,
        e.hp, e.maxHp,
        e.nameZh || e.name,
        e.isBoss ? '#ff6b6b' : T.slime)
    }

    // 牌組顯示（底部）
    this._drawDeckBar(ctx, W, H)

    // 卡牌橫幅提示
    if (this.cardBanner) {
      this._drawCardBanner(ctx, W, H)
    }

    // 浮動文字
    for (const f of this.floats) {
      const alpha = Math.min(1, f.life / 30)
      ctx.globalAlpha = alpha
      ctx.font        = `bold ${f.size || 18}px sans-serif`
      ctx.fillStyle   = f.color
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
    }
  }

  _drawOpenBanner(W, H) {
    const ctx    = this.ctx
    const alpha  = Math.min(1, this.bannerLife / 30) * Math.min(1, (120 - this.bannerLife) / 30 + 0.3)
    ctx.globalAlpha = alpha

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, H * 0.38, W, 100)

    const chapter = CHAPTERS[this.chapterIdx]
    ctx.fillStyle   = T.gold
    ctx.font        = 'bold 28px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText(`第 ${this.chapterIdx + 1} 章`, W / 2, H * 0.38 + 38)

    ctx.fillStyle = T.textWhite
    ctx.font      = '20px sans-serif'
    ctx.fillText(chapter ? chapter.nameZh : '', W / 2, H * 0.38 + 68)

    ctx.globalAlpha = 1
  }

  _drawWavePanel(ctx, W, H) {
    // 頂部波次資訊
    const label = getWaveLabel(this.chapterIdx, this.waveIdx)
    ctx.fillStyle = 'rgba(0,0,40,0.5)'
    rrect(ctx, W * 0.28, 8, W * 0.44, 32, 8); ctx.fill()
    ctx.fillStyle   = T.textWhite
    ctx.font        = 'bold 14px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText(label, W / 2, 29)
  }

  _drawPlayer(ctx, x, groundY) {
    const y     = groundY
    const cupW  = 48
    const cupH  = 58
    const cupBW = 36
    const topX  = x - cupW / 2
    const botX  = x - cupBW / 2
    const topY  = y - cupH
    const botY  = y

    // 影子（sprite 或 fallback 都畫）
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath(); ctx.ellipse(x, y + 10, 26, 7, 0, 0, Math.PI * 2); ctx.fill()

    // 嘗試 sprite，失敗則用 canvas 繪圖
    const heroKey = `hero_${this.gameState.hero?.id || 'knight'}`
    SpriteManager.drawSprite(ctx, heroKey, x, y, 80, 100, () => {

    // 杯身
    const hero  = this.gameState.hero
    const c1    = hero?.color      || T.heroBlue
    const c2    = hero?.colorDark  || T.heroBlueShadow
    const g     = ctx.createLinearGradient(topX, topY, topX + cupW, topY)
    g.addColorStop(0, c1); g.addColorStop(0.5, c1 + 'cc'); g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
    ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
    ctx.closePath(); ctx.fill()

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.moveTo(topX + 5, topY + 4); ctx.lineTo(topX + cupW * 0.45, topY + 4)
    ctx.lineTo(botX + cupBW * 0.42, botY - 8); ctx.lineTo(botX + 5, botY - 8)
    ctx.closePath(); ctx.fill()

    // 杯口
    const rimG = ctx.createLinearGradient(topX, topY, topX, topY + 10)
    rimG.addColorStop(0, '#a0d8ff'); rimG.addColorStop(1, c2)
    ctx.fillStyle = rimG
    ctx.fillRect(topX - 3, topY - 5, cupW + 6, 12)

    // 臉
    const eyeY = topY + cupH * 0.38
    for (const ex of [x - 9, x + 9]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(ex, eyeY, 6, 6, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1a3a7a'
      ctx.beginPath(); ctx.ellipse(ex + 1, eyeY + 1, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ex + 2, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.strokeStyle = '#1a3a7a'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(x, eyeY + 13, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()

    // 劍
    ctx.save()
    ctx.translate(x + 32, y - 36)
    ctx.rotate(-0.4)
    ctx.fillStyle = '#d0e8f8'; ctx.fillRect(-2.5, -26, 5, 32)
    ctx.strokeStyle = '#7799aa'; ctx.lineWidth = 1; ctx.strokeRect(-2.5, -26, 5, 32)
    ctx.fillStyle = T.gold; ctx.fillRect(-8, 0, 16, 5)
    ctx.fillStyle = T.woodMid; ctx.fillRect(-2, 5, 4, 12)
    ctx.restore()

    // 輪廓
    ctx.strokeStyle = c2; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
    ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
    ctx.closePath(); ctx.stroke()
    }) // end SpriteManager.drawSprite fallback
  }

  _drawEnemy(ctx, enemy, x) {
    const size  = enemy.size || 48
    const y     = enemy.y || (this.canvas.height * 0.72)

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath(); ctx.ellipse(x, y + 8, size * 0.55, size * 0.15, 0, 0, Math.PI * 2); ctx.fill()

    if (enemy.isBoss) {
      this._drawBossEnemy(ctx, enemy, x, y, size)
    } else {
      this._drawNormalEnemy(ctx, enemy, x, y, size)
    }
  }

  _drawNormalEnemy(ctx, enemy, x, y, size) {
    const enemyKey = `enemy_${enemy.type || 'slime'}`
    SpriteManager.drawSprite(ctx, enemyKey, x, y, size * 1.2, size * 1.2, () => {
      const rg = ctx.createRadialGradient(x - size * 0.2, y - size * 0.6, size * 0.1, x, y - size * 0.5, size * 0.8)
      rg.addColorStop(0, _lighten(enemy.color || '#888', 40))
      rg.addColorStop(0.7, enemy.color || '#888')
      rg.addColorStop(1, _darken(enemy.color || '#888', 30))
      ctx.fillStyle = rg
      ctx.beginPath(); ctx.arc(x, y - size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.fill()

      ctx.strokeStyle = _darken(enemy.color || '#888', 40); ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y - size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.stroke()

      // 眼睛
      const ey = y - size * 0.6
      for (const ex of [x - size * 0.22, x + size * 0.22]) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.12, size * 0.12, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#200'
        ctx.beginPath(); ctx.ellipse(ex + 1, ey + 1, size * 0.07, size * 0.07, 0, 0, Math.PI * 2); ctx.fill()
      }

      // emoji 標籤
      ctx.font = `${size * 0.5}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👾', x, y - size * 0.3)
    })
  }

  _drawBossEnemy(ctx, enemy, x, y, size) {
    const bw = size * 1.1
    const bh = size * 1.3
    const enemyKey = `enemy_${enemy.type || 'slime'}`
    SpriteManager.drawSprite(ctx, enemyKey, x, y, bw * 1.4, (bh + 30) * 1.2, () => {
      // Boss 身體（杯狀）
      const rg = ctx.createRadialGradient(x, y - bh * 0.5, bh * 0.05, x, y - bh * 0.5, bh * 0.8)
      rg.addColorStop(0, _lighten(enemy.color || '#c00', 40))
      rg.addColorStop(1, _darken(enemy.color || '#c00', 20))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.moveTo(x - bw / 2, y - bh)
      ctx.lineTo(x + bw / 2, y - bh)
      ctx.lineTo(x + bw * 0.35, y)
      ctx.lineTo(x - bw * 0.35, y)
      ctx.closePath(); ctx.fill()

      // 皇冠
      const crownY = y - bh - 14
      ctx.fillStyle = T.gold
      ctx.beginPath()
      ctx.moveTo(x - bw * 0.4, crownY + 16)
      ctx.lineTo(x - bw * 0.45, crownY)
      ctx.lineTo(x - bw * 0.15, crownY + 10)
      ctx.lineTo(x, crownY - 6)
      ctx.lineTo(x + bw * 0.15, crownY + 10)
      ctx.lineTo(x + bw * 0.45, crownY)
      ctx.lineTo(x + bw * 0.4, crownY + 16)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = T.goldDark; ctx.lineWidth = 1.5; ctx.stroke()

      // 眼睛（憤怒）
      const ey = y - bh * 0.58
      for (const ex of [x - bw * 0.2, x + bw * 0.2]) {
        ctx.fillStyle = '#ff0'
        ctx.beginPath(); ctx.ellipse(ex, ey, bw * 0.1, bw * 0.1, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#600'
        ctx.beginPath(); ctx.ellipse(ex, ey + 1, bw * 0.06, bw * 0.06, 0, 0, Math.PI * 2); ctx.fill()
      }

      // emoji
      ctx.font = `${size * 0.4}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👑', x, y - bh * 0.25)
    })
  }

  _drawDeckBar(ctx, W, H) {
    const deck   = this.bs.player.deck || []
    if (deck.length === 0) return

    const barH   = 52
    const barY   = H - barH - 2
    ctx.fillStyle = 'rgba(0,10,40,0.72)'
    rrect(ctx, 0, barY, W, barH + 4, 0); ctx.fill()

    const cardW = 46
    const gap   = 6
    const total = deck.length * (cardW + gap) - gap
    let cx      = (W - total) / 2

    ctx.textAlign = 'center'

    for (const cardId of deck) {
      const card = CARDS[cardId]
      if (!card) { cx += cardW + gap; continue }
      const rCol = RARITY[card.rarity]?.color || '#aaa'

      // 卡片背景
      ctx.fillStyle = `${rCol}33`
      rrect(ctx, cx, barY + 4, cardW, barH - 8, 6); ctx.fill()
      ctx.strokeStyle = rCol; ctx.lineWidth = 1.5
      rrect(ctx, cx, barY + 4, cardW, barH - 8, 6); ctx.stroke()

      // icon
      ctx.font = '18px serif'
      ctx.fillText(card.icon || '?', cx + cardW / 2, barY + 24)

      // 名稱
      ctx.font      = '9px sans-serif'
      ctx.fillStyle = rCol
      const shortName = card.nameZh || card.name
      ctx.fillText(shortName.slice(0, 4), cx + cardW / 2, barY + 38)

      cx += cardW + gap
    }
  }

  _drawCardBanner(ctx, W, H) {
    const banner = this.cardBanner
    const alpha  = Math.min(1, banner.life / 20)
    ctx.globalAlpha = alpha

    ctx.fillStyle = `${banner.color}33`
    rrect(ctx, W * 0.1, H * 0.44, W * 0.8, 34, 8); ctx.fill()
    ctx.strokeStyle = banner.color; ctx.lineWidth = 1.5
    rrect(ctx, W * 0.1, H * 0.44, W * 0.8, 34, 8); ctx.stroke()

    ctx.fillStyle   = banner.color
    ctx.font        = 'bold 14px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText(banner.text, W / 2, H * 0.44 + 22)

    ctx.globalAlpha = 1
  }

  // ─── 輔助 ────────────────────────────────────────────────
  _addFloat(x, y, text, color, size = 18) {
    this.floats.push({ x, y, text, color, life: 60, size })
  }

  _showCardBanner(text, color) {
    this.cardBanner = { text, color, life: 70 }
  }
}

function _lighten(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + amt)
  const g = Math.min(255, ((n >> 8)  & 0xff) + amt)
  const b = Math.min(255, ((n)       & 0xff) + amt)
  return `rgb(${r},${g},${b})`
}

function _darken(hex, amt) {
  return _lighten(hex, -amt)
}
