// HomeScene.js — 主頁面（遊戲大廳）
// 佈局：
//  ┌──────────────────────────┐
//  │ 等級 / 經驗  |  金幣/鑽石│  ← topBar
//  ├──────────────────────────┤
//  │                          │
//  │  ←  [關卡卡片]  →        │  ← levelArea（中央大塊）
//  │      [開始挑戰]           │
//  │                          │
//  ├──────────────────────────┤
//  │  商店  裝備  英雄  升級   │  ← bottomTabs
//  └──────────────────────────┘

import { SaveManager }   from '../game/SaveManager.js'
import { CHAPTERS, ENEMY_TYPES } from '../data/chapters.js'
import { HEROES }        from '../data/heroes.js'
import { T }             from '../utils/theme.js'
import { rrect }         from '../utils/drawHelpers.js'

// 關卡總數
const TOTAL_LEVELS = CHAPTERS.reduce((s, c) => s + c.waves.length, 0)  // 12

function levelToChapterWave(idx) {
  let remaining = idx
  for (let c = 0; c < CHAPTERS.length; c++) {
    if (remaining < CHAPTERS[c].waves.length) return { chapterIdx: c, waveIdx: remaining }
    remaining -= CHAPTERS[c].waves.length
  }
  return { chapterIdx: CHAPTERS.length - 1, waveIdx: CHAPTERS[CHAPTERS.length - 1].waves.length - 1 }
}

const TAB_CONFIG = [
  { id: 'shop',      label: '商店', icon: '🏪' },
  { id: 'equipment', label: '裝備', icon: '⚔️' },
  { id: 'hero',      label: '英雄', icon: '🦸' },
  { id: 'upgrade',   label: '升級', icon: '⬆️' },
]

// 章節主題色
const CHAPTER_COLORS = ['#2e7d32', '#455a64', '#4a148c']
const CHAPTER_BG     = ['#1b3a1b', '#1a2530', '#1a0a2e']

export class HomeScene {
  constructor(canvas, ctx, callbacks) {
    // callbacks: { onStartBattle(chapterIdx, waveIdx, heroId), onHeroSelect, onShop, onEquipment, onUpgrade }
    this.canvas    = canvas
    this.ctx       = ctx
    this.callbacks = callbacks

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this._loop   = this._loop.bind(this)

    // 讀取存檔
    this.save = SaveManager.load()
    const unlockedIdx = this.save.unlockedLevelIdx ?? 0
    this.viewLevel = Math.min(unlockedIdx, TOTAL_LEVELS - 1)  // 目前顯示的關卡索引

    // 當前英雄
    this.selectedHeroId = this.save.selectedHeroId || 'knight'

    // 底部 tab 狀態
    this.activeTab = 'level'  // 'level' | 'shop' | 'equipment' | 'hero' | 'upgrade'

    // 按鈕區域（繪製後設定）
    this._btnAreas = {}

    // 動畫用
    this.cardSlide  = 0      // 0~1 卡片切換動畫
    this.slideDir   = 0      // -1 or +1
  }

  start() {
    this.save = SaveManager.load()
    const unlockedIdx = this.save.unlockedLevelIdx ?? 0
    this.viewLevel = Math.min(unlockedIdx, TOTAL_LEVELS - 1)
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
    this.t      += dt
    this.lastTs  = ts
    this._draw()
    this.animId  = requestAnimationFrame(this._loop)
  }

  // ── 點擊處理 ─────────────────────────────────────────────
  _onPointerDown(e) {
    e.preventDefault()
    const rect   = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width  / rect.width
    const scaleY = this.canvas.height / rect.height
    const tx = (e.clientX - rect.left) * scaleX
    const ty = (e.clientY - rect.top)  * scaleY

    const areas = this._btnAreas

    // 左箭頭
    if (areas.arrowL && _inRect(tx, ty, areas.arrowL)) {
      if (this.viewLevel > 0) { this.viewLevel--; this.slideDir = -1 }
    }
    // 右箭頭
    else if (areas.arrowR && _inRect(tx, ty, areas.arrowR)) {
      const maxLevel = this.save.unlockedLevelIdx ?? 0
      if (this.viewLevel < maxLevel) { this.viewLevel++; this.slideDir = 1 }
    }
    // 開始挑戰
    else if (areas.startBtn && _inRect(tx, ty, areas.startBtn)) {
      const { chapterIdx, waveIdx } = levelToChapterWave(this.viewLevel)
      this.stop()
      this.callbacks.onStartBattle(chapterIdx, waveIdx, this.selectedHeroId)
    }
    // 底部 Tab
    else {
      for (const tab of TAB_CONFIG) {
        if (areas[`tab_${tab.id}`] && _inRect(tx, ty, areas[`tab_${tab.id}`])) {
          if (tab.id === 'hero') {
            this.stop()
            this.callbacks.onHeroSelect?.()
          } else {
            this.activeTab = tab.id
          }
          break
        }
      }
    }
  }

