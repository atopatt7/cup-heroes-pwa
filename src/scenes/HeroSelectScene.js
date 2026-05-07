import { SaveManager }                              from '../game/SaveManager.js'
import { HEROES }                                  from '../data/heroes.js'
import { getCardById }                             from '../data/cards.js'
import { T }                                       from '../utils/theme.js'
import { drawSky, drawGround, drawBtn, rrect }     from '../utils/drawHelpers.js'
import { SpriteManager }                           from '../game/SpriteManager.js'

// 顯示資料（UI 專用，不放到 heroes.js 避免污染遊戲資料）
const HERO_DISPLAY = {
  knight:    { bgTop: '#1a80e0', bgBot: '#0055aa' },
  rogue:     { bgTop: '#7B1FA2', bgBot: '#4a148c' },
  barbarian: { bgTop: '#E64A19', bgBot: '#bf360c' },
  druid:     { bgTop: '#388E3C', bgBot: '#1b5e20' },
}

const HERO_LIST = Object.values(HEROES)

const CLOUDS = [
  { x: 50,  y: 70,  scale: 0.8  },
  { x: 240, y: 45,  scale: 1.0  },
  { x: 340, y: 90,  scale: 0.7  },
]

export class HeroSelectScene {
  constructor(canvas, ctx, onSelect) {
    this.canvas   = canvas
    this.ctx      = ctx
    this.onSelect = onSelect  // (heroId: string) => void
    this.animId   = null
    this.t        = 0
    this.lastTs   = 0
    this.selected = 0
    this.save     = SaveManager.load()
    this._loop    = this._loop.bind(this)
    this._onClick = this._onClick.bind(this)
  }

  start() {
    this.save     = SaveManager.load()
    this.selected = HERO_LIST.findIndex(h => this.save.unlockedHeroes?.includes(h.id))
    if (this.selected < 0) this.selected = 0
    this.canvas.addEventListener('pointerdown', this._onClick)
    this.animId = requestAnimationFrame(this._loop)
  }

  stop() {
    this.canvas.removeEventListener('pointerdown', this._onClick)
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
  }

  _loop(ts) {
    this.t += Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs = ts
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _onClick(e) {
    e.preventDefault()
    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top)  * scaleY
    const W  = this.canvas.width
    const H  = this.canvas.height

    const cardW = W * 0.88, cardH = 108, cardX = (W - cardW) / 2
    const startY = H * 0.17

    HERO_LIST.forEach((hero, i) => {
      const cy = startY + i * (cardH + 12)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        const unlocked = this.save.unlockedHeroes?.includes(hero.id)
        if (unlocked) this.selected = i
      }
    })

