// UpgradeScene.js — 卡牌選擇畫面（群組 + 星級升級系統）
// 通用牌：所有英雄可取得  英雄牌：該英雄專屬
// 重複取得同一張牌 → 升星（最多 5 星），升滿後不再出現
import { drawCardOffers, getCardDesc, MAX_STARS } from '../data/cards.js'
import { T } from '../utils/theme.js'
import { drawBtn, rrect } from '../utils/drawHelpers.js'

const GROUP_META = {
  universal: { bg: '#0c1e38', bar: '#4a90d9', badgeBg: '#163060', badgeFg: '#88c0ff' },
  hero:      { bg: '#26160a', bar: '#d4a017', badgeBg: '#4a2d00', badgeFg: '#ffd060' },
}

const HERO_NAME = { knight: '騎士', rogue: '刺客', barbarian: '蠻將', druid: '德魯伊' }

const TRIGGER_LABEL = {
  passive:      '🔵 被動',
  battle_start: '⚔️ 戰鬥開始',
  on_attack:    '⚡ 每次攻擊',
  on_crit:      '💥 暴擊時',
  on_kill:      '💀 擊殺時',
  on_hit:       '🛡️ 被攻擊時',
  on_low_hp:    '❤️ 低血量',
}

export class UpgradeScene {
  constructor(canvas, ctx, gameState, totalScore, onComplete) {
    this.canvas     = canvas
    this.ctx        = ctx
    this.gameState  = gameState
    this.totalScore = totalScore || 0
    this.onComplete = onComplete
    this.t       = 0
    this.lastTs  = 0
    this.chosen  = null
    this.state   = 'choosing'
    this.animId  = null

    // 確保 cardStars 存在
    if (!this.gameState.cardStars) this.gameState.cardStars = {}

    const wave = (gameState.waveIdx || 0) + (gameState.chapterIdx || 0) * 15 + 1
    this.cards = drawCardOffers(3, wave, gameState.hero?.id || 'knight', this.gameState.cardStars)

    this._loop    = this._loop.bind(this)
    this._onClick = this._onClick.bind(this)
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
    const dt    = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t     += dt
    this.lastTs = ts
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _onClick(e) {
    e.preventDefault()
    if (this.state === 'chosen') { this.stop(); this.onComplete(); return }

    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top)  * scaleY

    const { cardW, cardH, cardX, startY } = this._layout()

    this.cards.forEach((card, i) => {
      const cy = startY + i * (cardH + 14)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        this.chosen = i
        this.state  = 'chosen'
        // 升星：重複取得同牌 → +1 星（不重複 push deck）
        const cs = this.gameState.cardStars
        cs[card.id] = Math.min((cs[card.id] || 0) + 1, MAX_STARS)
        // 首次取得才加入 deck
        if (!this.gameState.hero.deck) this.gameState.hero.deck = []
        if (!this.gameState.hero.deck.includes(card.id)) {
          this.gameState.hero.deck.push(card.id)
        }
      }
    })
  }

  _layout() {
    const W = this.canvas.width
    const H = this.canvas.height
    return {
      W, H,
      cardW:  Math.floor(W * 0.84),
      cardH:  130,
      cardX:  Math.floor(W * 0.08),
      startY: Math.floor(H * 0.22),
    }
  }

  _draw() {
    const ctx = this.ctx
    const { W, H, cardW, cardH, cardX, startY } = this._layout()
    const cardStars = this.gameState.cardStars || {}

    // ── 背景 ──────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#07090f')
    bg.addColorStop(1, '#0d1220')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    this._drawBgStars(ctx, W)

    // ── 標題 ──────────────────────────────────────────────────
    ctx.textAlign = 'center'
    const gTitle  = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
    gTitle.addColorStop(0, '#ffd700')
    gTitle.addColorStop(0.5, '#fff8dc')
    gTitle.addColorStop(1, '#ffd700')
    ctx.fillStyle   = gTitle
    ctx.font        = 'bold 26px sans-serif'
    ctx.shadowColor = '#f5c518'
    ctx.shadowBlur  = 14
    ctx.fillText('✨ 選擇技能卡', W / 2, 46)
    ctx.shadowBlur  = 0

    const chNum = (this.gameState.chapterIdx || 0) + 1
    const wNum  = (this.gameState.waveIdx    || 0) + 1
    ctx.fillStyle = '#8899aa'
    ctx.font      = '13px sans-serif'
    ctx.fillText(`第${chNum}章 波次${wNum} 完成  🏆 得分：${this.totalScore}`, W / 2, 68)

    const h = this.gameState.hero
    ctx.fillStyle = '#667788'
    ctx.font      = '12px sans-serif'
    ctx.fillText(`HP ${Math.ceil(h.hp)}/${h.maxHp}  ATK ${h.atk}  DEF ${h.def}  牌組：${(h.deck||[]).length}張`, W / 2, 86)

    // ── 卡牌列表 ──────────────────────────────────────────────
    this.cards.forEach((card, i) => {
      const cy        = startY + i * (cardH + 14)
      const isChosen  = this.chosen === i
      const isOther   = this.state === 'chosen' && !isChosen
      const gm        = GROUP_META[card.group] || GROUP_META.universal
      const curStars  = cardStars[card.id] || 0
      const nextStar  = Math.min(curStars + 1, MAX_STARS)
      const isUpgrade = curStars > 0

      ctx.save()
      if (isOther) ctx.globalAlpha = 0.18

      // 卡片背景
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      cg.addColorStop(0, isChosen ? gm.bar + '44' : gm.bg)
      cg.addColorStop(1, '#070a12')
      ctx.fillStyle = cg
      rrect(ctx, cardX, cy, cardW, cardH, 12)
      ctx.fill()

      // 邊框 + 發光
      if (isChosen) { ctx.shadowColor = gm.bar; ctx.shadowBlur = 16 }
      ctx.strokeStyle = isChosen ? gm.bar : gm.bar + '55'
      ctx.lineWidth   = isChosen ? 2.5 : 1.5
      rrect(ctx, cardX, cy, cardW, cardH, 12)
      ctx.stroke()
      ctx.shadowBlur = 0

      // 左色條
      ctx.fillStyle = gm.bar
      rrect(ctx, cardX, cy, 6, cardH, 12)
      ctx.fill()
      ctx.fillRect(cardX + 4, cy, 3, cardH)

      // 圖示
      ctx.font      = '28px serif'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(card.icon || '?', cardX + 16, cy + 47)

      // ── 群組徽章 ──
      const badgeText = card.group === 'hero'
        ? `英雄 · ${HERO_NAME[card.heroId] || card.heroId}`
        : '通用'
      const badgeW = card.group === 'hero' ? 74 : 42
      ctx.fillStyle = gm.badgeBg
      rrect(ctx, cardX + 54, cy + 9, badgeW, 17, 4)
      ctx.fill()
      ctx.fillStyle   = gm.badgeFg
      ctx.font        = 'bold 10px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(badgeText, cardX + 54 + badgeW / 2, cy + 21)

      // ── 星級顯示 ──
      const starX0 = cardX + 54 + badgeW + 8
      ctx.textAlign = 'left'
      ctx.font      = '12px sans-serif'
      for (let si = 0; si < MAX_STARS; si++) {
        ctx.fillStyle = si < curStars ? '#ffd700' : '#2a3a4a'
        ctx.fillText('★', starX0 + si * 14, cy + 22)
      }

      // ── 卡名 ──
      ctx.fillStyle = '#ffffff'
      ctx.font      = 'bold 17px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(card.nameZh || card.name, cardX + 54, cy + 50)

      // ── 描述（升級後效果預覽） ──
      ctx.fillStyle = isUpgrade ? '#7de8b0' : '#aabbcc'
      ctx.font      = '12.5px sans-serif'
      ctx.fillText(getCardDesc(card, nextStar), cardX + 54, cy + 70)

      // ── 觸發類型 ──
      ctx.fillStyle = gm.bar + 'bb'
      ctx.font      = '11px sans-serif'
      ctx.fillText(TRIGGER_LABEL[card.trigger] || card.trigger, cardX + 54, cy + 88)

      // ── 底部：新卡 / 升星提示 ──
      if (isUpgrade) {
        ctx.fillStyle = '#44cc88'
        ctx.font      = 'bold 10px sans-serif'
        ctx.fillText(`⬆ 升星  ${curStars}★ → ${nextStar}★`, cardX + 54, cy + 108)
      } else {
        ctx.fillStyle = '#55dd99'
        ctx.font      = 'bold 10px sans-serif'
        ctx.fillText('✦ 新卡！首次獲得', cardX + 54, cy + 108)
      }

      // ── 選中勾 ──
      if (isChosen) {
        ctx.fillStyle   = gm.bar
        ctx.font        = 'bold 20px sans-serif'
        ctx.textAlign   = 'right'
        ctx.fillText('✓ 已選', cardX + cardW - 12, cy + cardH - 10)
      }

      ctx.restore()
    })

    // ── 底部按鈕 / 提示 ──────────────────────────────────────
    if (this.state === 'chosen') {
      const pulse = 0.93 + Math.sin(this.t * 3.5) * 0.07
      ctx.save()
      ctx.translate(W / 2, H * 0.924)
      ctx.scale(pulse, pulse)
      drawBtn(ctx, 0, 0, 220, 52, '繼續冒險 ▶', T.btnRed, T.btnRedDark)
      ctx.restore()
    } else {
      ctx.globalAlpha = 0.6 + Math.sin(this.t * 2.5) * 0.35
      ctx.fillStyle   = '#8899aa'
      ctx.font        = '15px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText('👆 點選一張卡牌', W / 2, H * 0.928)
      ctx.globalAlpha = 1
    }
  }

  _drawBgStars(ctx, W) {
    const pts = [
      [30, 20], [80, 50], [150, 10], [240, 35], [310, 15], [370, 40],
      [50, 110], [190, 95], [350, 105], [20, 150],
    ]
    ctx.fillStyle = '#ffffff'
    for (const [sx, sy] of pts) {
      ctx.globalAlpha = (0.3 + Math.abs(Math.sin(this.t * 1.5 + sx * 0.05)) * 0.7) * 0.6
      ctx.beginPath()
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}
