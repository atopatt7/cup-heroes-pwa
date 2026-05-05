// HomeScene.js — 遊戲大廳（全新設計，對應 Figma UI）
import { SaveManager }        from '../game/SaveManager.js'
import { CHAPTERS }           from '../data/chapters.js'
import { HEROES }             from '../data/heroes.js'
import { T }                  from '../utils/theme.js'
import { rrect }              from '../utils/drawHelpers.js'

const TOTAL_LEVELS = CHAPTERS.reduce((s, c) => s + c.waves.length, 0)

const TAB_CONFIG = [
  { id: 'shop',      label: '商店', icon: '🏪' },
  { id: 'equipment', label: '裝備', icon: '🛡️' },
  { id: 'battle',    label: '戰鬥', icon: '⚔️',  active: true },
  { id: 'hero',      label: '英雄', icon: '🦸' },
  { id: 'upgrade',   label: '升級', icon: '⬆️' },
]

const LEFT_ICONS = [
  { icon: '🏆', label: '收集\nEM ALL', badge: true },
  { icon: '🛡️', label: '祝福',      badge: true },
  { icon: '🎡', label: '輪盤賭',     badge: true },
]

const CHAPTER_THEMES = [
  { sky1: '#1a88d8', sky2: '#1060c0', ground1: '#5abf40', ground2: '#3a9020', dirt: '#a05820' },
  { sky1: '#3d6080', sky2: '#283a50', ground1: '#6a7060', ground2: '#4a5040', dirt: '#706050' },
  { sky1: '#3a1a7a', sky2: '#200a50', ground1: '#4a2090', ground2: '#300a60', dirt: '#503080' },
]

function levelToChapterWave(idx) {
  let rem = idx
  for (let c = 0; c < CHAPTERS.length; c++) {
    if (rem < CHAPTERS[c].waves.length) return { chapterIdx: c, waveIdx: rem }
    rem -= CHAPTERS[c].waves.length
  }
  return { chapterIdx: CHAPTERS.length - 1, waveIdx: CHAPTERS[CHAPTERS.length - 1].waves.length - 1 }
}

export class HomeScene {
  constructor(canvas, ctx, callbacks) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.callbacks = callbacks

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this._loop   = this._loop.bind(this)

    this.save           = SaveManager.load()
    this.viewLevel      = Math.min(this.save.unlockedLevelIdx ?? 0, TOTAL_LEVELS - 1)
    this.selectedHeroId = this.save.selectedHeroId || 'knight'
    this.activeTab      = 'battle'
    this._btnAreas      = {}

