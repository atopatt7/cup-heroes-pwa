// UpgradeScene.js
// 升級卡選擇畫面
// - 根據 totalScore（彈珠台得分）顯示 3 張升級卡
// - 玩家選一張，套用到 gameState.hero
// - 選完後呼叫 onComplete()

const UPGRADES = [
  { id: 'atk_s',  name: '⚔️ 攻擊強化',    desc: 'ATK +5',        rarity: 'common', apply: (h) => { h.atk += 5 } },
  { id: 'atk_m',  name: '⚔️ 猛力強化',    desc: 'ATK +10',       rarity: 'rare',   apply: (h) => { h.atk += 10 } },
  { id: 'def_s',  name: '🛡️ 防禦強化',    desc: 'DEF +4',        rarity: 'common', apply: (h) => { h.def += 4 } },
  { id: 'def_m',  name: '🛡️ 鋼鐵意志',    desc: 'DEF +8',        rarity: 'rare',   apply: (h) => { h.def += 8 } },
  { id: 'hp_s',   name: '💖 生命強化',     desc: 'MaxHP +20',     rarity: 'common', apply: (h) => { h.maxHp += 20; h.hp += 20 } },
  { id: 'hp_m',   name: '💖 強健體魄',     desc: 'MaxHP +40',     rarity: 'rare',   apply: (h) => { h.maxHp += 40; h.hp += 40 } },
  { id: 'heal_s', name: '🍀 治療藥草',     desc: '回復 HP 30',    rarity: 'common', apply: (h) => { h.hp = Math.min(h.maxHp, h.hp + 30) } },
  { id: 'heal_m', name: '🍀 強效藥水',     desc: '回復 HP 60',    rarity: 'rare',   apply: (h) => { h.hp = Math.min(h.maxHp, h.hp + 60) } },
  { id: 'full_h', name: '✨ 滿血復活',     desc: '完全回復 HP',   rarity: 'epic',   apply: (h) => { h.hp = h.maxHp } },
  { id: 'all_s',  name: '🌟 全能強化',     desc: 'ATK+5 DEF+3',  rarity: 'epic',   apply: (h) => { h.atk += 5; h.def += 3 } },
]

const RARITY_COLOR = { common: '#3498db', rare: '#9b59b6', epic: '#f39c12' }

export class UpgradeScene {
  constructor(canvas, ctx, gameState, totalScore, onComplete) {
    this.canvas     = canvas
    this.ctx        = ctx
    this.gameState  = gameState
    this.totalScore = totalScore
    this.onComplete = onComplete

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this.chosen  = null   // index 0~2
    this.state   = 'choosing'  // 'choosing' | 'chosen'

    // 隨機抽 3 張
    const pool = [...UPGRADES]
    this.cards = []
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      this.cards.push(pool.splice(idx, 1)[0])
    }

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
    this.t += Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs = ts
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

    const W      = this.canvas.width
    const cardW  = W * 0.82
    const cardH  = 100
    const cardX  = (W - cardW) / 2
    const startY = this.canvas.height * 0.22

    this.cards.forEach((card, i) => {
      const cy = startY + i * (cardH + 18)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        this.chosen = i
        card.apply(this.gameState.hero)
        this.state = 'chosen'
      }
    })
  }

  _draw() {
    const ctx = this.ctx
    const W = this.canvas.width
    const H = this.canvas.height

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d0d1a')
    bg.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'

    // 標題
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('✨ 選擇升級', W / 2, 44)

    ctx.fillStyle = '#aaa'
    ctx.font = '15px sans-serif'
    const wave = this.gameState.currentWave - 1  // 剛打完的波次
    ctx.fillText(`Wave ${wave} 完成！  彈珠得分：${this.totalScore}`, W / 2, 70)

    // 英雄當前數值
    const h = this.gameState.hero
    ctx.fillStyle = '#7f8c8d'
    ctx.font = '13px sans-serif'
    ctx.fillText(`HP ${h.hp}/${h.maxHp}  ATK ${h.atk}  DEF ${h.def}`, W / 2, 92)

    // 升級卡
    const cardW  = W * 0.82
    const cardH  = 100
    const cardX  = (W - cardW) / 2
    const startY = H * 0.22

    this.cards.forEach((card, i) => {
      const cy      = startY + i * (cardH + 18)
      const isChosen = this.chosen === i
      const isOther  = this.state === 'chosen' && !isChosen
      const color    = RARITY_COLOR[card.rarity] || '#888'

      ctx.save()
      if (isOther) ctx.globalAlpha = 0.25
      if (isChosen) { ctx.shadowColor = color; ctx.shadowBlur = 22 }

      // 卡片背景
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      cg.addColorStop(0, isChosen ? color + '44' : 'rgba(25,25,45,0.97)')
      cg.addColorStop(1, isChosen ? color + '11' : 'rgba(12,12,25,0.97)')
      ctx.fillStyle = cg
      this._rrect(ctx, cardX, cy, cardW, cardH, 12)
      ctx.fill()

      ctx.strokeStyle = isChosen ? color : color + '77'
      ctx.lineWidth   = isChosen ? 2.5 : 1.5
      ctx.shadowBlur  = 0
      ctx.stroke()

      // 稀有度
      ctx.fillStyle  = color
      ctx.font       = 'bold 11px sans-serif'
      ctx.textAlign  = 'right'
      ctx.fillText({ common: 'COMMON', rare: 'RARE', epic: 'EPIC' }[card.rarity], cardX + cardW - 14, cy + 20)

      // 卡名
      ctx.fillStyle = '#fff'
      ctx.font      = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(card.name, cardX + 16, cy + 40)

      // 效果
      ctx.fillStyle = '#bbb'
      ctx.font      = '15px sans-serif'
      ctx.fillText(card.desc, cardX + 16, cy + 66)

      // 勾選
      if (isChosen) {
        ctx.fillStyle = color
        ctx.font      = 'bold 26px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('✓', cardX + cardW - 14, cy + cardH - 14)
      }

      ctx.restore()
    })

    // 繼續 / 提示
    if (this.state === 'chosen') {
      const pulse = 0.92 + Math.sin(this.t * 4) * 0.08
      ctx.save()
      ctx.translate(W / 2, H * 0.88)
      ctx.scale(pulse, pulse)
      this._btn(ctx, 0, 0, 210, 50, `Wave ${this.gameState.currentWave} 出發 →`, '#e74c3c', '#c0392b')
      ctx.restore()
    } else {
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 2.5) * 0.4
      ctx.fillStyle   = '#fff'
      ctx.font        = '15px sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText('👆 點擊一張卡片選取', W / 2, H * 0.90)
      ctx.globalAlpha = 1
    }
  }

  _btn(ctx, cx, cy, w, h, label, c1, c2) {
    const x = cx - w / 2, y = cy - h / 2
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, c1); g.addColorStop(1, c2)
    ctx.fillStyle = g
    this._rrect(ctx, x, y, w, h, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'
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
