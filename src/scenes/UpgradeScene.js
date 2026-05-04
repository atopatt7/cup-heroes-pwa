// UpgradeScene.js — 卡牌選擇畫面（稀有度系統）
// 波次勝利後：玩家從 3 張卡牌中選一張加入牌組
import { drawCardOffers, RARITY, CARDS } from '../data/cards.js'
import { T } from '../utils/theme.js'
import { drawSky, drawBtn, rrect } from '../utils/drawHelpers.js'

const RARITY_BG = {
  common:    '#1a2840',
  rare:      '#0d1f3a',
  epic:      '#1a0d30',
  legendary: '#2a1800',
}

export class UpgradeScene {
  constructor(canvas, ctx, gameState, totalScore, onComplete) {
    this.canvas     = canvas
    this.ctx        = ctx
    this.gameState  = gameState
    this.totalScore = totalScore || 0
    this.onComplete = onComplete

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this.chosen  = null
    this.state   = 'choosing'

    // 根據當前波次決定稀有度機率
    const wave = (gameState.waveIdx || 0) + (gameState.chapterIdx || 0) * 4 + 1
    this.cards = drawCardOffers(3, wave)

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
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t       += dt
    this.lastTs   = ts
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _onClick(e) {
    e.preventDefault()
    if (this.state === 'chosen') {
      this.stop()
      this.onComplete()
      return
    }

    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top)  * scaleY

    const W     = this.canvas.width
    const H     = this.canvas.height
    const cardW = W * 0.84
    const cardH = 120
    const cardX = (W - cardW) / 2
    const startY = H * 0.20

    this.cards.forEach((card, i) => {
      const cy = startY + i * (cardH + 16)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        this.chosen = i
        this.state  = 'chosen'
        // 加入牌組
        if (!this.gameState.hero.deck) this.gameState.hero.deck = []
        this.gameState.hero.deck.push(card.id)
      }
    })
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // 深色背景
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#07090f')
    bg.addColorStop(1, '#0d1220')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 頂部裝飾星點
    this._drawStars(ctx, W, H)

    ctx.textAlign = 'center'

    // ── 標題 ──────────────────────────────────────────────
    const gTitle = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
    gTitle.addColorStop(0, '#ffd700')
    gTitle.addColorStop(0.5, '#fff8dc')
    gTitle.addColorStop(1, '#ffd700')
    ctx.fillStyle = gTitle
    ctx.font      = 'bold 26px sans-serif'
    ctx.shadowColor = '#f5c518'; ctx.shadowBlur = 14
    ctx.fillText('✨ 選擇技能卡', W / 2, 46)
    ctx.shadowBlur = 0

    // 當前波次
    const chNum  = (this.gameState.chapterIdx || 0) + 1
    const wNum   = (this.gameState.waveIdx    || 0) + 1
    ctx.fillStyle = T.textGray
    ctx.font      = '14px sans-serif'
    ctx.fillText(`第${chNum}章 波次${wNum} 完成  🏆 得分：${this.totalScore}`, W / 2, 70)

    // 英雄狀態
    const h = this.gameState.hero
    ctx.fillStyle = T.textGray
    ctx.font      = '12px sans-serif'
    ctx.fillText(`HP ${Math.ceil(h.hp)}/${h.maxHp}  ATK ${h.atk}  DEF ${h.def}  牌組：${(h.deck||[]).length}張`, W / 2, 90)

    // ── 卡牌 ──────────────────────────────────────────────
    const cardW  = W * 0.84
    const cardH  = 120
    const cardX  = (W - cardW) / 2
    const startY = H * 0.20

