// BattleScene.js — 自動戰鬥場景（橫版側視圖）
import { createBattleState, playerAttack, enemyAttack, checkBattleEnd } from '../game/AutoBattle.js'
import { generateWaveEnemies, getWaveLabel, CHAPTERS } from '../data/chapters.js'
import { getCardById } from '../data/cards.js'
import { SpriteManager } from '../game/SpriteManager.js'
import { T } from '../utils/theme.js'
import { drawHpBar, rrect } from '../utils/drawHelpers.js'

// ── 佈局常數 ─────────────────────────────────────────────
const TOP_H        = 58    // 頂部UI高度
const DECK_H       = 58    // 底部牌組高度
const GROUND_RATIO = 0.60  // 地面佔戰場高度比例

// ── 敵人橫版 X 位置（0~1 比例）──────────────────────────
const ENEMY_FX = [
  [],
  [0.68],
  [0.58, 0.78],
  [0.55, 0.68, 0.82],
  [0.52, 0.63, 0.74, 0.85],
  [0.50, 0.59, 0.68, 0.78, 0.87],
]

export class BattleScene {
  constructor(canvas, ctx, gameState, onVictory, onDefeat) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.gameState = gameState
    this.onVictory = onVictory
    this.onDefeat  = onDefeat

    this.animId = null
    this.t      = 0
    this.lastTs = 0
    this._loop  = this._loop.bind(this)
    this.paused = false
    this.done   = false

    this.chapterIdx = gameState.chapterIdx ?? 0
    this.waveIdx    = gameState.waveIdx    ?? 0

    const W = canvas.width
    const H = canvas.height
    this.W = W
    this.H = H

    const battleH  = H - TOP_H - DECK_H
    this.groundY   = TOP_H + battleH * GROUND_RATIO

    // 生成敵人，指定橫版位置
    const rawEnemies = generateWaveEnemies(this.chapterIdx, this.waveIdx)
    const posCount   = Math.min(rawEnemies.length, ENEMY_FX.length - 1)
    const xSet       = ENEMY_FX[posCount]
    rawEnemies.forEach((e, i) => {
      e.x    = W * (xSet[i] ?? (0.55 + (i % 4) * 0.10))
      e.y    = this.groundY
      e.size = e.size || 48
    })

    // 傳入裝備屬性 + 套裝技能（如果 gameState 有的話）
    this.bs = createBattleState(
      gameState.hero,
      rawEnemies,
      gameState.cardStars    || {},
      gameState.equipStats   || {},
      gameState.activeBonuses || []
    )

    // 記錄玩家螢幕座標，供套裝技能特效使用
    this.playerX = W * 0.18
    this.playerY = this.groundY
    this.bs.player._posX = this.playerX
    this.bs.player._posY = this.playerY

    // 攻速 = 英雄基礎速度 + 裝備鞋子速度加成
    const heroSpd = (gameState.hero?.spd || 1.0) + ((gameState.equipStats?.spd) || 0)
    this.attackInterval = Math.round(70 / heroSpd)
    this.attackTimer    = 0
    this.phase          = 'player_turn'

    this.floats     = []
    this.shakeTarget = null
    this.shakeTimer  = 0
    this.endTimer    = 0
    this.cardBanner  = null
    this.bannerLife  = 120

    this.clouds = _makeclouds(W, H)

    // 暫停按鈕區域
    this.pauseBtn = { x: W - 52, y: 11, w: 42, h: 34 }