  // ── 繪圖 ─────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // ── 全屏背景 ─────────────────────────────────────────
    const { chapterIdx } = levelToChapterWave(this.viewLevel)
    const bgC = CHAPTER_BG[chapterIdx] || '#0d1020'
    ctx.fillStyle = bgC
    ctx.fillRect(0, 0, W, H)

    // ── 頂部狀態列 ───────────────────────────────────────
    this._drawTopBar(ctx, W)

    // ── 中央關卡選擇區 ──────────────────────────────────
    const topBarH = 100
    const botTabH = 88
    const levelAreaY = topBarH
    const levelAreaH = H - topBarH - botTabH
    this._drawLevelArea(ctx, W, levelAreaY, levelAreaH)

    // ── 底部 Tab ─────────────────────────────────────────
    this._drawBottomTabs(ctx, W, H, botTabH)
  }

  _drawTopBar(ctx, W) {
    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, 100)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(W, 100); ctx.stroke()

    const save = this.save
    const playerLevel = save.playerLevel || 1
    const playerExp   = save.playerExp   || 0
    const expNeeded   = playerLevel * 100
    const gold        = save.gold     || 0
    const diamonds    = save.diamonds || 0

    // 頭像框
    const avatarX = 20, avatarY = 12, avatarSize = 52
    ctx.fillStyle = '#1a3060'
    rrect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10); ctx.fill()
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 2
    rrect(ctx, avatarX, avatarY, avatarSize, avatarSize, 10); ctx.stroke()
    const hero = HEROES[this.selectedHeroId] || HEROES.knight
    ctx.font = '28px serif'; ctx.textAlign = 'center'
    ctx.fillText(hero.emoji || '⚔️', avatarX + avatarSize / 2, avatarY + avatarSize * 0.72)

    // 等級 / 經驗
    ctx.textAlign  = 'left'
    ctx.fillStyle  = '#fff'
    ctx.font       = 'bold 15px sans-serif'
    ctx.fillText(`等級：${playerLevel}`, avatarX + avatarSize + 10, avatarY + 20)

    // 經驗條
    const expBarX = avatarX + avatarSize + 10
    const expBarY = avatarY + 26
    const expBarW = 100
    const expPct  = Math.min(1, playerExp / expNeeded)
    ctx.fillStyle = '#1a3060'
    rrect(ctx, expBarX, expBarY, expBarW, 12, 6); ctx.fill()
    if (expPct > 0) {
      ctx.fillStyle = '#4fc3f7'
      rrect(ctx, expBarX, expBarY, Math.max(10, expBarW * expPct), 12, 6); ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${playerExp}/${expNeeded}`, expBarX + expBarW / 2, expBarY + 9)

    // 右側：金幣 / 鑽石
    const rightX = W - 16
    ctx.textAlign = 'right'
    // 金幣
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`🪙  ${_fmt(gold)}`, rightX, avatarY + 22)
    // 鑽石
    ctx.fillStyle = '#a5d6ff'
    ctx.fillText(`💎  ${_fmt(diamonds)}`, rightX, avatarY + 46)

    // 英雄名字
    ctx.textAlign = 'left'
    ctx.fillStyle = hero.color || '#4fc3f7'
    ctx.font      = '11px sans-serif'
    ctx.fillText(hero.nameZh || hero.name, avatarX + avatarSize + 10, avatarY + 52)

    // 牌組卡數
    const deck = this.save.heroDeck?.[this.selectedHeroId] || []
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font      = '10px sans-serif'
    ctx.fillText(`牌組：${deck.length} 張`, avatarX + avatarSize + 10, avatarY + 66)
  }

  _drawLevelArea(ctx, W, areaY, areaH) {
    const { chapterIdx, waveIdx } = levelToChapterWave(this.viewLevel)
    const chapter   = CHAPTERS[chapterIdx]
    const waveData  = chapter.waves[waveIdx]
    const themeCol  = CHAPTER_COLORS[chapterIdx] || '#2e7d32'
    const unlockedIdx = this.save.unlockedLevelIdx ?? 0
    const isCleared = this.viewLevel < unlockedIdx
    const isLatest  = this.viewLevel === unlockedIdx
    const isFuture  = this.viewLevel > unlockedIdx

    // ── 箭頭區 ───────────────────────────────────────────
    const arrowW = 44, arrowH = 80
    const arrowY = areaY + areaH / 2 - arrowH / 2
    const cardX  = 54, cardW = W - 108
    const cardY  = areaY + 20, cardH = areaH - 50

    // 左箭頭
    const canLeft  = this.viewLevel > 0
    ctx.globalAlpha = canLeft ? 1 : 0.25
    this._drawArrow(ctx, 10, arrowY, arrowW, arrowH, 'left')
    this._btnAreas.arrowL = { x: 6, y: arrowY, w: arrowW + 4, h: arrowH }

    // 右箭頭
    const canRight = this.viewLevel < (unlockedIdx)
    ctx.globalAlpha = canRight ? 1 : 0.25
    this._drawArrow(ctx, W - 10 - arrowW, arrowY, arrowW, arrowH, 'right')
    this._btnAreas.arrowR = { x: W - 10 - arrowW - 4, y: arrowY, w: arrowW + 4, h: arrowH }
    ctx.globalAlpha = 1

    // ── 關卡卡片 ─────────────────────────────────────────
    // 卡片陰影
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    rrect(ctx, cardX + 5, cardY + 6, cardW, cardH, 20); ctx.fill()

    // 卡片背景
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
    cardGrad.addColorStop(0, _lighten(themeCol, -20))
    cardGrad.addColorStop(1, _lighten(themeCol, -50))
    ctx.fillStyle = cardGrad
    rrect(ctx, cardX, cardY, cardW, cardH, 20); ctx.fill()

    // 卡片邊框
    ctx.strokeStyle = themeCol + 'aa'; ctx.lineWidth = 2
    rrect(ctx, cardX, cardY, cardW, cardH, 20); ctx.stroke()

    // ── 卡片頂部章節橫幅 ─────────────────────────────────
    const bannerH = 48
    ctx.fillStyle = themeCol
    rrect(ctx, cardX, cardY, cardW, bannerH, 20); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(cardX, cardY + bannerH - 8, cardW, 8)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font      = 'bold 17px sans-serif'
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6
    ctx.fillText(`第 ${chapterIdx + 1} 章  ·  ${chapter.nameZh}`, cardX + cardW / 2, cardY + 20)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '13px sans-serif'
    ctx.fillText(`波次 ${waveIdx + 1}${waveData.isBoss ? '  👑 BOSS 關' : ''}`, cardX + cardW / 2, cardY + 38)

    // ── 星星評分 ─────────────────────────────────────────
    const starY = cardY + bannerH + 22
    const stars = isCleared ? 3 : isLatest ? 0 : 0
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = s < stars ? '#ffd700' : 'rgba(255,255,255,0.2)'
      ctx.font = '22px serif'
      ctx.fillText('★', cardX + cardW / 2 - 26 + s * 26, starY)
    }

    // ── 敵人預覽 ─────────────────────────────────────────
    const enemyY = starY + 16
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px sans-serif'
    ctx.fillText('本波敵人', cardX + cardW / 2, enemyY)

    let enemyDrawX = cardX + cardW / 2 - (waveData.enemies.length - 1) * 38
    for (const spec of waveData.enemies) {
      const et = ENEMY_TYPES[spec.type]
      if (!et) continue
      ctx.font = '28px serif'
      ctx.fillText(et.emoji || '👾', enemyDrawX, enemyY + 44)
      ctx.font = '10px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(`×${spec.count}`, enemyDrawX, enemyY + 60)
      enemyDrawX += 76
    }

    // ── 關卡狀態 ─────────────────────────────────────────
    const statusY = enemyY + 76
    if (isCleared) {
      ctx.fillStyle = '#a5f7a5'; ctx.font = 'bold 14px sans-serif'
      ctx.fillText('✓ 已通關', cardX + cardW / 2, statusY)
    } else if (isLatest) {
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px sans-serif'
      ctx.fillText('► 最新關卡', cardX + cardW / 2, statusY)
    }

    // ── 開始挑戰按鈕 ────────────────────────────────────
    const btnW = cardW * 0.68, btnH = 52
    const btnX = cardX + (cardW - btnW) / 2
    const btnY = cardY + cardH - btnH - 18

    const pulse = 0.97 + Math.sin(this.t * 3.0) * 0.03
    ctx.save()
    ctx.translate(btnX + btnW / 2, btnY + btnH / 2)
    ctx.scale(pulse, pulse)

    const btnGrad = ctx.createLinearGradient(-btnW/2, -btnH/2, -btnW/2, btnH/2)
    btnGrad.addColorStop(0, '#e53935')
    btnGrad.addColorStop(1, '#b71c1c')
    ctx.fillStyle = btnGrad
    rrect(ctx, -btnW/2, -btnH/2, btnW, btnH, 14); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    rrect(ctx, -btnW/2 + 3, -btnH/2 + 3, btnW - 6, btnH/2 - 3, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5
    rrect(ctx, -btnW/2, -btnH/2, btnW, btnH, 14); ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('⚔️  開始挑戰', 0, 1)
    ctx.textBaseline = 'alphabetic'
    ctx.restore()

    this._btnAreas.startBtn = { x: btnX, y: btnY, w: btnW, h: btnH }

    // ── 關卡索引指示點 ───────────────────────────────────
    const dotY = cardY + cardH + 12
    const maxShow = Math.min(TOTAL_LEVELS, 12)
    const dotX0 = W / 2 - (maxShow - 1) * 7
    for (let d = 0; d < maxShow; d++) {
      ctx.fillStyle = d === this.viewLevel ? '#ffd700' : 'rgba(255,255,255,0.25)'
      ctx.beginPath(); ctx.arc(dotX0 + d * 14, dotY, d === this.viewLevel ? 5 : 3, 0, Math.PI * 2); ctx.fill()
    }
  }

  _drawArrow(ctx, x, y, w, h, dir) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rrect(ctx, x, y, w, h, 10); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5
    rrect(ctx, x, y, w, h, 10); ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(dir === 'left' ? '‹' : '›', x + w / 2, y + h / 2 + 8)
  }

  _drawBottomTabs(ctx, W, H, tabH) {
    const tabY = H - tabH
    const tabW = W / TAB_CONFIG.length

    // Tab 背景
    ctx.fillStyle = 'rgba(0,0,0,0.72)'
    ctx.fillRect(0, tabY, W, tabH)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, tabY); ctx.lineTo(W, tabY); ctx.stroke()

    TAB_CONFIG.forEach((tab, i) => {
      const tx = i * tabW
      const isActive = this.activeTab === tab.id

      // 活躍高光
      if (isActive) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(tx, tabY, tabW, tabH)
        ctx.fillStyle = '#4fc3f7'
        ctx.fillRect(tx + tabW * 0.15, tabY, tabW * 0.7, 3)
      }

      // Icon
      ctx.font = '22px serif'; ctx.textAlign = 'center'
      ctx.fillText(tab.icon, tx + tabW / 2, tabY + 30)

      // 文字
      ctx.fillStyle = isActive ? '#4fc3f7' : 'rgba(255,255,255,0.55)'
      ctx.font      = isActive ? 'bold 12px sans-serif' : '12px sans-serif'
      ctx.fillText(tab.label, tx + tabW / 2, tabY + 52)

      // 分隔線
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(tx, tabY + 12); ctx.lineTo(tx, tabY + tabH - 12); ctx.stroke()
      }

      this._btnAreas[`tab_${tab.id}`] = { x: tx, y: tabY, w: tabW, h: tabH }
    })

    // Tab 面板（非 level 時顯示佔位）
    if (this.activeTab !== 'level') {
      this._drawTabPanel(ctx, W, H - tabH - 100, tabH)
    }
  }

  _drawTabPanel(ctx, W, areaH, tabH) {
    const labels = {
      shop:      '🏪 商店  （即將推出）',
      equipment: '⚔️ 裝備  （即將推出）',
      upgrade:   '⬆️ 升級  （即將推出）',
    }
    ctx.fillStyle = 'rgba(0,0,10,0.7)'
    ctx.fillRect(0, 100, W, areaH)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font      = '18px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(labels[this.activeTab] || '', W / 2, 100 + areaH / 2)
  }
}

// ── 工具 ──────────────────────────────────────────────────
function _inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function _fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function _lighten(hex, amt) {
  const clamp = v => Math.max(0, Math.min(255, v))
  const n = parseInt(hex.replace('#', ''), 16)
  const r = clamp(((n >> 16) & 0xff) + amt)
  const g = clamp(((n >> 8)  & 0xff) + amt)
  const b = clamp(((n)       & 0xff) + amt)
  return `rgb(${r},${g},${b})`
}
