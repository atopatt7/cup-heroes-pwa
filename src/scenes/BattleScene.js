import { BattleEngine } from '../game/BattleEngine.js'
import enemyData from '../data/enemies.json'

/**
 * BattleScene — 回合制戰鬥畫面
 *
 * 流程：
 *   onEnter(data) → 讀取 wave/heroManager → 建立 BattleEngine
 *   每幀 update(delta) → 狀態機驅動動畫
 *   draw(ctx) → 繪製 HP 條、角色、日誌、按鈕
 *
 * 狀態機：
 *   'intro'      進場動畫
 *   'idle'       等待玩家點擊「攻擊」
 *   'animating'  播放攻擊動畫
 *   'result'     顯示回合結果
 *   'win'        本波勝利，等待離開
 *   'lose'       遊戲結束
 */
export class BattleScene {
  constructor(sceneManager) {
    this.sm = sceneManager
    this.canvas = sceneManager.canvas
    this.state = 'intro'
    this.t = 0
    this.engine = null
    this.wave = 1
    this.hm = null

    // 動畫相關
    this.shakeX = 0
    this.flashAlpha = 0
    this.heroFlash = 0
    this.enemyFlash = 0
    this.lastEvents = []
    this.logMessages = []
    this.resultTimer = 0
    this.introDone = false
  }

  onEnter({ wave, heroManager, gameState }) {
    this.wave = wave
    this.hm = heroManager
    this.gameState = gameState
    this.t = 0
    this.state = 'intro'
    this.introDone = false
    this.logMessages = []
    this.shakeX = 0
    this.flashAlpha = 0
    this.heroFlash = 0
    this.enemyFlash = 0

    // 取本波敵人（wave 1~15）
    const enemyTemplate = enemyData.find((e) => e.wave === wave) || enemyData[wave - 1]
    const heroStats = this.hm.getCombatStats()
    this.engine = new BattleEngine(heroStats, enemyTemplate, this.hm)

    // 綁定點擊
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
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (this.state === 'intro' && this.introDone) {
      this.state = 'idle'
      return
    }

    if (this.state === 'idle') {
      // 點擊攻擊按鈕區域
      const btnY = this.canvas.height * 0.82
      if (y > btnY - 30 && y < btnY + 60) {
        this._doRound()
      }
      return
    }

    if (this.state === 'win') {
      // 進入杯球彈珠台
      this.sm.switchTo('cupgame', {
        wave: this.wave,
        heroManager: this.hm,
        gameState: this.gameState,
      })
      return
    }

    if (this.state === 'lose') {
      this.sm.switchTo('gameover', { gameState: this.gameState })
      return
    }
  }

  _doRound() {
    this.state = 'animating'
    const result = this.engine.doRound()
    this.lastEvents = result.events

    // 建立日誌文字
    for (const ev of result.events) {
      if (ev.type === 'hero_attack') {
        const extra = ev.isDouble ? '（連擊！）' : ''
        this.logMessages.unshift(`⚔️ 你攻擊了 ${ev.damage} 點傷害${extra}`)
      } else if (ev.type === 'shield_trigger') {
        this.logMessages.unshift(`🛡️ 盾牆觸發！傷害減半`)
      } else if (ev.type === 'enemy_attack') {
        this.logMessages.unshift(`💢 敵人攻擊了 ${ev.damage} 點傷害`)
      } else if (ev.type === 'enemy_dead') {
        this.logMessages.unshift(`💀 敵人倒下！獲得 ${ev.reward} 資源`)
      }
    }
    if (this.logMessages.length > 5) this.logMessages.length = 5

    // 觸發震動效果
    this.shakeX = 10
    this.enemyFlash = 0.5
    const hasEnemyAtk = result.events.some((e) => e.type === 'enemy_attack')
    if (hasEnemyAtk) this.heroFlash = 0.5

    this.resultTimer = 0.6
    this.state = 'result'

    // 更新英雄 baseStats hp（回血用）
    this.hm.activeHero.baseStats.hp = this.engine.hero.currentHp

    if (result.state === 'win') {
      setTimeout(() => { this.state = 'win' }, 700)
    } else if (result.state === 'lose') {
      setTimeout(() => { this.state = 'lose' }, 700)
    } else {
      setTimeout(() => { this.state = 'idle' }, 600)
    }
  }

  update(delta) {
    this.t += delta

    // 進場動畫
    if (this.state === 'intro') {
      if (this.t > 1.2) this.introDone = true
      if (this.t > 2.0) this.state = 'idle'
    }

    // 震動衰減
    if (this.shakeX > 0) {
      this.shakeX *= 0.75
      if (this.shakeX < 0.5) this.shakeX = 0
    }

    // 閃爍衰減
    if (this.enemyFlash > 0) this.enemyFlash -= delta * 2
    if (this.heroFlash > 0) this.heroFlash -= delta * 2
  }

