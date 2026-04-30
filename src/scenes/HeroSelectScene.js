// HeroSelectScene.js
// 英雄選擇畫面
// - 顯示所有英雄卡片（Knight Cup 預設解鎖，Ninja Cup 需解鎖）
// - 玩家點擊已解鎖的英雄後點「出發」進入戰鬥
// - 鎖定英雄顯示解鎖條件

import { SaveManager } from '../game/SaveManager.js'
import { HEROES }      from '../data/heroes.js'

// 顯示用附加資訊（不放進 data 層）
const HERO_DISPLAY = {
  knight: { nameZh: '騎士杯', emoji: '🛡️', unlockHint: '預設解鎖' },
  ninja:  { nameZh: '忍者杯', emoji: '⚔️', unlockHint: '通關第 5 波後解鎖' },
}

const HERO_LIST = Object.values(HEROES)

export class HeroSelectScene {
  constructor(canvas, ctx, onSelect) {
    this.canvas   = canvas
    this.ctx      = ctx
    this.onSelect = onSelect   // (heroStats) => void

    this.animId   = null
    this.t        = 0
    this.lastTs   = 0
    this.selected = 0
    this.save     = SaveManager.load()

    this._loop    = this._loop.bind(this)
    this._onClick = this._onClick.bind(this)
  }

  start() {
    this.save = SaveManager.load()
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

    const W      = this.canvas.width
    const H      = this.canvas.height
    const cardW  = W * 0.80
    const cardH  = 140
    const cardX  = (W - cardW) / 2
    const startY = H * 0.22

    // 點擊英雄卡片
    HERO_LIST.forEach((hero, i) => {
      const cy = startY + i * (cardH + 20)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        if (this.save.unlockedHeroes.includes(hero.id)) {
          this.selected = i
        }
      }
    })

    // 點擊「出發」按鈕
    const btnY = H * 0.84
    if (ty > btnY - 28 && ty < btnY + 28) {
      const hero = HERO_LIST[this.selected]
      if (this.save.unlockedHeroes.includes(hero.id)) {
        this.stop()
        this.onSelect({
          id:    hero.id,
          name:  hero.name,
          hp:    hero.hp,
          maxHp: hero.maxHp,
          atk:   hero.atk,
          def:   hero.def,
          crit:  hero.crit,
        })
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1a1a2e')
    bg.addColorStop(1, '#0f3460')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'

    // 標題
    ctx.fillStyle = '#f5c518'
    ctx.font      = 'bold 26px sans-serif'
    ctx.fillText('選擇英雄', W / 2, 46)

    ctx.fillStyle = '#888'
    ctx.font      = '14px sans-serif'
    ctx.fillText(`最高紀錄：Wave ${this.save.bestWave || 0}`, W / 2, 70)

    // 英雄卡片
    const cardW  = W * 0.80
    const cardH  = 140
    const cardX  = (W - cardW) / 2
    const startY = H * 0.22

    HERO_LIST.forEach((hero, i) => {
      const display    = HERO_DISPLAY[hero.id] || {}
      const cy         = startY + i * (cardH + 20)
      const unlocked   = this.save.unlockedHeroes.includes(hero.id)
      const isSelected = this.selected === i && unlocked

      ctx.save()
      if (!unlocked) ctx.globalAlpha = 0.45

      // 卡片背景
      if (isSelected) {
        ctx.shadowColor = hero.color
        ctx.shadowBlur  = 20
      }
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      cg.addColorStop(0, isSelected ? hero.color + '44' : 'rgba(20,20,40,0.95)')
      cg.addColorStop(1, isSelected ? hero.color + '11' : 'rgba(10,10,25,0.95)')
      ctx.fillStyle = cg
      this._rrect(ctx, cardX, cy, cardW, cardH, 14)
      ctx.fill()

      ctx.strokeStyle = isSelected ? hero.color : hero.color + '66'
      ctx.lineWidth   = isSelected ? 2.5 : 1.5
      ctx.shadowBlur  = 0
      ctx.stroke()

      // Emoji
      ctx.font      = '52px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(display.emoji || '⚔️', cardX + 50, cy + cardH / 2 + 18)

      // 名稱
      ctx.fillStyle = '#fff'
      ctx.font      = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(display.nameZh || hero.name, cardX + 95, cy + 38)

      // 描述
      ctx.fillStyle = '#aaa'
      ctx.font      = '14px sans-serif'
      ctx.fillText(hero.description, cardX + 95, cy + 60)

      // 數值
      ctx.fillStyle = '#7fb3d3'
      ctx.font      = '13px sans-serif'
      ctx.fillText(`HP ${hero.hp}   ATK ${hero.atk}   DEF ${hero.def}`, cardX + 95, cy + 82)

      // 解鎖狀態 / 條件
      if (!unlocked) {
        ctx.fillStyle = '#e67e22'
        ctx.font      = 'bold 13px sans-serif'
        ctx.fillText(`🔒 ${display.unlockHint || ''}`, cardX + 95, cy + 106)
      } else if (isSelected) {
        ctx.fillStyle = hero.color
        ctx.font      = 'bold 13px sans-serif'
        ctx.fillText('✓ 已選擇', cardX + 95, cy + 106)
      }

      ctx.restore()
    })

    // 出發按鈕
    const pulse = 0.93 + Math.sin(this.t * 3.5) * 0.07
    ctx.save()
    ctx.translate(W / 2, H * 0.84)
    ctx.scale(pulse, pulse)
    this._btn(ctx, 0, 0, 200, 52, '⚔️  出發！', '#e74c3c', '#c0392b')
    ctx.restore()
  }

  _btn(ctx, cx, cy, w, h, label, c1, c2) {
    const x = cx - w / 2, y = cy - h / 2
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, c1); g.addColorStop(1, c2)
    ctx.fillStyle = g
    this._rrect(ctx, x, y, w, h, 12); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 19px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy); ctx.textBaseline = 'alphabetic'
  }

  _rrect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
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
