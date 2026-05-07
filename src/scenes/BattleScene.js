// BattleScene.js — 自動戰鬥場景（等角視角版）
import { createBattleState, playerAttack, enemyAttack, checkBattleEnd } from '../game/AutoBattle.js'
import { generateWaveEnemies, getWaveLabel, CHAPTERS } from '../data/chapters.js'
import { getCardById } from '../data/cards.js'
import { SpriteManager } from '../game/SpriteManager.js'
import { T } from '../utils/theme.js'
import { drawHpBar, rrect } from '../utils/drawHelpers.js'

// ── 等角場地比例常數 ─────────────────────────────────────
const FIELD = {
  farY:  0.24,
  nearY: 0.78,
  farL:  0.28,
  farR:  0.72,
  nearL: 0.04,
  nearR: 0.96,
}

// ── 敵人散佈位置（fx=左右, fy=遠近 0=遠 1=近）──────────
const ENEMY_POSITIONS = [
  [],
  [{ fx: 0.62, fy: 0.46 }],
  [{ fx: 0.54, fy: 0.32 }, { fx: 0.78, fy: 0.58 }],
  [{ fx: 0.65, fy: 0.22 }, { fx: 0.50, fy: 0.52 }, { fx: 0.80, fy: 0.56 }],
  [{ fx: 0.62, fy: 0.18 }, { fx: 0.48, fy: 0.42 }, { fx: 0.75, fy: 0.38 }, { fx: 0.68, fy: 0.62 }],
  [{ fx: 0.60, fy: 0.15 }, { fx: 0.48, fy: 0.35 }, { fx: 0.72, fy: 0.32 }, { fx: 0.55, fy: 0.58 }, { fx: 0.82, fy: 0.55 }],
]

// ── 場地座標轉換（fx/fy → 畫布 px）──────────────────────
function _fieldToScreen(fx, fy, W, H) {
  const farY  = H * FIELD.farY
  const nearY = H * FIELD.nearY
  const farL  = W * FIELD.farL
  const farR  = W * FIELD.farR
  const nearL = W * FIELD.nearL
  const nearR = W * FIELD.nearR
  const leftX  = farL + (nearL - farL) * fy
  const rightX = farR + (nearR - farR) * fy
  return {
    x: leftX + fx * (rightX - leftX),
    y: farY  + (nearY - farY) * fy,
  }
}