    const btnY = H * 0.89
    if (ty > btnY - 30 && ty < btnY + 30) {
      const hero = HERO_LIST[this.selected]
      const unlocked = this.save.unlockedHeroes?.includes(hero.id)
      if (unlocked) {
        this.stop()
        this.onSelect(hero.id)   // 只傳 ID，Game.js 用 getHero() 建立副本
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    drawSky(ctx, W, H, CLOUDS)
    drawGround(ctx, W, H, H * 0.80)

    ctx.textAlign = 'center'

    // ── 標題牌 ─────────────────────────────────────────────
    const panelY  = H * 0.03
    const panelW  = W * 0.80
    const panelX  = (W - panelW) / 2
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    rrect(ctx, panelX + 4, panelY + 5, panelW, 52, 14); ctx.fill()
    const woodG = ctx.createLinearGradient(panelX, panelY, panelX, panelY + 52)
    woodG.addColorStop(0, T.woodLight); woodG.addColorStop(1, T.woodDark)
    ctx.fillStyle = woodG
    rrect(ctx, panelX, panelY, panelW, 52, 14); ctx.fill()
    ctx.strokeStyle = T.woodDark; ctx.lineWidth = 2
    rrect(ctx, panelX, panelY, panelW, 52, 14); ctx.stroke()

    ctx.shadowColor = T.woodDark; ctx.shadowBlur = 4
    ctx.fillStyle   = T.gold; ctx.font = 'bold 22px sans-serif'
    ctx.fillText('選擇英雄', W / 2, panelY + 24)
    ctx.shadowBlur  = 0
    ctx.fillStyle   = T.textWhite; ctx.font = '12px sans-serif'
    ctx.fillText(`最高紀錄：Wave ${this.save.bestWave || 0}`, W / 2, panelY + 44)

    // ── 英雄卡片 ──────────────────────────────────────────
    const cardW  = W * 0.88, cardH = 108, cardX = (W - cardW) / 2
    const startY = H * 0.17

    HERO_LIST.forEach((hero, i) => {
      const disp     = HERO_DISPLAY[hero.id] || {}
      const cy       = startY + i * (cardH + 12)
      const unlocked = this.save.unlockedHeroes?.includes(hero.id) ?? false
      const isSel    = this.selected === i && unlocked

      ctx.save()
      if (!unlocked) ctx.globalAlpha = 0.45

      // 陰影
      ctx.fillStyle = 'rgba(0,0,0,0.20)'
      rrect(ctx, cardX + 3, cy + 5, cardW, cardH, 14); ctx.fill()

      // 背景
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      if (isSel) {
        cg.addColorStop(0, disp.bgTop || '#1a80e0')
        cg.addColorStop(1, disp.bgBot || '#0055aa')
      } else {
        cg.addColorStop(0, '#eef4ff')
        cg.addColorStop(1, '#ccdaf0')
      }
      ctx.fillStyle = cg
      rrect(ctx, cardX, cy, cardW, cardH, 14); ctx.fill()

      // 邊框
      if (isSel) {
        ctx.shadowColor = T.goldLight; ctx.shadowBlur = 16
        ctx.strokeStyle = T.gold; ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = '#a8c4e0'; ctx.lineWidth = 1.5
      }
      rrect(ctx, cardX, cy, cardW, cardH, 14); ctx.stroke()
      ctx.shadowBlur = 0

      // 左色條
      const barG = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      barG.addColorStop(0, disp.bgTop || '#1a80e0')
      barG.addColorStop(1, disp.bgBot || '#0055aa')
      ctx.fillStyle = barG
      rrect(ctx, cardX, cy, 9, cardH, 14); ctx.fill()
      ctx.fillRect(cardX + 6, cy, 5, cardH)

      // 英雄立繪（有圖片用圖片，無圖片用 emoji fallback）
      const portraitCX = cardX + 42
      const portraitBY = cy + cardH - 4
      SpriteManager.drawHero(ctx, hero.id, portraitCX, portraitBY, 60, 88, () => {
        ctx.font = '38px serif'; ctx.textAlign = 'center'
        ctx.fillText(hero.emoji || '⚔️', portraitCX, cy + cardH / 2 + 14)
      })

      // 名稱
      ctx.fillStyle = isSel ? '#fff' : T.textDark
      ctx.font      = `bold 17px sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(hero.nameZh || hero.name, cardX + 72, cy + 26)

      // 描述（截短以免超出）
      ctx.fillStyle = isSel ? 'rgba(255,255,255,0.82)' : '#5080a0'
      ctx.font      = '11px sans-serif'
      const desc = hero.description.slice(0, 22) + (hero.description.length > 22 ? '…' : '')
      ctx.fillText(desc, cardX + 72, cy + 44)

      // 數值 chips
      const chips = [
        { label: `❤️${hero.hp}`, col: isSel ? 'rgba(255,100,100,0.35)' : 'rgba(200,0,0,0.10)' },
        { label: `⚔️${hero.atk}`, col: isSel ? 'rgba(255,180,0,0.35)' : 'rgba(200,100,0,0.10)' },
        { label: `🛡️${hero.def}`, col: isSel ? 'rgba(100,200,255,0.35)' : 'rgba(0,80,180,0.10)' },
        { label: `💨${hero.spd}x`, col: isSel ? 'rgba(100,255,100,0.35)' : 'rgba(0,150,50,0.10)' },
      ]
      chips.forEach((chip, ci) => {
        const cx2 = cardX + 72 + ci * 68
        ctx.fillStyle = chip.col
        rrect(ctx, cx2 - 2, cy + 52, 64, 20, 10); ctx.fill()
        ctx.fillStyle = isSel ? '#fff' : T.textDark
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'
        ctx.fillText(chip.label, cx2 + 4, cy + 66)
      })

      // 起始卡牌預覽（最多 3 個）
      const starters = hero.startingCards || []
      starters.slice(0, 3).forEach((cardId, ci) => {
        const c = getCardById(cardId)
        if (!c) return
        const iconX = cardX + 72 + ci * 44
        const iconY = cy + 78
        ctx.fillStyle = isSel ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,100,0.08)'
        rrect(ctx, iconX, iconY, 38, 22, 6); ctx.fill()
        ctx.fillStyle = isSel ? '#fff' : '#446'
        ctx.font = '11px serif'; ctx.textAlign = 'left'
        ctx.fillText(c.icon || '?', iconX + 4, iconY + 15)
        ctx.font = '9px sans-serif'
        ctx.fillText((c.nameZh || c.name).slice(0, 4), iconX + 18, iconY + 15)
      })

      // 上鎖 / 選中
      if (!unlocked) {
        ctx.fillStyle = '#e65100'; ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(`🔒 ${hero.unlockHint || '未解鎖'}`, cardX + cardW - 10, cy + cardH - 10)
      } else if (isSel) {
        ctx.fillStyle = T.goldLight; ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('✓ 已選擇', cardX + cardW - 10, cy + cardH - 10)
      }

      ctx.restore()
    })

    // ── 出發按鈕 ──────────────────────────────────────────
    const pulse = 0.93 + Math.sin(this.t * 3.5) * 0.07
    ctx.save()
    ctx.translate(W / 2, H * 0.89)
    ctx.scale(pulse, pulse)
    drawBtn(ctx, 0, 0, 220, 52, '⚔️  出發冒險！', T.btnRed, T.btnRedDark, 26)
    ctx.restore()
}
}