    this._clouds = [
      { x: 0.10, y: 0.16, scale: 0.90, speed: 0.008 },
      { x: 0.45, y: 0.12, scale: 1.10, speed: 0.006 },
      { x: 0.75, y: 0.20, scale: 0.75, speed: 0.010 },
    ]
  }

  start() {
    this.save           = SaveManager.load()
    this.viewLevel      = Math.min(this.save.unlockedLevelIdx ?? 0, TOTAL_LEVELS - 1)
    this.selectedHeroId = this.save.selectedHeroId || 'knight'
    this._onPointerDown = this._onPointerDown.bind(this)
    this.canvas.addEventListener('pointerdown', this._onPointerDown)
    this.animId = requestAnimationFrame(this._loop)
  }

  stop() {
    this.canvas.removeEventListener('pointerdown', this._onPointerDown)
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null }
  }

  _loop(ts) {
    const dt = Math.min((ts - this.lastTs) / 1000, 0.05)
    this.t     += dt
    this.lastTs = ts
    this._clouds.forEach(c => { c.x += c.speed * dt; if (c.x > 1.1) c.x = -0.15 })
    this._draw()
    this.animId = requestAnimationFrame(this._loop)
  }

  _onPointerDown(e) {
    e.preventDefault()
    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top)  * scaleY
    const A  = this._btnAreas

    if (A.arrowL && _hit(tx, ty, A.arrowL) && this.viewLevel > 0) { this.viewLevel--; return }
    if (A.arrowR && _hit(tx, ty, A.arrowR)) {
      const max = this.save.unlockedLevelIdx ?? 0
      if (this.viewLevel < max) { this.viewLevel++; return }
    }
    if (A.battleBtn && _hit(tx, ty, A.battleBtn)) {
      const { chapterIdx, waveIdx } = levelToChapterWave(this.viewLevel)
      this.stop()
      this.callbacks.onStartBattle(chapterIdx, waveIdx, this.selectedHeroId)
      return
    }
    for (const tab of TAB_CONFIG) {
      if (A[`tab_${tab.id}`] && _hit(tx, ty, A[`tab_${tab.id}`])) {
        if (tab.id === 'hero')      { this.stop(); this.callbacks.onHeroSelect?.() }
        else if (tab.id === 'shop') { this.callbacks.onShop?.() }
        else this.activeTab = tab.id
        return
      }
    }
  }

  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height
    const { chapterIdx } = levelToChapterWave(this.viewLevel)
    const theme = CHAPTER_THEMES[chapterIdx] || CHAPTER_THEMES[0]

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, theme.sky1)
    bg.addColorStop(1, theme.sky2)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.font = `${W * 0.22}px serif`
    ctx.textAlign = 'center'
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillStyle = '#fff'
        ctx.fillText('🛡️', W * (0.15 + col * 0.38), H * (0.18 + row * 0.26))
      }
    }
    ctx.restore()

    this._drawClouds(ctx, W, H)

    const TOP_H    = Math.round(H * 0.10)
    const BOT_NAV  = Math.round(H * 0.105)
    const BOT_ACT  = Math.round(H * 0.115)
    const LEFT_W   = Math.round(W * 0.138)
    const RIGHT_W  = Math.round(W * 0.168)
    const CENTER_W = W - LEFT_W - RIGHT_W

    this._drawTopBar(ctx, W, TOP_H)
    this._drawLeftSidebar(ctx, LEFT_W, TOP_H, H - TOP_H - BOT_ACT - BOT_NAV)
    this._drawRightSidebar(ctx, W - RIGHT_W, RIGHT_W, TOP_H, H - TOP_H - BOT_ACT - BOT_NAV)
    this._drawCenterContent(ctx, LEFT_W, CENTER_W, TOP_H, H - TOP_H - BOT_ACT - BOT_NAV, theme)
    this._drawBottomAction(ctx, W, H - BOT_ACT - BOT_NAV, BOT_ACT)
    this._drawBottomNav(ctx, W, H - BOT_NAV, BOT_NAV)
  }

  _drawClouds(ctx, W, H) {
    ctx.save()
    ctx.globalAlpha = 0.55
    this._clouds.forEach(c => {
      const cx = c.x * W, cy = c.y * H, r = W * 0.06 * c.scale
      ctx.fillStyle = '#fff'
      for (const [ox, oy, sr] of [[-r*0.6,r*0.3,r*0.7],[0,0,r],[r*0.65,r*0.2,r*0.75],[r*1.2,r*0.35,r*0.6]]) {
        ctx.beginPath(); ctx.arc(cx+ox, cy+oy, sr, 0, Math.PI*2); ctx.fill()
      }
    })
    ctx.restore()
  }

  _drawTopBar(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,20,60,0.72)'
    ctx.fillRect(0, 0, W, H)

    const save = this.save
    const level = save.playerLevel || 1
    const exp   = save.playerExp   || 0
    const gold  = save.gold        || 0
    const gems  = save.diamonds    || 0
    const expMax = level * 100
    const hero  = HEROES[this.selectedHeroId] || HEROES.knight

    const pad  = W * 0.035
    const midY = H * 0.5
    const avR  = H * 0.38
    const avCX = pad + avR

    ctx.save()
    ctx.beginPath(); ctx.arc(avCX, midY, avR, 0, Math.PI * 2)
    ctx.fillStyle = '#1a4080'; ctx.fill()
    ctx.strokeStyle = '#4aa8ff'; ctx.lineWidth = 2; ctx.stroke()
    ctx.font = `${avR * 1.2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(hero.emoji || '⚔️', avCX, midY + avR * 0.05)
    ctx.restore()

    const scoreX = avCX + avR + pad * 0.8
    ctx.fillStyle = '#fff'; ctx.font = `bold ${H * 0.28}px sans-serif`
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText(_fmt(save.score || 0), scoreX, midY - H * 0.04)

    const barW = W * 0.175, barH = H * 0.14, barY = midY + H * 0.06
    const xpPct = Math.min(1, exp / expMax)
    ctx.fillStyle = '#0a2050'
    rrect(ctx, scoreX, barY, barW, barH, barH/2); ctx.fill()
    if (xpPct > 0) {
      ctx.fillStyle = '#22dd66'
      rrect(ctx, scoreX, barY, Math.max(barH, barW * xpPct), barH, barH/2); ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `${barH * 0.8}px sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(`  ${level}`, scoreX, barY + barH - 1)

    const cx = W * 0.52
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#a8e8ff'; ctx.font = `bold ${H * 0.27}px sans-serif`
    ctx.fillText(`💎 ${_fmt(gems)}`, cx - W * 0.02, midY - H * 0.02)
    ctx.fillStyle = '#ffe066'
    ctx.fillText(`🪙 ${_fmt(gold)}`, cx - W * 0.02, midY + H * 0.30)

    const btnW = H * 0.65, btnH2 = H * 0.65
    const btnX = W - pad - btnW, btnY = midY - btnH2 / 2
    ctx.fillStyle = T.gold
    rrect(ctx, btnX, btnY, btnW, btnH2, 6); ctx.fill()
    ctx.fillStyle = '#333'; ctx.font = `bold ${btnH2 * 0.55}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('☰', btnX + btnW / 2, btnY + btnH2 / 2 + 1)
    ctx.textBaseline = 'alphabetic'
  }

  _drawLeftSidebar(ctx, W, y0, H) {
    const slotH = H / LEFT_ICONS.length
    LEFT_ICONS.forEach((item, i) => {
      const cy = y0 + slotH * i + slotH * 0.5
      const cx = W * 0.5
      const bW = W * 0.75, bH = slotH * 0.72
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      rrect(ctx, cx - bW/2, cy - bH/2, bW, bH, 8); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1
      rrect(ctx, cx - bW/2, cy - bH/2, bW, bH, 8); ctx.stroke()

      ctx.font = `${bH * 0.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(item.icon, cx, cy - bH * 0.08)

      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `${bH * 0.16}px sans-serif`
      ctx.textBaseline = 'alphabetic'
      const parts = item.label.split('\n')
      ctx.fillText(parts[0], cx, cy + bH * 0.28)
      if (parts[1]) ctx.fillText(parts[1], cx, cy + bH * 0.44)

      if (item.badge) {
        const bx = cx + bW/2 - 4, by = cy - bH/2 - 2
        ctx.fillStyle = '#e82020'
        rrect(ctx, bx - 8, by, 16, 14, 7); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = `bold ${14 * 0.65}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('!', bx, by + 7)
      }
    })
  }

  _drawRightSidebar(ctx, x0, W, y0, H) {
    const events = [
      { label: '7天活動', timer: '9d 17h', emoji: '🌟', bg: '#c8a000' },
      { label: '英雄活動', timer: '2d 9h',  emoji: '🦸', bg: '#1a8030' },
    ]
    const slotH = H / events.length
    events.forEach((ev, i) => {
      const sy = y0 + slotH * i + slotH * 0.12
      const sh = slotH * 0.76
      const sx = x0 + W * 0.06
      ctx.fillStyle = ev.bg + 'cc'
      rrect(ctx, sx, sy, W * 0.88, sh, 8); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1
      rrect(ctx, sx, sy, W * 0.88, sh, 8); ctx.stroke()
      const cx = sx + W * 0.44
      ctx.font = `${sh * 0.36}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(ev.emoji, cx, sy + sh * 0.32)
      ctx.fillStyle = '#fff'; ctx.font = `bold ${sh * 0.175}px sans-serif`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(ev.label, cx, sy + sh * 0.66)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `${sh * 0.15}px sans-serif`
      ctx.fillText(ev.timer, cx, sy + sh * 0.86)
      ctx.fillStyle = '#e82020'
      rrect(ctx, sx + W * 0.88 - 8, sy - 4, 16, 14, 7); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('!', sx + W * 0.88, sy + 3)
    })
  }

  _drawCenterContent(ctx, x0, W, y0, H, theme) {
    const { chapterIdx, waveIdx } = levelToChapterWave(this.viewLevel)
    const chapter  = CHAPTERS[chapterIdx]
    const waveData = chapter.waves[waveIdx]
    const cx       = x0 + W / 2

    const titleY = y0 + H * 0.1
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = `bold ${W * 0.1}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
    ctx.fillText(`章節 ${chapterIdx + 1}`, cx, titleY)

    const nameY = titleY + H * 0.1
    ctx.fillStyle = '#fff'; ctx.font = `bold ${W * 0.14}px sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8
    ctx.fillText(chapter.nameZh, cx, nameY)
    ctx.shadowBlur = 0

    const diff  = waveData.isBoss ? 'BOSS 關' : `波次 ${waveIdx + 1}`
    const difBg = waveData.isBoss ? '#8800cc' : '#1a6aaa'
    const dbY   = nameY + H * 0.04
    const dbW   = W * 0.42, dbH = H * 0.058
    ctx.fillStyle = difBg
    rrect(ctx, cx - dbW/2, dbY, dbW, dbH, dbH/2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold ${dbH * 0.58}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(diff, cx, dbY + dbH/2)
    ctx.textBaseline = 'alphabetic'

    const islandCY = y0 + H * 0.56
    const islandW  = W * 0.78
    const islandH  = H * 0.14
    const islandX  = cx - islandW / 2

    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    rrect(ctx, islandX + islandW*0.1, islandCY + islandH*0.55, islandW*0.8, islandH*0.5, islandH*0.25)
    ctx.fill()

    const stoneGrad = ctx.createLinearGradient(cx, islandCY, cx, islandCY + islandH)
    stoneGrad.addColorStop(0, theme.dirt)
    stoneGrad.addColorStop(1, '#3a2010')
    ctx.fillStyle = stoneGrad
    ctx.beginPath()
    ctx.moveTo(islandX + islandW*0.08, islandCY + islandH*0.3)
    ctx.lineTo(islandX + islandW*0.92, islandCY + islandH*0.3)
    ctx.lineTo(islandX + islandW*0.62, islandCY + islandH)
    ctx.lineTo(islandX + islandW*0.38, islandCY + islandH)
    ctx.closePath(); ctx.fill()

    const groundGrad = ctx.createLinearGradient(cx, islandCY - islandH*0.35, cx, islandCY + islandH*0.35)
    groundGrad.addColorStop(0, theme.ground1)
    groundGrad.addColorStop(1, theme.ground2)
    ctx.fillStyle = groundGrad
    rrect(ctx, islandX, islandCY - islandH*0.35, islandW, islandH*0.65, islandH*0.15)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rrect(ctx, islandX, islandCY - islandH*0.35, islandW, islandH*0.12, islandH*0.15)
    ctx.fill()

    const treeY   = islandCY - islandH * 0.5
    const treeSize = H * 0.075
    ctx.font = `${treeSize}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
    ;[-0.28, -0.08, 0.12, 0.30].forEach(off => ctx.fillText('🌲', cx + islandW*off, treeY))

    const hero     = HEROES[this.selectedHeroId] || HEROES.knight
    const heroSize = H * 0.085
    const heroBob  = Math.sin(this.t * 2.2) * H * 0.008
    ctx.font = `${heroSize}px serif`
    ctx.fillText(hero.emoji || '⚔️', cx, islandCY - islandH*0.2 + heroBob)

    const arrY = islandCY - islandH * 0.1
    const arrH = H * 0.07, arrW = W * 0.08
    const canL = this.viewLevel > 0
    const canR = this.viewLevel < (this.save.unlockedLevelIdx ?? 0)

    ctx.globalAlpha = canL ? 0.9 : 0.25
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    rrect(ctx, islandX - arrW - W*0.02, arrY, arrW, arrH, arrH/2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `${arrH * 0.7}px sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText('‹', islandX - arrW/2 - W*0.02, arrY + arrH/2)
    this._btnAreas.arrowL = { x: islandX - arrW - W*0.02, y: arrY, w: arrW, h: arrH }

    ctx.globalAlpha = canR ? 0.9 : 0.25
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    rrect(ctx, islandX + islandW + W*0.02, arrY, arrW, arrH, arrH/2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText('›', islandX + islandW + arrW/2 + W*0.02, arrY + arrH/2)
    this._btnAreas.arrowR = { x: islandX + islandW + W*0.02, y: arrY, w: arrW, h: arrH }
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic'

    this._drawChestStrip(ctx, x0, W, y0, H, chapterIdx, waveIdx)
  }

  _drawChestStrip(ctx, x0, W, y0, H, chapterIdx, waveIdx) {
    const stripY = y0 + H * 0.76
    const stripH = H * 0.20
    const cx     = x0 + W / 2
    const chapter    = CHAPTERS[chapterIdx]
    const totalWaves = chapter.waves.length
    const baseUnlocked = CHAPTERS.slice(0, chapterIdx).reduce((s, c) => s + c.waves.length, 0)
    const unlockedWave = (chapterIdx === levelToChapterWave(this.viewLevel).chapterIdx)
      ? (this.save.unlockedLevelIdx ?? 0) - baseUnlocked
      : totalWaves

    const milestones = [
      { wave: Math.floor(totalWaves * 0.4) - 1, label: '波次 ' + Math.floor(totalWaves * 0.4) },
      { wave: Math.floor(totalWaves * 0.7) - 1, label: '波次 ' + Math.floor(totalWaves * 0.7) },
      { wave: totalWaves - 1,                    label: 'BOSS' },
    ]
    const slotW  = W / 3.5
    const startX = cx - slotW

    milestones.forEach((ms, i) => {
      const sx      = startX + i * slotW
      const cleared = unlockedWave > ms.wave
      const current = !cleared && unlockedWave === ms.wave

      ctx.font = `${stripH * 0.52}px serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
      ctx.globalAlpha = cleared ? 1.0 : current ? 0.85 : 0.45
      ctx.fillText(i === 2 ? '👑' : cleared ? '🎁' : '📦', sx, stripY + stripH * 0.7)
      ctx.globalAlpha = 1

      ctx.fillStyle = cleared ? '#ffd700' : 'rgba(255,255,255,0.65)'
      ctx.font = `${stripH * 0.17}px sans-serif`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(ms.label, sx, stripY + stripH * 0.92)
    })

    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(startX - slotW * 0.35, stripY + stripH * 0.35)
    ctx.lineTo(startX + slotW * 2.35, stripY + stripH * 0.35)
    ctx.stroke()
    ctx.setLineDash([])
  }

  _drawBottomAction(ctx, W, y0, H) {
    const bg = ctx.createLinearGradient(0, y0, 0, y0 + H)
    bg.addColorStop(0,   'rgba(0,10,40,0.0)')
    bg.addColorStop(0.3, 'rgba(0,10,40,0.75)')
    bg.addColorStop(1,   'rgba(0,10,40,0.9)')
    ctx.fillStyle = bg; ctx.fillRect(0, y0, W, H)

    const pad  = W * 0.03
    const btnH = H * 0.72
    const btnY = y0 + (H - btnH) / 2

    // Season pass card
    const ticketW = W * 0.20, ticketH = btnH
    ctx.fillStyle = '#7a4510'
    rrect(ctx, pad, btnY, ticketW, ticketH, 10); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `bold ${ticketH * 0.28}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🎟️', pad + ticketW / 2, btnY + ticketH * 0.32)
    ctx.font = `bold ${ticketH * 0.18}px sans-serif`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('季票', pad + ticketW / 2, btnY + ticketH * 0.62)
    const xpPct = Math.min(1, (this.save.seasonXP || 650) / (this.save.seasonMax || 950))
    ctx.fillStyle = '#2a1000'
    rrect(ctx, pad + 4, btnY + ticketH * 0.72, ticketW - 8, ticketH * 0.14, 4); ctx.fill()
    ctx.fillStyle = '#ffd060'
    rrect(ctx, pad + 4, btnY + ticketH * 0.72, Math.max(8, (ticketW - 8) * xpPct), ticketH * 0.14, 4); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = `${ticketH * 0.13}px sans-serif`
    ctx.fillText('650/950 XP', pad + ticketW / 2, btnY + ticketH * 0.94)

    // Right mini buttons
    const rBtnW = W * 0.195, rBtnH = (btnH - 6) / 2
    const rBtnX = W - pad - rBtnW
    ctx.fillStyle = '#6010aa'
    rrect(ctx, rBtnX, btnY, rBtnW, rBtnH, 8); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `${rBtnH * 0.36}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🏆 活動', rBtnX + rBtnW/2, btnY + rBtnH/2)

    ctx.fillStyle = T.gold
    rrect(ctx, rBtnX, btnY + rBtnH + 6, rBtnW, rBtnH, 8); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.fillText('🛡️ 公會', rBtnX + rBtnW/2, btnY + rBtnH + 6 + rBtnH/2)
    ctx.textBaseline = 'alphabetic'

    // Gold battle button
    const battleX = pad + ticketW + W * 0.025
    const battleW = rBtnX - battleX - W * 0.025
    const pulse   = 1 + Math.sin(this.t * 2.8) * 0.018

    ctx.save()
    ctx.translate(battleX + battleW/2, btnY + btnH/2)
    ctx.scale(pulse, pulse)

    const glow = ctx.createRadialGradient(0, 0, battleW * 0.1, 0, 0, battleW * 0.65)
    glow.addColorStop(0, 'rgba(255,210,0,0.35)')
    glow.addColorStop(1, 'rgba(255,210,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(-battleW * 0.7, -btnH * 0.8, battleW * 1.4, btnH * 1.6)

    const bGrad = ctx.createLinearGradient(-battleW/2, -btnH/2, -battleW/2, btnH/2)
    bGrad.addColorStop(0,    '#ffd020')
    bGrad.addColorStop(0.45, '#e8b800')
    bGrad.addColorStop(1,    '#b88000')
    ctx.fillStyle = bGrad
    rrect(ctx, -battleW/2, -btnH/2, battleW, btnH, 14); ctx.fill()

    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    rrect(ctx, -battleW/2 + 3, -btnH/2 + 3, battleW - 6, btnH * 0.45, 10); ctx.fill()

    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5
    rrect(ctx, -battleW/2, -btnH/2, battleW, btnH, 14); ctx.stroke()

    ctx.fillStyle = '#1a0e00'; ctx.font = `bold ${btnH * 0.42}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255,200,0,0.4)'; ctx.shadowBlur = 6
    ctx.fillText('戰鬥', 0, 2)
    ctx.shadowBlur = 0
    ctx.restore()

    this._btnAreas.battleBtn = { x: battleX, y: btnY, w: battleW, h: btnH }
  }

  _drawBottomNav(ctx, W, y0, H) {
    ctx.fillStyle = 'rgba(5,15,45,0.96)'
    ctx.fillRect(0, y0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke()

    const tabW = W / TAB_CONFIG.length

    TAB_CONFIG.forEach((tab, i) => {
      const tx       = i * tabW
      const isBattle = tab.id === 'battle'

      if (isBattle) {
        ctx.fillStyle = T.gold
        ctx.fillRect(tx, y0, tabW, H)
      } else if (this.activeTab === tab.id) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.fillRect(tx, y0, tabW, H)
        ctx.fillStyle = '#4fc3f7'
        ctx.fillRect(tx + tabW * 0.2, y0, tabW * 0.6, 3)
      }

      const iconY  = y0 + H * 0.37
      const labelY = y0 + H * 0.76
      ctx.font = `${H * 0.33}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(tab.icon, tx + tabW / 2, iconY)

      ctx.font = `${isBattle ? 'bold ' : ''}${H * 0.20}px sans-serif`
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = isBattle ? '#1a0e00' : this.activeTab === tab.id ? '#4fc3f7' : 'rgba(255,255,255,0.55)'
      ctx.fillText(tab.label, tx + tabW / 2, labelY)

      if (i > 0 && !isBattle && TAB_CONFIG[i-1].id !== 'battle') {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(tx, y0 + H * 0.18); ctx.lineTo(tx, y0 + H * 0.82); ctx.stroke()
      }

      if (['shop', 'equipment', 'upgrade'].includes(tab.id)) {
        ctx.fillStyle = '#e82020'
        rrect(ctx, tx + tabW * 0.65, y0 + H * 0.06, 14, 12, 6); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('!', tx + tabW * 0.65 + 7, y0 + H * 0.06 + 6)
      }

      this._btnAreas[`tab_${tab.id}`] = { x: tx, y: y0, w: tabW, h: H }
    })
  }
}

function _hit(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function _fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