    this.cards.forEach((card, i) => {
      const cy      = startY + i * (cardH + 16)
      const isChosen = this.chosen === i
      const isOther  = this.state === 'chosen' && !isChosen
      const rar      = RARITY[card.rarity] || RARITY.common
      const rarColor = rar.color
      const rarGlow  = rar.glow

      ctx.save()
      if (isOther) ctx.globalAlpha = 0.22

      // 卡片背景漸層
      const bgColor = RARITY_BG[card.rarity] || '#1a2840'
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      if (isChosen) {
        cg.addColorStop(0, rarColor + '55')
        cg.addColorStop(1, rarColor + '11')
      } else {
        cg.addColorStop(0, bgColor)
        cg.addColorStop(1, '#070a12')
      }
      ctx.fillStyle = cg
      rrect(ctx, cardX, cy, cardW, cardH, 14); ctx.fill()

      // 邊框發光
      if (isChosen) {
        ctx.shadowColor = rarGlow; ctx.shadowBlur = 18
      }
      ctx.strokeStyle = isChosen ? rarColor : rarColor + '66'
      ctx.lineWidth   = isChosen ? 2.5 : 1.5
      rrect(ctx, cardX, cy, cardW, cardH, 14); ctx.stroke()
      ctx.shadowBlur  = 0

      // 左色條
      const barW = 6
      ctx.fillStyle = rarColor
      rrect(ctx, cardX, cy, barW, cardH, 14); ctx.fill()
      ctx.fillStyle = rarColor
      ctx.fillRect(cardX + barW - 2, cy, 4, cardH)

      // 圖示
      ctx.font = '32px serif'
      ctx.textAlign = 'left'
      ctx.fillText(card.icon || '?', cardX + 22, cy + 46)

      // 稀有度徽章
      ctx.fillStyle = rarColor + 'cc'
      rrect(ctx, cardX + 60, cy + 10, 62, 18, 6); ctx.fill()
      ctx.fillStyle   = '#fff'
      ctx.font        = 'bold 10px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(rar.label.toUpperCase(), cardX + 91, cy + 22)

      // 卡名
      ctx.fillStyle = '#fff'
      ctx.font      = 'bold 18px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(card.nameZh || card.name, cardX + 60, cy + 50)

      // 描述
      ctx.fillStyle = T.textGray
      ctx.font      = '13px sans-serif'
      ctx.fillText(card.desc, cardX + 60, cy + 74)

      // 觸發條件
      const triggerLabel = {
        passive:      '被動',
        battle_start: '戰鬥開始',
        on_attack:    '每次攻擊',
        on_crit:      '暴擊時',
        on_kill:      '擊殺時',
        on_hit:       '被攻擊時',
        on_low_hp:    '低血量',
      }[card.trigger] || card.trigger
      ctx.fillStyle = rarColor + 'aa'
      ctx.font      = '11px sans-serif'
      ctx.fillText(`觸發：${triggerLabel}`, cardX + 60, cy + 92)

      // 勾選
      if (isChosen) {
        ctx.fillStyle   = rarColor
        ctx.font        = 'bold 24px sans-serif'
        ctx.textAlign   = 'right'
        ctx.fillText('✓ 已選擇', cardX + cardW - 14, cy + cardH - 14)
      }

      ctx.restore()
    })

    // ── 按鈕 / 提示 ───────────────────────────────────────
    if (this.state === 'chosen') {
      const pulse = 0.93 + Math.sin(this.t * 3.5) * 0.07
      ctx.save()
      ctx.translate(W / 2, H * 0.90)
      ctx.scale(pulse, pulse)
      drawBtn(ctx, 0, 0, 220, 52, '繼續冒險 ▶', T.btnRed, T.btnRedDark)
      ctx.restore()
    } else {
      ctx.globalAlpha = 0.6 + Math.sin(this.t * 2.5) * 0.35
      ctx.fillStyle   = T.textGray
      ctx.font        = '15px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText('👆 點選一張卡牌加入牌組', W / 2, H * 0.91)
      ctx.globalAlpha = 1
    }
  }

  _drawStars(ctx, W, H) {
    // 簡單背景星點
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    const stars = [
      [30, 20], [80, 50], [150, 10], [240, 35], [310, 15], [370, 40],
      [50, 110], [190, 95], [350, 105], [20, 150],
    ]
    for (const [sx, sy] of stars) {
      const twinkle = 0.3 + Math.abs(Math.sin(this.t * 1.5 + sx * 0.05)) * 0.7
      ctx.globalAlpha = twinkle * 0.6
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}