// ── 透視縮放（fy=0 遠端小，fy=1 近端大）──────────────────
function _fieldScale(fy) {
  return 0.50 + fy * 0.65
}

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

    // 章節 / 波次
    this.chapterIdx = (gameState.chapterIdx ?? 0)
    this.waveIdx    = (gameState.waveIdx    ?? 0)

    // 生成敵人並賦予等角位置
    const W = canvas.width
    const H = canvas.height
    const rawEnemies = generateWaveEnemies(this.chapterIdx, this.waveIdx)
    const posCount   = Math.min(rawEnemies.length, ENEMY_POSITIONS.length - 1)
    const posSet     = ENEMY_POSITIONS[posCount]

    rawEnemies.forEach((e, i) => {
      const pos = posSet[i] || { fx: 0.60 + (i % 3) * 0.10, fy: 0.30 + (i % 2) * 0.25 }
      e.fx   = pos.fx
      e.fy   = pos.fy
      const sc = _fieldScale(pos.fy)
      const sp = _fieldToScreen(pos.fx, pos.fy, W, H)
      e.x    = sp.x
      e.y    = sp.y
      e.size = Math.round((e.size || 48) * sc)
    })

    // 建立戰鬥狀態
    this.bs = createBattleState(gameState.hero, rawEnemies, gameState.cardStars || {})

    // 玩家等角位置（左近側）
    this.playerFx = 0.12
    this.playerFy = 0.72
    const pSp     = _fieldToScreen(this.playerFx, this.playerFy, W, H)
    this.playerX  = pSp.x
    this.playerY  = pSp.y

    // 攻擊計時
    this.attackInterval = Math.round(70 / (gameState.hero?.spd || 1.0))
    this.attackTimer    = 0
    this.phase          = 'player_turn'

    // 視覺浮動文字
    this.floats = []

    // 震動
    this.shakeTarget = null
    this.shakeTimer  = 0

    // 結束延遲
    this.endTimer = 0

    // 卡牌提示
    this.cardBanner = null

    // 開場章節橫幅
    this.bannerLife = 120

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

    // 浮動文字
    this.floats = this.floats.filter(f => f.life > 0)
    for (const f of this.floats) {
      f.y    -= 1.5 * dt * 60
      f.life -= dt * 60
    }

    // 卡牌橫幅
    if (this.cardBanner) {
      this.cardBanner.life -= dt * 60
      if (this.cardBanner.life <= 0) this.cardBanner = null
    }

    // 震動
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 60

    // 開場倒計時
    if (this.bannerLife > 0) { this.bannerLife -= dt * 60; return }

    // 戰鬥結束等待
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
    const state  = this.bs
    const result = playerAttack(state)
    if (!result) { this.phase = 'player_turn'; return }

    const { damage, isCrit, target, extraDamage } = result

    this._addFloat(target.x, target.y - target.size * 0.6,
      isCrit ? '暴擊！' + damage : '-' + damage,
      isCrit ? '#ffd700' : '#ff8888')

    if (extraDamage > 0) {
      this._addFloat(target.x + 20, target.y - target.size * 0.9, '+' + extraDamage, '#ffcc44')
    }

    this.shakeTarget = 'enemy'
    this.shakeTimer  = 10

    for (const eff of state.effects) this._showCardBanner(eff.text, eff.color)
    state.effects.length = 0

    if (target.hp <= 0) {
      this._addFloat(target.x, target.y - target.size * 1.0, '擊倒！', '#00e676')
    }

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
        this.playerX + (Math.random() - 0.5) * 25,
        this.playerY - 70,
        '-' + damage, '#ff5555')
    }

    this.shakeTarget = 'player'
    this.shakeTimer  = 10

    for (const eff of state.effects) this._showCardBanner(eff.text, eff.color)
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
    const ctx   = this.ctx
    const W     = this.canvas.width
    const H     = this.canvas.height
    const state = this.bs

    // 等角地板
    this._drawFloor(ctx, W, H)

    // 開場章節標題
    if (this.bannerLife > 0) {
      this._drawOpenBanner(W, H)
      return
    }

    // 波次資訊板（頂部）
    this._drawWavePanel(ctx, W, H)

    // 玩家 HP 條（牌組欄上方，不被遮住）
    // 牌組欄從 H - 54 開始，HP 條固定在其上方留 8px 間距
    const deckBarY = H - 54
    const pShakeX = (this.shakeTarget === 'player' && this.shakeTimer > 0)
      ? Math.sin(this.shakeTimer * 1.4) * 6 : 0
    drawHpBar(ctx, 10 + pShakeX, deckBarY - 32, 180, 24,
      state.player.hp, state.player.maxHp,
      state.player.nameZh || state.player.name, '#4fc3f7')

    const eShakeX = (this.shakeTarget === 'enemy' && this.shakeTimer > 0)
      ? Math.sin(this.shakeTimer * 1.4) * 6 : 0

    // 依 fy 深度排序（遠的先畫，近的後畫壓在上面）
    const drawList = []
    for (const e of state.enemies) {
      if (e.hp > 0) drawList.push({ kind: 'enemy', e, fy: e.fy })
    }
    drawList.push({ kind: 'player', fy: this.playerFy })
    drawList.sort((a, b) => a.fy - b.fy)

    for (const item of drawList) {
      if (item.kind === 'player') {
        const sc = _fieldScale(this.playerFy)
        this._drawPlayer(ctx, this.playerX + pShakeX, this.playerY, sc)
      } else {
        const e = item.e
        this._drawEnemy(ctx, e, e.x + eShakeX)
        drawHpBar(ctx,
          e.x + eShakeX - e.size * 0.65,
          e.y - e.size - 22,
          e.size * 1.3, 16,
          e.hp, e.maxHp,
          e.nameZh || e.name,
          e.isBoss ? '#ff6b6b' : T.slime)
      }
    }

    // 牌組（底部）
    this._drawDeckBar(ctx, W, H)

    // 卡牌橫幅提示
    if (this.cardBanner) this._drawCardBanner(ctx, W, H)

    // 浮動文字
    for (const f of this.floats) {
      const alpha = Math.min(1, f.life / 30)
      ctx.globalAlpha = alpha
      ctx.font        = 'bold ' + (f.size || 18) + 'px sans-serif'
      ctx.fillStyle   = f.color
      ctx.textAlign   = 'center'
      ctx.shadowColor = '#000'
      ctx.shadowBlur  = 4
      ctx.fillText(f.text, f.x, f.y)
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
    }
  }

  // ─── 等角地板 ────────────────────────────────────────────
  _drawFloor(ctx, W, H) {
    const farY  = H * FIELD.farY
    const nearY = H * FIELD.nearY
    const farL  = W * FIELD.farL
    const farR  = W * FIELD.farR
    const nearL = W * FIELD.nearL
    const nearR = W * FIELD.nearR

    // ── 先整張畫布填滿深色，避免漏出前一場景 ────────────────
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(0, 0, W, H)

    // ── 梯形左右兩側空白區填色 ───────────────────────────────
    ctx.fillStyle = '#0a0e1a'
    ctx.beginPath()
    ctx.moveTo(0, farY); ctx.lineTo(farL, farY)
    ctx.lineTo(nearL, nearY); ctx.lineTo(0, nearY)
    ctx.closePath(); ctx.fill()

    ctx.beginPath()
    ctx.moveTo(W, farY); ctx.lineTo(farR, farY)
    ctx.lineTo(nearR, nearY); ctx.lineTo(W, nearY)
    ctx.closePath(); ctx.fill()

    // 天空（地板上方）
    const skyG = ctx.createLinearGradient(0, 0, 0, farY + 20)
    skyG.addColorStop(0, '#0a0e1a')
    skyG.addColorStop(1, '#172040')
    ctx.fillStyle = skyG
    ctx.fillRect(0, 0, W, farY + 20)

    // 地板梯形填色
    const floorG = ctx.createLinearGradient(0, farY, 0, nearY)
    floorG.addColorStop(0,   '#1a3520')
    floorG.addColorStop(0.5, '#22402a')
    floorG.addColorStop(1,   '#162c1a')
    ctx.fillStyle = floorG
    ctx.beginPath()
    ctx.moveTo(farL,  farY)
    ctx.lineTo(farR,  farY)
    ctx.lineTo(nearR, nearY)
    ctx.lineTo(nearL, nearY)
    ctx.closePath()
    ctx.fill()

    // 網格線 — 深度方向（縱線）
    ctx.strokeStyle = 'rgba(80,180,60,0.16)'
    ctx.lineWidth   = 1
    for (let i = 0; i <= 7; i++) {
      const t  = i / 7
      const x1 = farL  + t * (farR  - farL)
      const x2 = nearL + t * (nearR - nearL)
      ctx.beginPath()
      ctx.moveTo(x1, farY)
      ctx.lineTo(x2, nearY)
      ctx.stroke()
    }

    // 網格線 — 橫向（透視收縮）
    for (let j = 1; j <= 5; j++) {
      const t  = j / 6
      const sy = farY + (nearY - farY) * t
      const lx = farL + (nearL - farL) * t
      const rx = farR + (nearR - farR) * t
      ctx.beginPath()
      ctx.moveTo(lx, sy)
      ctx.lineTo(rx, sy)
      ctx.stroke()
    }

    // 地板輪廓邊線
    ctx.strokeStyle = 'rgba(100,210,80,0.28)'
    ctx.lineWidth   = 1.5
    ctx.beginPath(); ctx.moveTo(farL,  farY);  ctx.lineTo(nearL, nearY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(farR,  farY);  ctx.lineTo(nearR, nearY); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(nearL, nearY); ctx.lineTo(nearR, nearY); ctx.stroke()

    // 近端地面輝光（暗橙色燈光感）
    const glowG = ctx.createLinearGradient(0, nearY - 20, 0, nearY + 30)
    glowG.addColorStop(0, 'rgba(255,150,50,0.0)')
    glowG.addColorStop(1, 'rgba(255,120,30,0.12)')
    ctx.fillStyle = glowG
    ctx.fillRect(0, nearY - 20, W, 50)

    // 遠端霧氣遮擋
    const fogG = ctx.createLinearGradient(0, farY - 50, 0, farY + 40)
    fogG.addColorStop(0, 'rgba(10,14,26,1.0)')
    fogG.addColorStop(1, 'rgba(10,14,26,0.0)')
    ctx.fillStyle = fogG
    ctx.fillRect(0, farY - 50, W, 90)

    // UI 底部區域
    const uiG = ctx.createLinearGradient(0, nearY, 0, H)
    uiG.addColorStop(0, '#0e1a0b')
    uiG.addColorStop(1, '#060c04')
    ctx.fillStyle = uiG
    ctx.fillRect(0, nearY, W, H - nearY)

    // 左右牆壁暗影（增加縱深感）
    const wallL = ctx.createLinearGradient(0, 0, W * 0.18, 0)
    wallL.addColorStop(0, 'rgba(0,0,0,0.35)')
    wallL.addColorStop(1, 'rgba(0,0,0,0.0)')
    ctx.fillStyle = wallL
    ctx.fillRect(0, farY, W * 0.18, nearY - farY)

    const wallR = ctx.createLinearGradient(W, 0, W * 0.82, 0)
    wallR.addColorStop(0, 'rgba(0,0,0,0.25)')
    wallR.addColorStop(1, 'rgba(0,0,0,0.0)')
    ctx.fillStyle = wallR
    ctx.fillRect(W * 0.82, farY, W * 0.18, nearY - farY)
  }

  // ─── 開場章節標題 ────────────────────────────────────────
  _drawOpenBanner(W, H) {
    const ctx   = this.ctx
    const alpha = Math.min(1, this.bannerLife / 30) * Math.min(1, (120 - this.bannerLife) / 30 + 0.3)
    ctx.globalAlpha = alpha

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, H * 0.38, W, 100)

    const chapter = CHAPTERS[this.chapterIdx]
    ctx.fillStyle = T.gold
    ctx.font      = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('第 ' + (this.chapterIdx + 1) + ' 章', W / 2, H * 0.38 + 38)

    ctx.fillStyle = T.textWhite
    ctx.font      = '20px sans-serif'
    ctx.fillText(chapter ? chapter.nameZh : '', W / 2, H * 0.38 + 68)

    ctx.globalAlpha = 1
  }

  // ─── 波次資訊板 ──────────────────────────────────────────
  _drawWavePanel(ctx, W, H) {
    const label = getWaveLabel(this.chapterIdx, this.waveIdx)
    ctx.fillStyle = 'rgba(0,0,40,0.55)'
    rrect(ctx, W * 0.28, 8, W * 0.44, 32, 8); ctx.fill()
    ctx.fillStyle = T.textWhite
    ctx.font      = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, W / 2, 29)
  }

  // ─── 玩家（杯子角色）────────────────────────────────────
  _drawPlayer(ctx, x, groundY, scale) {
    if (scale === undefined) scale = 1

    ctx.save()
    ctx.translate(x, groundY)
    ctx.scale(scale, scale)
    ctx.translate(-x, -groundY)

    const y    = groundY
    const cupW = 48
    const cupH = 58
    const cupBW = 36
    const topX = x - cupW / 2
    const botX = x - cupBW / 2
    const topY = y - cupH
    const botY = y

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath(); ctx.ellipse(x, y + 10, 26, 7, 0, 0, Math.PI * 2); ctx.fill()

    const heroKey = 'hero_' + ((this.gameState.hero && this.gameState.hero.id) ? this.gameState.hero.id : 'knight')
    SpriteManager.drawSprite(ctx, heroKey, x, y, 80, 100, () => {
      const hero = this.gameState.hero
      const c1   = (hero && hero.color)      ? hero.color      : T.heroBlue
      const c2   = (hero && hero.colorDark)  ? hero.colorDark  : T.heroBlueShadow

      const g = ctx.createLinearGradient(topX, topY, topX + cupW, topY)
      g.addColorStop(0, c1); g.addColorStop(0.5, c1 + 'cc'); g.addColorStop(1, c2)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
      ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
      ctx.closePath(); ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.beginPath()
      ctx.moveTo(topX + 5, topY + 4); ctx.lineTo(topX + cupW * 0.45, topY + 4)
      ctx.lineTo(botX + cupBW * 0.42, botY - 8); ctx.lineTo(botX + 5, botY - 8)
      ctx.closePath(); ctx.fill()

      const rimG = ctx.createLinearGradient(topX, topY, topX, topY + 10)
      rimG.addColorStop(0, '#a0d8ff'); rimG.addColorStop(1, c2)
      ctx.fillStyle = rimG
      ctx.fillRect(topX - 3, topY - 5, cupW + 6, 12)

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

      ctx.save()
      ctx.translate(x + 32, y - 36)
      ctx.rotate(-0.4)
      ctx.fillStyle = '#d0e8f8'; ctx.fillRect(-2.5, -26, 5, 32)
      ctx.strokeStyle = '#7799aa'; ctx.lineWidth = 1; ctx.strokeRect(-2.5, -26, 5, 32)
      ctx.fillStyle = T.gold; ctx.fillRect(-8, 0, 16, 5)
      ctx.fillStyle = T.woodMid; ctx.fillRect(-2, 5, 4, 12)
      ctx.restore()

      ctx.strokeStyle = c2; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
      ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
      ctx.closePath(); ctx.stroke()
    })

    ctx.restore()
  }

  // ─── 敵人 ────────────────────────────────────────────────
  _drawEnemy(ctx, enemy, x) {
    const size = enemy.size || 48
    const y    = enemy.y || (this.canvas.height * 0.72)

    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath(); ctx.ellipse(x, y + 8, size * 0.55, size * 0.15, 0, 0, Math.PI * 2); ctx.fill()

    if (enemy.isBoss) {
      this._drawBossEnemy(ctx, enemy, x, y, size)
    } else {
      this._drawNormalEnemy(ctx, enemy, x, y, size)
    }
  }

  _drawNormalEnemy(ctx, enemy, x, y, size) {
    const enemyKey = 'enemy_' + (enemy.type || 'slime')
    SpriteManager.drawSprite(ctx, enemyKey, x, y, size * 1.2, size * 1.2, () => {
      const rg = ctx.createRadialGradient(
        x - size * 0.2, y - size * 0.6, size * 0.1,
        x,             y - size * 0.5, size * 0.8)
      rg.addColorStop(0,   _lighten(enemy.color || '#888', 40))
      rg.addColorStop(0.7, enemy.color || '#888')
      rg.addColorStop(1,   _darken(enemy.color || '#888', 30))
      ctx.fillStyle = rg
      ctx.beginPath(); ctx.arc(x, y - size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = _darken(enemy.color || '#888', 40); ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y - size * 0.55, size * 0.55, 0, Math.PI * 2); ctx.stroke()

      const ey = y - size * 0.6
      for (const ex of [x - size * 0.22, x + size * 0.22]) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.12, size * 0.12, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#200'
        ctx.beginPath(); ctx.ellipse(ex + 1, ey + 1, size * 0.07, size * 0.07, 0, 0, Math.PI * 2); ctx.fill()
      }

      ctx.font      = (size * 0.5) + 'px serif'
      ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👾', x, y - size * 0.3)
    })
  }

  _drawBossEnemy(ctx, enemy, x, y, size) {
    const bw = size * 1.1
    const bh = size * 1.3
    const enemyKey = 'enemy_' + (enemy.type || 'slime')
    SpriteManager.drawSprite(ctx, enemyKey, x, y, bw * 1.4, (bh + 30) * 1.2, () => {
      const rg = ctx.createRadialGradient(x, y - bh * 0.5, bh * 0.05, x, y - bh * 0.5, bh * 0.8)
      rg.addColorStop(0, _lighten(enemy.color || '#c00', 40))
      rg.addColorStop(1, _darken(enemy.color  || '#c00', 20))
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.moveTo(x - bw / 2, y - bh)
      ctx.lineTo(x + bw / 2, y - bh)
      ctx.lineTo(x + bw * 0.35, y)
      ctx.lineTo(x - bw * 0.35, y)
      ctx.closePath(); ctx.fill()

      const crownY = y - bh - 14
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

      const ey = y - bh * 0.58
      for (const ex of [x - bw * 0.2, x + bw * 0.2]) {
        ctx.fillStyle = '#ff0'
        ctx.beginPath(); ctx.ellipse(ex, ey, bw * 0.1, bw * 0.1, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#600'
        ctx.beginPath(); ctx.ellipse(ex, ey + 1, bw * 0.06, bw * 0.06, 0, 0, Math.PI * 2); ctx.fill()
      }

      ctx.font      = (size * 0.4) + 'px serif'
      ctx.textAlign = 'center'
      ctx.fillText(enemy.emoji || '👑', x, y - bh * 0.25)
    })
  }

  // ─── 牌組顯示（底部）────────────────────────────────────
  _drawDeckBar(ctx, W, H) {
    const deck = this.bs.player.deck || []
    if (deck.length === 0) return

    const barH = 52
    const barY = H - barH - 2
    ctx.fillStyle = 'rgba(0,10,40,0.72)'
    rrect(ctx, 0, barY, W, barH + 4, 0); ctx.fill()

    const cardW = 46
    const gap   = 6
    const total = deck.length * (cardW + gap) - gap
    let   cx    = (W - total) / 2

    ctx.textAlign = 'center'
    for (const cardId of deck) {
      const card = getCardById(cardId)
      if (!card) { cx += cardW + gap; continue }
      const rCol = card.group === 'hero' ? '#d4a017' : '#4a90d9'

      ctx.fillStyle = rCol + '33'
      rrect(ctx, cx, barY + 4, cardW, barH - 8, 6); ctx.fill()
      ctx.strokeStyle = rCol; ctx.lineWidth = 1.5
      rrect(ctx, cx, barY + 4, cardW, barH - 8, 6); ctx.stroke()

      ctx.font = '18px serif'
      ctx.fillText(card.icon || '?', cx + cardW / 2, barY + 24)

      ctx.font      = '9px sans-serif'
      ctx.fillStyle = rCol
      ctx.fillText((card.nameZh || card.name).slice(0, 4), cx + cardW / 2, barY + 38)

      cx += cardW + gap
    }
  }

  // ─── 卡牌橫幅提示 ────────────────────────────────────────
  _drawCardBanner(ctx, W, H) {
    const banner = this.cardBanner
    const alpha  = Math.min(1, banner.life / 20)
    ctx.globalAlpha = alpha

    ctx.fillStyle = banner.color + '33'
    rrect(ctx, W * 0.1, H * 0.44, W * 0.8, 34, 8); ctx.fill()
    ctx.strokeStyle = banner.color; ctx.lineWidth = 1.5
    rrect(ctx, W * 0.1, H * 0.44, W * 0.8, 34, 8); ctx.stroke()

    ctx.fillStyle = banner.color
    ctx.font      = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(banner.text, W / 2, H * 0.44 + 22)
    ctx.globalAlpha = 1
  }

  // ─── 輔助 ──────────────────────────────────────────  // ─── 輔助 ────────────────────────────────────────────────
  _addFloat(x, y, text, color, size) {
    this.floats.push({ x, y, text, color, life: 60, size: size || 18 })
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
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}

function _darken(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - amt)
  const g = Math.max(0, ((n >> 8)  & 0xff) - amt)
  const b = Math.max(0, ((n)       & 0xff) - amt)
  return 'rgb(' + r + ',' + g + ',' + b + ')'
}