  draw(ctx) {
    const W = this.canvas.width
    const H = this.canvas.height
    const shake = this.state === 'result' ? Math.sin(this.t * 60) * this.shakeX : 0

    ctx.save()
    ctx.translate(shake, 0)

    // ── 背景 ─────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0f0c29')
    bg.addColorStop(1, '#302b63')
    ctx.fillStyle = bg
    ctx.fillRect(-20, 0, W + 40, H)

    // 地面
    ctx.fillStyle = '#1a1040'
    ctx.fillRect(0, H * 0.65, W, H * 0.35)

    // ── Wave 標題 ─────────────────────────────────────────
    ctx.textAlign = 'center'
    ctx.fillStyle = this.wave === 15 ? '#ff4444' : '#f5c518'
    ctx.font = `bold 22px sans-serif`
    const waveLabel = this.wave === 15 ? '⚠️ BOSS WAVE 15 ⚠️' : `Wave ${this.wave} / 15`
    ctx.fillText(waveLabel, W / 2, 36)

    const eng = this.engine
    if (!eng) { ctx.restore(); return }

    // ── 敵人 ─────────────────────────────────────────────
    const ey = H * 0.3
    const eScale = this.state === 'intro' ? Math.min(1, this.t / 0.8) : 1
    ctx.save()
    ctx.translate(W * 0.65, ey)
    ctx.scale(eScale, eScale)
    if (this.enemyFlash > 0) {
      ctx.globalAlpha = 0.4 + this.enemyFlash * 0.6
    }
    ctx.font = `${this.wave === 15 ? 80 : 60}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(eng.enemy.emoji || '👹', 0, 0)
    ctx.globalAlpha = 1
    ctx.restore()

    // 敵人名稱
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(eng.enemy.nameZh, W * 0.65, ey + 48)

    // 敵人 HP 條
    this._drawHPBar(ctx, W * 0.38, ey + 60, W * 0.5, 14, eng.enemyHpPercent, '#e74c3c', '#922b21')

    // ── 英雄 ─────────────────────────────────────────────
    const hy = H * 0.58
    ctx.save()
    ctx.translate(W * 0.3, hy)
    if (this.heroFlash > 0) ctx.globalAlpha = 0.4 + this.heroFlash * 0.6
    ctx.font = '64px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.wave === 15 ? '🛡️' : '☕', 0, 0)
    ctx.globalAlpha = 1
    ctx.restore()

    // 英雄名稱
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.hm.activeHero.nameZh, W * 0.3, hy + 44)

    // 英雄 HP 條
    this._drawHPBar(ctx, W * 0.05, hy + 56, W * 0.5, 14, eng.heroHpPercent, '#27ae60', '#1e8449')

    // HP 數值
    ctx.fillStyle = '#ccc'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(
      `HP: ${Math.max(0, eng.hero.currentHp)} / ${eng.hero.maxHp}`,
      W * 0.05, hy + 84
    )

    // ── 被動標籤 ─────────────────────────────────────────
    const passives = this.hm.passives
    if (passives.length > 0) {
      ctx.fillStyle = '#9b59b6'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      const labels = { double_atk: '⚔️連擊', shield: '🛡️盾牆' }
      const txt = passives.map((p) => labels[p] || p).join('  ')
      ctx.fillText(txt, W * 0.05, hy + 100)
    }

    // ── 戰鬥日誌 ─────────────────────────────────────────
    const logY = H * 0.72
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    this._roundRect(ctx, W * 0.05, logY, W * 0.9, 80, 8)
    ctx.fill()
    ctx.fillStyle = '#ddd'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'left'
    this.logMessages.slice(0, 4).forEach((msg, i) => {
      ctx.fillText(msg, W * 0.08, logY + 18 + i * 17)
    })

    // ── 攻擊按鈕 / 狀態提示 ──────────────────────────────
    const btnY = H * 0.86
    if (this.state === 'idle') {
      this._drawButton(ctx, W / 2, btnY, 180, 44, '⚔️  攻擊！', '#e74c3c', '#c0392b')
    } else if (this.state === 'win') {
      const pulse = 0.85 + Math.sin(this.t * 4) * 0.15
      ctx.save()
      ctx.translate(W / 2, btnY)
      ctx.scale(pulse, pulse)
      this._drawButton(ctx, 0, 0, 220, 44, '✨ 下一關 →', '#27ae60', '#1e8449')
      ctx.restore()
    } else if (this.state === 'lose') {
      this._drawButton(ctx, W / 2, btnY, 200, 44, '💀 遊戲結束', '#555', '#333')
    } else if (this.state === 'intro') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('準備戰鬥！', W / 2, btnY + 16)
    }

    // 勝利/失敗大字
    if (this.state === 'win') {
      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle = '#f5c518'
      ctx.font = 'bold 52px sans-serif'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#f39c12'
      ctx.shadowBlur = 20
      ctx.fillText('勝利！', W / 2, H * 0.5)
      ctx.restore()
    }
    if (this.state === 'lose') {
      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle = '#e74c3c'
      ctx.font = 'bold 52px sans-serif'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#c0392b'
      ctx.shadowBlur = 20
      ctx.fillText('敗北...', W / 2, H * 0.5)
      ctx.restore()
    }

    ctx.restore()
  }

  // ── 工具方法 ────────────────────────────────────────────

  _drawHPBar(ctx, x, y, w, h, pct, colorFill, colorDark) {
    const p = Math.max(0, Math.min(1, pct))
    // 背景
    ctx.fillStyle = '#333'
    this._roundRect(ctx, x, y, w, h, h / 2)
    ctx.fill()
    // 填充
    if (p > 0) {
      ctx.fillStyle = p > 0.5 ? colorFill : p > 0.25 ? '#e67e22' : '#e74c3c'
      this._roundRect(ctx, x, y, w * p, h, h / 2)
      ctx.fill()
    }
    // 邊框
    ctx.strokeStyle = colorDark
    ctx.lineWidth = 1
    this._roundRect(ctx, x, y, w, h, h / 2)
    ctx.stroke()
  }

  _drawButton(ctx, cx, cy, w, h, label, colorTop, colorBot) {
    ctx.save()
    const x = cx - w / 2
    const y = cy - h / 2
    const grad = ctx.createLinearGradient(x, y, x, y + h)
    grad.addColorStop(0, colorTop)
    grad.addColorStop(1, colorBot)
    ctx.fillStyle = grad
    this._roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, cx, cy)
    ctx.textBaseline = 'alphabetic'
    ctx.restore()
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
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