    this._onClick = this._onClick.bind(this)
    canvas.addEventListener('click', this._onClick)
  }

  start() { this.animId = requestAnimationFrame(this._loop) }

  stop() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
    this.canvas.removeEventListener('click', this._onClick)
  }

  destroy() { this.canvas.removeEventListener('click', this._onClick) }

  _onClick(e) {
    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top)  * scaleY
    const b = this.pauseBtn
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.paused = !this.paused
    }
  }

  // ─── 主迴圈 ──────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs = ts
    if (!this.paused) { this.t += dt; this._update(dt) }
    this._draw()
    if (!this.done) this.animId = requestAnimationFrame(this._loop)
  }

  _update(dt) {
    const state = this.bs

    // 雲朵漂移
    for (const c of this.clouds) {
      c.x -= c.spd * dt
      if (c.x + c.w < 0) c.x = this.W + c.w
    }

    // 浮動文字
    this.floats = this.floats.filter(f => f.life > 0)
    for (const f of this.floats) { f.y -= 1.5 * dt * 60; f.life -= dt * 60 }

    // 卡牌橫幅
    if (this.cardBanner) {
      this.cardBanner.life -= dt * 60
      if (this.cardBanner.life <= 0) this.cardBanner = null
    }

    // 震動
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 60

    // 開場倒計時
    if (this.bannerLife > 0) { this.bannerLife -= dt * 60; return }

    // 戰鬥結束
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
      this.attackTimer = 0; this._doPlayerTurn()
    } else if (this.phase === 'enemy_turn' && this.attackTimer >= this.attackInterval) {
      this.attackTimer = 0; this._doEnemyTurn()
    }
  }

  _doPlayerTurn() {
    const state  = this.bs
    const result = playerAttack(state)
    if (!result) { this.phase = 'player_turn'; return }

    const { damage, isCrit, target } = result
    this._addFloat(target.x, target.y - target.size - 10,
      isCrit ? '暴擊！' + damage : '-' + damage,
      isCrit ? '#ffd700' : '#ff8888',
      isCrit ? 22 : 18)

    this.shakeTarget = 'enemy'; this.shakeTimer = 10
    for (const eff of state.effects) this._showCardBanner(eff.text, eff.color)
    state.effects.length = 0

    if (target.hp <= 0) this._addFloat(target.x, target.y - target.size - 30, '擊倒！', '#00e676', 20)
    const end = checkBattleEnd(state)
    if (end) { this._endBattle(); return }
    this.phase = 'enemy_turn'
  }

  _doEnemyTurn() {
    const state   = this.bs
    const results = enemyAttack(state)
    if (!results) { this.phase = 'player_turn'; return }

    for (const { damage } of results) {
      this._addFloat(
        this.playerX + (Math.random() - 0.5) * 20,
        this.playerY - 70,
        '-' + damage, '#ff5555', 18)
    }

    this.shakeTarget = 'player'; this.shakeTimer = 10
    for (const eff of state.effects) this._showCardBanner(eff.text, eff.color)
    state.effects.length = 0

    const end = checkBattleEnd(state)
    if (end) { this._endBattle(); return }
    this.phase = 'player_turn'
  }

  _endBattle() {
    this.phase = 'end'; this.endTimer = 90; this.done = false
    const msg = this.bs.result === 'victory' ? '勝利！' : '陣亡...'
    const col = this.bs.result === 'victory' ? '#ffd700' : '#ff5555'
    this._addFloat(this.W / 2, this.H * 0.45, msg, col, 80)
  }

  // ─── 繪圖主函式 ──────────────────────────────────────────
  _draw() {
    const ctx = this.ctx
    const W   = this.W
    const H   = this.H

    // 清底
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)

    this._drawBg(ctx, W, H)
    this._drawGround(ctx, W, H)

    if (this.bannerLife > 0) {
      this._drawOpenBanner(ctx, W, H)
      return
    }

    this._drawTopBar(ctx, W, H)
    this._drawDeckBar(ctx, W, H)

    // 震動偏移
    const pSX = (this.shakeTarget === 'player' && this.shakeTimer > 0)
      ? Math.sin(this.shakeTimer * 1.4) * 5 : 0
    const eSX = (this.shakeTarget === 'enemy' && this.shakeTimer > 0)
      ? Math.sin(this.shakeTimer * 1.4) * 5 : 0

    // 玩家角色
    this._drawPlayerChar(ctx, this.playerX + pSX, this.playerY)

    // 敵人
    const state = this.bs
    for (const e of state.enemies) {
      if (e.hp <= 0) continue
      this._drawEnemyChar(ctx, e, e.x + eSX, e.y)
      drawHpBar(ctx,
        e.x + eSX - e.size * 0.7,
        e.y - e.size - 24,
        e.size * 1.4, 14,
        e.hp, e.maxHp,
        e.nameZh || e.name,
        e.isBoss ? '#ff6b6b' : T.slime)
    }

    // 卡牌橫幅
    if (this.cardBanner) this._drawCardBanner(ctx, W, H)

    // 浮動文字
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 30)
      ctx.font        = 'bold ' + (f.size || 18) + 'px sans-serif'
      ctx.fillStyle   = f.color
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'; ctx.shadowBlur = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    }

    // 暫停面板
    if (this.paused) this._drawPauseOverlay(ctx, W, H)
  }

  // ─── 天空背景 ────────────────────────────────────────────
  _drawBg(ctx, W, H) {
    const gY = this.groundY

    // 天空漸層
    const sky = ctx.createLinearGradient(0, TOP_H, 0, gY)
    sky.addColorStop(0, '#5ab4f0')
    sky.addColorStop(1, '#aadcf8')
    ctx.fillStyle = sky
    ctx.fillRect(0, TOP_H, W, gY - TOP_H)

    // 遠山輪廓
    ctx.fillStyle = 'rgba(90,170,60,0.38)'
    ctx.beginPath(); ctx.moveTo(0, gY)
    const steps = 8
    for (let i = 0; i <= steps; i++) {
      const mx = (W / steps) * i
      const bump = 28 + Math.sin(mx * 0.013 + 1.4) * 22
      ctx.lineTo(mx, gY - bump)
    }
    ctx.lineTo(W, gY); ctx.closePath(); ctx.fill()

    // 雲朵
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    for (const c of this.clouds) {
      ctx.beginPath()
      ctx.ellipse(c.x,              c.y,              c.w * 0.55, c.h * 0.55, 0, 0, Math.PI * 2)
      ctx.ellipse(c.x + c.w * 0.30, c.y - c.h * 0.2, c.w * 0.42, c.h * 0.42, 0, 0, Math.PI * 2)
      ctx.ellipse(c.x - c.w * 0.28, c.y - c.h * 0.1, c.w * 0.35, c.h * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ─── 地面 ────────────────────────────────────────────────
  _drawGround(ctx, W, H) {
    const gY = this.groundY

    // 草地帶
    const grass = ctx.createLinearGradient(0, gY, 0, gY + 22)
    grass.addColorStop(0, '#6abf40')
    grass.addColorStop(1, '#4e9a2e')
    ctx.fillStyle = grass
    ctx.fillRect(0, gY, W, 22)

    // 泥土
    const dirt = ctx.createLinearGradient(0, gY + 22, 0, H - DECK_H)
    dirt.addColorStop(0, '#8b5a2b')
    dirt.addColorStop(1, '#5c3317')
    ctx.fillStyle = dirt
    ctx.fillRect(0, gY + 22, W, H - DECK_H - gY - 22)

    // 泥土紋理
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1
    for (let y = gY + 38; y < H - DECK_H; y += 18) {
      ctx.beginPath()
      ctx.moveTo(0, y + Math.sin(y * 0.31) * 2)
      ctx.lineTo(W, y + Math.sin(y * 0.31 + 1) * 2)
      ctx.stroke()
    }
  }

  // ─── 頂部 UI 列 ──────────────────────────────────────────
  _drawTopBar(ctx, W, H) {
    const state = this.bs

    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    ctx.fillRect(0, 0, W, TOP_H)

    // 玩家 HP 條（左）
    drawHpBar(ctx, 8, 12, W * 0.46, 22,
      state.player.hp, state.player.maxHp,
      state.player.nameZh || state.player.name, '#4fc3f7')

    // 波次標籤（中）
    const label = getWaveLabel(this.chapterIdx, this.waveIdx)
    ctx.fillStyle = 'rgba(0,0,40,0.65)'
    rrect(ctx, W * 0.44, 10, W * 0.30, 26, 8); ctx.fill()
    ctx.fillStyle = T.textWhite
    ctx.font = 'bold 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, W * 0.59, 28)

    // 暫停按鈕（右）
    const btn = this.pauseBtn
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    rrect(ctx, btn.x, btn.y, btn.w, btn.h, 8); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5
    rrect(ctx, btn.x, btn.y, btn.w, btn.h, 8); ctx.stroke()

    // 暫停/繼續圖示
    const bx = btn.x + btn.w / 2
    const by = btn.y + btn.h / 2
    ctx.fillStyle = '#fff'
    if (this.paused) {
      // ▶ 繼續圖示
      ctx.beginPath()
      ctx.moveTo(bx - 6, by - 9)
      ctx.lineTo(bx + 9, by)
      ctx.lineTo(bx - 6, by + 9)
      ctx.closePath(); ctx.fill()
    } else {
      // ⏸ 暫停圖示
      ctx.fillRect(bx - 8, by - 8, 5, 16)
      ctx.fillRect(bx + 3, by - 8, 5, 16)
    }
  }

  // ─── 玩家角色 ────────────────────────────────────────────
  _drawPlayerChar(ctx, x, groundY) {
    const hero    = this.gameState.hero
    const heroKey = 'hero_' + (hero?.id || 'knight')
    const size    = 72

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath(); ctx.ellipse(x, groundY + 6, 22, 6, 0, 0, Math.PI * 2); ctx.fill()

    SpriteManager.drawSprite(ctx, heroKey, x, groundY, size, size * 1.3, () => {
      const c1 = hero?.color     || T.heroBlue
      const c2 = hero?.colorDark || T.heroBlueShadow

      const cupW = 44, cupH = 54, cupBW = 32
      const topX = x - cupW / 2
      const topY = groundY - cupH

      const g = ctx.createLinearGradient(topX, topY, topX + cupW, topY)
      g.addColorStop(0, c1); g.addColorStop(0.5, c1 + 'cc'); g.addColorStop(1, c2)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(topX, topY)
      ctx.lineTo(topX + cupW, topY)
      ctx.lineTo(x + cupBW / 2, groundY)
      ctx.lineTo(x - cupBW / 2, groundY)
      ctx.closePath(); ctx.fill()

      ctx.strokeStyle = c2; ctx.lineWidth = 1.5; ctx.stroke()

      // 眼睛
      for (const ex of [x - 9, x + 9]) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(ex, topY + 18, 6, 7, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#222'
        ctx.beginPath(); ctx.ellipse(ex + 1, topY + 19, 3.5, 4, 0, 0, Math.PI * 2); ctx.fill()
      }

      // 武器圖示
      ctx.font = '18px serif'
      ctx.textAlign = 'center'
      ctx.fillText(hero?.weaponEmoji || '⚔️', x + cupW * 0.42, topY + 35)
    })
  }

  // ─── 敵人角色 ────────────────────────────────────────────
  _drawEnemyChar(ctx, enemy, x, groundY) {
    const size = enemy.size || 48
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath(); ctx.ellipse(x, groundY + 6, size * 0.45, 7, 0, 0, Math.PI * 2); ctx.fill()
    if (enemy.isBoss) this._drawBoss(ctx, enemy, x, groundY, size)
    else              this._drawEnemy(ctx, enemy, x, groundY, size)
    ctx.restore()
  }

  _drawEnemy(ctx, enemy, x, groundY, size) {
    const enemyKey = 'enemy_' + (enemy.type || 'slime')
    SpriteManager.drawSprite(ctx, enemyKey, x, groundY, size * 1.2, size * 1.2, () => {
      const rg = ctx.createRadialGradient(
        x - size * 0.2, groundY - size * 0.6, size * 0.1,
        x,              groundY - size * 0.5, size * 0.8)
      rg.addColorStop(0,   _lighten(enemy.color || '#888', 40))
      rg.addColorStop(0.7, enemy.color || '#888')
      rg.addColorStop(1,   _darken(enemy.color  || '#888', 30))
      ctx.fillStyle = rg
      ctx.beginPath(); ctx.arc(x, groundY - size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = _darken(enemy.color || '#888', 40); ctx.lineWidth = 2; ctx.stroke()

      const ey = groundY - size * 0.6
      for (const ex of [x - size * 0.22, x + size * 0.22]) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.12, size * 0.12, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#200'
        ctx.beginPath(); ctx.ellipse(ex + 1, ey + 1, size * 0.07, size * 0.07, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.font = (size * 0.48) + 'px serif'; ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👾', x, groundY - size * 0.28)
    })
  }

  _drawBoss(ctx, enemy, x, groundY, size) {
    const bw = size * 1.1, bh = size * 1.3
    const enemyKey = 'enemy_' + (enemy.type || 'slime')
    SpriteManager.drawSprite(ctx, enemyKey, x, groundY, bw * 1.4, (bh + 30) * 1.2, () => {
      const rg = ctx.createRadialGradient(x, groundY - bh * 0.5, bh * 0.05, x, groundY - bh * 0.5, bh * 0.8)
      rg.addColorStop(0, _lighten(enemy.color || '#c00', 40))
      rg.addColorStop(1, _darken(enemy.color  || '#c00', 20))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.moveTo(x - bw / 2, groundY - bh); ctx.lineTo(x + bw / 2, groundY - bh)
      ctx.lineTo(x + bw * 0.35, groundY);   ctx.lineTo(x - bw * 0.35, groundY)
      ctx.closePath(); ctx.fill()

      const crownY = groundY - bh - 14
      ctx.fillStyle = T.gold
      ctx.beginPath()
      ctx.moveTo(x - bw * 0.4,  crownY + 16)
      ctx.lineTo(x - bw * 0.45, crownY)
      ctx.lineTo(x - bw * 0.15, crownY + 10)
      ctx.lineTo(x,              crownY - 6)
      ctx.lineTo(x + bw * 0.15, crownY + 10)
      ctx.lineTo(x + bw * 0.45, crownY)
      ctx.lineTo(x + bw * 0.4,  crownY + 16)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = T.goldDark; ctx.lineWidth = 1.5; ctx.stroke()

      ctx.font = (size * 0.4) + 'px serif'; ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👑', x, groundY - bh * 0.25)
    })
  }

  // ─── 底部牌組欄 ──────────────────────────────────────────
  _drawDeckBar(ctx, W, H) {
    const deck = this.bs.player.deck || []
    if (deck.length === 0) return

    const barY = H - DECK_H
    ctx.fillStyle = 'rgba(0,10,40,0.82)'
    ctx.fillRect(0, barY, W, DECK_H)
    ctx.strokeStyle = 'rgba(74,168,255,0.3)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(W, barY); ctx.stroke()

    const cardW = 46, gap = 6
    const total = deck.length * (cardW + gap) - gap
    let cx = (W - total) / 2

    ctx.textAlign = 'center'
    for (const cardId of deck) {
      const card = getCardById(cardId)
      if (!card) { cx += cardW + gap; continue }
      const rCol = card.group === 'hero' ? '#d4a017' : '#4a90d9'

      ctx.fillStyle = rCol + '33'
      rrect(ctx, cx, barY + 6, cardW, DECK_H - 12, 6); ctx.fill()
      ctx.strokeStyle = rCol; ctx.lineWidth = 1.5
      rrect(ctx, cx, barY + 6, cardW, DECK_H - 12, 6); ctx.stroke()

      ctx.font = '18px serif'
      ctx.fillText(card.icon || '?', cx + cardW / 2, barY + 26)
      ctx.font = '9px sans-serif'; ctx.fillStyle = rCol
      ctx.fillText((card.nameZh || card.name).slice(0, 4), cx + cardW / 2, barY + 41)

      cx += cardW + gap
    }
  }

  // ─── 開場橫幅 ────────────────────────────────────────────
  _drawOpenBanner(ctx, W, H) {
    const alpha = Math.min(1, this.bannerLife / 30) * Math.min(1, (120 - this.bannerLife) / 30 + 0.3)
    ctx.globalAlpha = alpha

    ctx.fillStyle = 'rgba(0,0,0,0.60)'
    ctx.fillRect(0, H * 0.38, W, 100)

    const chapter = CHAPTERS[this.chapterIdx]
    ctx.fillStyle = T.gold; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('第 ' + (this.chapterIdx + 1) + ' 章', W / 2, H * 0.38 + 38)
    ctx.fillStyle = T.textWhite; ctx.font = '20px sans-serif'
    ctx.fillText(chapter ? chapter.nameZh : '', W / 2, H * 0.38 + 68)

    ctx.globalAlpha = 1
  }

  // ─── 卡牌觸發橫幅 ────────────────────────────────────────
  _drawCardBanner(ctx, W, H) {
    const banner = this.cardBanner
    const alpha  = Math.min(1, banner.life / 20)
    ctx.globalAlpha = alpha
    ctx.fillStyle = banner.color + '33'
    rrect(ctx, W * 0.1, H * 0.42, W * 0.8, 34, 8); ctx.fill()
    ctx.strokeStyle = banner.color; ctx.lineWidth = 1.5
    rrect(ctx, W * 0.1, H * 0.42, W * 0.8, 34, 8); ctx.stroke()
    ctx.fillStyle = banner.color; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(banner.text, W / 2, H * 0.42 + 22)
    ctx.globalAlpha = 1
  }

  // ─── 暫停覆蓋面板 ────────────────────────────────────────
  _drawPauseOverlay(ctx, W, H) {
    const state = this.bs
    const hero  = this.gameState.hero
    const cards = this.gameState.cardStars || {}

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.68)'
    ctx.fillRect(0, 0, W, H)

    // 面板
    const panW = W * 0.90
    const panX = (W - panW) / 2
    const panY = H * 0.07
    const panH = H * 0.84
    ctx.fillStyle = '#111e35'
    rrect(ctx, panX, panY, panW, panH, 16); ctx.fill()
    ctx.strokeStyle = T.panelBorder; ctx.lineWidth = 2
    rrect(ctx, panX, panY, panW, panH, 16); ctx.stroke()

    // 標題
    ctx.fillStyle = T.gold; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('⏸  暫停', W / 2, panY + 34)
    ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(panX + 16, panY + 46); ctx.lineTo(panX + panW - 16, panY + 46); ctx.stroke()

    // ── 英雄數值 ──
    const L = panX + 16
    const R = panX + panW - 16

    const baseAtk  = hero?.atk      || 0
    const baseDef  = hero?.def      || 0
    const baseCrit = hero?.crit     || 0.15
    const baseCMul = hero?.critMult || 2.0

    const curAtk  = state.player.atk      || baseAtk
    const curDef  = state.player.def      || baseDef
    const curCrit = state.player.crit     || baseCrit
    const curCMul = state.player.critMult || baseCMul

    const rows = [
      { icon: '❤️', label: '生命值',  base: null,     cur: state.player.hp,  str: state.player.hp + ' / ' + state.player.maxHp },
      { icon: '⚔️', label: '攻擊力',  base: baseAtk,  cur: curAtk  },
      { icon: '🛡️', label: '防禦力',  base: baseDef,  cur: curDef  },
      { icon: '🎯', label: '爆擊率',  base: baseCrit, cur: curCrit, pct: true },
      { icon: '💥', label: '爆擊倍率',base: baseCMul, cur: curCMul, mult: true },
    ]

    let ry = panY + 54
    const rowH = 36

    // 欄標
    ctx.fillStyle = T.textGray; ctx.font = '10px sans-serif'
    ctx.textAlign = 'left';  ctx.fillText('基礎值', L + panW * 0.44, ry - 2)
    ctx.textAlign = 'right'; ctx.fillText('目前值（含卡片加成）', R, ry - 2)

    for (const row of rows) {
      // 行底
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      rrect(ctx, L - 2, ry, panW - 28, rowH - 3, 6); ctx.fill()

      // 標籤
      ctx.fillStyle = T.textLight; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(row.icon + '  ' + row.label, L + 6, ry + 22)

      // 基礎值
      if (row.base !== null) {
        let bStr = row.pct  ? Math.round(row.base * 100) + '%'
                 : row.mult ? row.base.toFixed(1) + 'x'
                 : String(row.base)
        ctx.fillStyle = T.textGray; ctx.font = '12px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(bStr, L + panW * 0.44, ry + 22)
      }

      // 目前值
      let cStr = row.str  ? row.str
               : row.pct  ? Math.round(row.cur * 100) + '%'
               : row.mult ? row.cur.toFixed(1) + 'x'
               : String(row.cur)
      const boosted = row.base !== null && row.cur > row.base
      ctx.fillStyle = boosted ? '#5eff9e' : '#ffffff'
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(cStr, R, ry + 22)

      ry += rowH
    }

    // 分隔線
    ry += 6
    ctx.strokeStyle = 'rgba(74,168,255,0.25)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(L, ry); ctx.lineTo(R, ry); ctx.stroke()
    ry += 14

    // ── 本次取得的卡片 ──
    ctx.fillStyle = T.gold; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'
    ctx.fillText('📦  本次取得的卡片', L, ry)
    ry += 20

    const cardIds = Object.keys(cards)
    if (cardIds.length === 0) {
      ctx.fillStyle = T.textGray; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'
      ctx.fillText('尚未取得卡片', L + 4, ry + 14)
    } else {
      const perRow = 3
      const cw = (panW - 32) / perRow - 4

      for (let ci = 0; ci < cardIds.length; ci++) {
        const card  = getCardById(cardIds[ci])
        const stars = cards[cardIds[ci]] || 1
        if (!card) continue

        const col2 = Math.floor(ci % perRow)
        const row2 = Math.floor(ci / perRow)
        const cx2  = L + col2 * (cw + 4)
        const cy2  = ry + row2 * 48

        const rCol = card.group === 'hero' ? '#d4a017' : '#4a90d9'
        ctx.fillStyle = rCol + '22'
        rrect(ctx, cx2, cy2, cw, 42, 6); ctx.fill()
        ctx.strokeStyle = rCol + '88'; ctx.lineWidth = 1
        rrect(ctx, cx2, cy2, cw, 42, 6); ctx.stroke()

        ctx.font = '17px serif'; ctx.textAlign = 'center'
        ctx.fillText(card.icon || '?', cx2 + cw / 2, cy2 + 18)
        ctx.font = '9px sans-serif'; ctx.fillStyle = rCol
        ctx.fillText((card.nameZh || card.name).slice(0, 5), cx2 + cw / 2, cy2 + 30)
        ctx.fillStyle = T.gold; ctx.font = 'bold 9px sans-serif'
        ctx.fillText('★'.repeat(stars), cx2 + cw / 2, cy2 + 40)
      }
    }

    // 底部提示
    ctx.fillStyle = 'rgba(255,255,255,0.30)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('再次點擊 ⏸ 繼續遊戲', W / 2, panY + panH - 12)
  }

  // ─── 輔助函式 ────────────────────────────────────────────
  _addFloat(x, y, text, color, size) {
    this.floats.push({ x, y, text, color, life: 60, size: size || 18 })
  }

  _showCardBanner(text, color) {
    this.cardBanner = { text, color, life: 70 }
  }
}

// ── 模組輔助 ─────────────────────────────────────────────
function _makeclouds(W, H) {
  return Array.from({ length: 4 }, () => ({
    x:   Math.random() * W,
    y:   TOP_H + 16 + Math.random() * (H * 0.16),
    w:   60 + Math.random() * 50,
    h:   22 + Math.random() * 14,
    spd: 8  + Math.random() * 10,
  }))
}

function _lighten(hex, amt) {
  const n = parseInt((hex || '#888888').replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8)  & 0xff) + amt))
  const b = Math.min(255, Math.max(0, ((n)       & 0xff) + amt))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function _darken(hex, amt) {
  return _lighten(hex, -amt)
}
