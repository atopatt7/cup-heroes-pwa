import upgradeData from '../data/upgrades.json'

const RARITY_COLOR = {
  common: '#3498db',
  rare:   '#9b59b6',
  epic:   '#e67e22',
}

/**
 * UpgradeScene — 升級卡選擇畫面
 *
 * 每波結束後顯示 3 張隨機升級卡，玩家點一張套用後進下一波或通關。
 */
export class UpgradeScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.cards = []
    this.chosen = null
    this.t = 0
    this.state = 'choosing'   // 'choosing' | 'chosen'
  }

  onEnter({ wave, heroManager, gameState, resource }) {
    this.wave = wave
    this.hm = heroManager
    this.gameState = gameState
    this.resource = resource || 0
    this.t = 0
    this.chosen = null
    this.state = 'choosing'

    // 隨機抽 3 張不重複的升級卡
    const pool = [...upgradeData]
    this.cards = []
    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      this.cards.push(pool.splice(idx, 1)[0])
    }

    this._onTap = (e) => {
      e.preventDefault()
      this._handleTap(e)
    }
    this.canvas.addEventListener('pointerdown', this._onTap)
  }

  onExit() {
    this.canvas.removeEventListener('pointerdown', this._onTap)
  }

  _handleTap(e) {
    if (this.state === 'chosen') {
      // 進下一波或通關
      const nextWave = this.wave + 1
      if (nextWave > 15) {
        this.sm.switchTo('victory', { gameState: this.gameState })
      } else {
        this.sm.switchTo('battle', {
          wave: nextWave,
          heroManager: this.hm,
          gameState: this.gameState,
        })
      }
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top) * scaleY

    // 偵測點擊哪張卡
    const W = this.canvas.width
    const H = this.canvas.height
    const cardW = W * 0.72
    const cardH = 110
    const cardX = (W - cardW) / 2
    const startY = H * 0.30

    this.cards.forEach((card, i) => {
      const cy = startY + i * (cardH + 18)
      if (tx >= cardX && tx <= cardX + cardW && ty >= cy && ty <= cy + cardH) {
        this.chosen = i
        this.hm.applyUpgrade(card)
        // 治療效果立即套用
        if (card.effect?.type === 'heal') {
          const hero = this.hm.activeHero
          hero.baseStats.hp = Math.min(
            hero.baseStats.hp + card.effect.value,
            hero.baseStats.hp + card.effect.value  // maxHp 由 BattleEngine 管理
          )
        }
        this.state = 'chosen'
      }
    })
  }

  update(delta) {
    this.t += delta
  }

  draw(ctx) {
    const W = this.canvas.width
    const H = this.canvas.height

    // ── 背景 ─────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0d0d1a')
    bg.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // ── 標題 ─────────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f5c518'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('✨ 選擇升級', W / 2, 42)

    ctx.fillStyle = '#aaa'
    ctx.font = '15px sans-serif'
    ctx.fillText(`Wave ${this.wave} 完成！資源：+${this.resource}`, W / 2, 68)

    // ── 升級卡 ────────────────────────────────────────────
    const cardW = W * 0.82
    const cardH = 100
    const cardX = (W - cardW) / 2
    const startY = H * 0.20

    this.cards.forEach((card, i) => {
      const cy = startY + i * (cardH + 16)
      const isChosen = this.chosen === i
      const isOther = this.state === 'chosen' && !isChosen
      const color = RARITY_COLOR[card.rarity] || '#888'

      ctx.save()
      if (isOther) ctx.globalAlpha = 0.3
      if (isChosen) {
        // 選中光暈
        ctx.shadowColor = color
        ctx.shadowBlur = 20
      }

      // 卡片背景
      const cg = ctx.createLinearGradient(cardX, cy, cardX, cy + cardH)
      cg.addColorStop(0, isChosen ? color + '55' : 'rgba(30,30,50,0.95)')
      cg.addColorStop(1, isChosen ? color + '22' : 'rgba(15,15,30,0.95)')
      ctx.fillStyle = cg
      this._roundRect(ctx, cardX, cy, cardW, cardH, 12)
      ctx.fill()

      // 邊框
      ctx.strokeStyle = isChosen ? color : color + '88'
      ctx.lineWidth = isChosen ? 2.5 : 1.5
      ctx.stroke()

      ctx.shadowBlur = 0

      // 稀有度標籤
      ctx.fillStyle = color
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'right'
      const rarityLabel = { common: 'COMMON', rare: 'RARE', epic: 'EPIC' }[card.rarity] || ''
      ctx.fillText(rarityLabel, cardX + cardW - 12, cy + 20)

      // 卡名
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(card.name, cardX + 16, cy + 38)

      // 效果描述
      ctx.fillStyle = '#ccc'
      ctx.font = '15px sans-serif'
      ctx.fillText(card.desc, cardX + 16, cy + 62)

      // 選中打勾
      if (isChosen) {
        ctx.fillStyle = color
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('✓', cardX + cardW - 14, cy + cardH - 14)
      }

      ctx.restore()
    })

    // ── 繼續按鈕（選完後） ───────────────────────────────
    if (this.state === 'chosen') {
      const nextWave = this.wave + 1
      const label = nextWave > 15 ? '🎉 通關！' : `第 ${nextWave} 波 →`
      const pulse = 0.92 + Math.sin(this.t * 4) * 0.08
      ctx.save()
      ctx.translate(W / 2, H * 0.88)
      ctx.scale(pulse, pulse)
      this._drawButton(ctx, 0, 0, 200, 48, label, '#e74c3c', '#c0392b')
      ctx.restore()
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '15px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('👆 點擊一張卡片選取', W / 2, H * 0.90)
    }
  }

  _drawButton(ctx, cx, cy, w, h, label, c1, c2) {
    const x = cx - w / 2, y = cy - h / 2
    const g = ctx.createLinearGradient(x, y, x, y + h)
    g.addColorStop(0, c1); g.addColorStop(1, c2)
    ctx.fillStyle = g
    this._roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy)
    ctx.textBaseline = 'alphabetic'
  }

  _roundRect(ctx, x, y, w, h, r) {
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
