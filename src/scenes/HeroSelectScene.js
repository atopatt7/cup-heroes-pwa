import { SaveManager }                              from '../game/SaveManager.js'
import { HEROES }                                  from '../data/heroes.js'
import { T }                                       from '../utils/theme.js'
import { drawSky, drawGround, drawBtn, rrect }     from '../utils/drawHelpers.js'

const HERO_DISPLAY = {
  knight: { nameZh: '騎士杯', emoji: '🛡️', unlockHint: '預設解鎖',       bgTop: '#1a80e0', bgBot: '#0055aa' },
  ninja:  { nameZh: '忍者杯', emoji: '⚔️', unlockHint: '通關第5波後解鎖', bgTop: '#7c3aed', bgBot: '#4a1a9a' },
}
const HERO_LIST = Object.values(HEROES)

// 簡易雲朵配置（靜態）
const CLOUDS = [
  { x: 50,  y: 70,  scale: 0.8  },
  { x: 240, y: 45,  scale: 1.0  },
  { x: 340, y: 90,  scale: 0.7  },
]

export class HeroSelectScene {
  constructor(canvas, ctx, onSelect) {
    this.canvas   = canvas
    this.ctx      = ctx
    this.onSelect = onSelect
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
    this.selected = HERO_LIST.findIndex(h => this.save.unlockedHeroes.includes(h.id))
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
    const cardW = W * 0.86, cardH = 130, cardX = (W - cardW) / 2
    const startY = H * 0.22

    HERO_LIST.forEach((hero, i) => {
      const cy = startY + i * (cardH + 16)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        if (this.save.unlockedHeroes.includes(hero.id)) this.selected = i
      }
    })

    const btnY = H * 0.86
    if (ty > btnY - 30 && ty < btnY + 30) {
      const hero = HERO_LIST[this.selected]
      if (this.save.unlockedHeroes.includes(hero.id)) {
        this.stop()
        this.onSelect({ id: hero.id, name: hero.name, hp: hero.hp, maxHp: hero.maxHp, atk: hero.atk, def: hero.def, crit: hero.crit })
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // 天空背景
    drawSky(ctx, W, H, CLOUDS)
    // 地面
    drawGround(ctx, W, H, H * 0.78)

    // 標題牌
    ctx.textAlign   = 'center'
    const panelY    = H * 0.04
    ctx.fillStyle   = 'rgba(0,0,0,0.32)'
    rrect(ctx, W * 0.1 + 3, panelY + 4, W * 0.8, 50, 14); ctx.fill()
    const woodG = ctx.createLinearGradient(W*0.1, panelY, W*0.1, panelY+50)
    woodG.addColorStop(0, T.woodLight); woodG.addColorStop(1, T.woodDark)
    ctx.fillStyle = woodG
    rrect(ctx, W * 0.1, panelY, W * 0.8, 50, 14); ctx.fill()
    ctx.strokeStyle = T.woodDark; ctx.lineWidth = 2
    rrect(ctx, W * 0.1, panelY, W * 0.8, 50, 14); ctx.stroke()

    ctx.fillStyle = T.gold; ctx.font = 'bold 24px sans-serif'
    ctx.fillText('選擇英雄', W / 2, panelY + 22)
    ctx.fillStyle = T.textWhite; ctx.font = '13px sans-serif'
    ctx.fillText(`最高記錄：Wave ${this.save.bestWave || 0}`, W / 2, panelY + 42)

    // 英雄卡片
    const cardW = W * 0.86, cardH = 130, cardX = (W - cardW) / 2
    const startY = H * 0.22

    HERO_LIST.forEach((hero, i) => {
      const disp       = HERO_DISPLAY[hero.id] || {}
      const cy         = startY + i * (cardH + 16)
      const unlocked   = this.save.unlockedHeroes.includes(hero.id)
      const isSel      = this.selected === i && unlocked

      ctx.save()
      if (!unlocked) ctx.globalAlpha = 0.55

      // 卡片陰影
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      rrect(ctx, cardX + 4, cy + 6, cardW, cardH, 16); ctx.fill()

      // 卡片背景漸層
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      if (isSel) {
        cg.addColorStop(0, disp.bgTop || T.heroBlue)
        cg.addColorStop(1, disp.bgBot || T.heroBlueShadow)
      } else {
        cg.addColorStop(0, '#e8f4ff')
        cg.addColorStop(1, '#c8dff5')
      }
      ctx.fillStyle = cg
      rrect(ctx, cardX, cy, cardW, cardH, 16); ctx.fill()

      // 選中高光邊框
      if (isSel) {
        ctx.shadowColor = T.goldLight; ctx.shadowBlur = 18
        ctx.strokeStyle = T.gold; ctx.lineWidth = 3
      } else {
        ctx.strokeStyle = '#a8c8e8'; ctx.lineWidth = 1.5
      }
      rrect(ctx, cardX, cy, cardW, cardH, 16); ctx.stroke()
      ctx.shadowBlur = 0

      // 彩色左側色條
      const barG = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      barG.addColorStop(0, disp.bgTop || T.heroBlue)
      barG.addColorStop(1, disp.bgBot || T.heroBlueShadow)
      ctx.fillStyle = barG
      rrect(ctx, cardX, cy, 10, cardH, 16); ctx.fill()

      // Emoji
      ctx.font = '44px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(disp.emoji || '⚔️', cardX + 46, cy + cardH / 2 + 16)

      // 英雄名稱
      ctx.fillStyle  = isSel ? '#fff' : T.textDark
      ctx.font       = 'bold 20px sans-serif'
      ctx.textAlign  = 'left'
      ctx.fillText(disp.nameZh || hero.name, cardX + 82, cy + 34)

      // 描述
      ctx.fillStyle = isSel ? 'rgba(255,255,255,0.85)' : '#5588aa'
      ctx.font      = '13px sans-serif'
      ctx.fillText(hero.description, cardX + 82, cy + 56)

      // 數值 chips
      const stats = [
        { label: `❤️ ${hero.hp}`, x: cardX + 82 },
        { label: `⚔️ ${hero.atk}`, x: cardX + 144 },
        { label: `🛡️ ${hero.def}`, x: cardX + 210 },
      ]
      for (const st of stats) {
        ctx.fillStyle = isSel ? 'rgba(0,0,80,0.3)' : 'rgba(10,40,100,0.12)'
        rrect(ctx, st.x - 2, cy + 64, 58, 22, 11); ctx.fill()
        ctx.fillStyle = isSel ? '#fff' : T.textDark
        ctx.font      = 'bold 12px sans-serif'; ctx.textAlign = 'left'
        ctx.fillText(st.label, st.x + 4, cy + 79)
      }

      // 解鎖 / 已選狀態
      if (!unlocked) {
        ctx.fillStyle = '#e65100'; ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`🔒 ${disp.unlockHint || ''}`, cardX + 82, cy + 108)
      } else if (isSel) {
        ctx.fillStyle = T.goldLight; ctx.font = 'bold 13px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('✓ 已選擇', cardX + cardW - 14, cy + cardH - 12)
      }

      ctx.restore()
    })

    // 出發按鈕
    const pulse = 0.93 + Math.sin(this.t * 3.5) * 0.07
    ctx.save()
    ctx.translate(W / 2, H * 0.86)
    ctx.scale(pulse, pulse)
    drawBtn(ctx, 0, 0, 220, 54, '⚔️  出發冒險！', T.btnRed, T.btnRedDark, 27)
    ctx.restore()
  }
}
