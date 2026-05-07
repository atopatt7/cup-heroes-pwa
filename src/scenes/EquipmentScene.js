// EquipmentScene.js — 裝備介面
import { T }                     from '../utils/theme.js'
import { rrect, drawBtn }        from '../utils/drawHelpers.js'
import { SaveManager }           from '../game/SaveManager.js'
import { SpriteManager }         from '../game/SpriteManager.js'
import { defaultEquipmentSave, getEffectiveLevel, SLOT_NAME } from '../game/EquipmentManager.js'
import { EQUIPMENT_SETS }        from '../data/equipment/equipment.js'
import { getRarity, RARITY_ORDER } from '../data/equipment/rarity.js'

// ── 欄位佈局（相對於 390×844 畫布）────────────────────────
function _buildSlots(W) {
  const sz = 66
  const cx = (W - sz) / 2
  return [
    { slot: 'helmet', nameZh: '頭盔', x: cx,      y: 88  },
    { slot: 'armor',  nameZh: '上衣', x: 12,      y: 220 },
    { slot: 'weapon', nameZh: '武器', x: W-12-sz, y: 220 },
    { slot: 'gloves', nameZh: '手套', x: 12,      y: 358 },
    { slot: 'pants',  nameZh: '褲子', x: W-12-sz, y: 358 },
    { slot: 'boots',  nameZh: '鞋子', x: cx,      y: 490 },
  ]
}

export class EquipmentScene {
  constructor(canvas, ctx, gameState, onBack) {
    this.canvas    = canvas
    this.ctx       = ctx
    this.gameState = gameState
    this.onBack    = onBack

    this.animId  = null
    this.t       = 0
    this.lastTs  = 0
    this._loop   = this._loop.bind(this)
    this._onClick = this._onClick.bind(this)

    const save = SaveManager.load()
    this.equipSave   = save.equipment || defaultEquipmentSave()
    this.selectedSlot = null

    const W = canvas.width
    const H = canvas.height
    this.sz    = 66          // 欄位方框邊長
    this.slots = _buildSlots(W)

    // 英雄繪製位置（畫布中央偏下）
    this.heroX  = W / 2
    this.heroY  = 438
    this.heroSc = 1.35
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
    this.t      += Math.min((ts - this.lastTs) / 1000, 0.05)
    this.lastTs  = ts
    this._draw()
    this.animId  = requestAnimationFrame(this._loop)
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
    const sz = this.sz

    // 返回按鈕
    if (tx < 60 && ty < 60) { this.stop(); this.onBack(); return }

    // 點擊欄位
    for (const s of this.slots) {
      if (tx >= s.x && tx <= s.x + sz && ty >= s.y && ty <= s.y + sz) {
        this.selectedSlot = (this.selectedSlot === s.slot) ? null : s.slot
        return
      }
    }
    this.selectedSlot = null
  }

  // ─── 主繪製 ──────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx
    const W   = this.canvas.width
    const H   = this.canvas.height

    // 背景（鍛造所/旅館風格）
    this._drawBg(ctx, W, H)

    // 連接線（在英雄和格子後面畫）
    this._drawLines(ctx, W)

    // 英雄
    this._drawHero(ctx)

    // 欄位格子
    for (const s of this.slots) {
      this._drawSlot(ctx, s)
    }

    // 頂部標題欄
    this._drawHeader(ctx, W)

    // 底部資訊欄（選中格子時顯示）
    if (this.selectedSlot) this._drawInfo(ctx, W, H)
  }

  _drawBg(ctx, W, H) {
    // 底色
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#2a1a0a')
    bg.addColorStop(0.5, '#3d2510')
    bg.addColorStop(1, '#1e1008')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 木板橫條紋
    ctx.fillStyle = 'rgba(255,200,100,0.03)'
    for (let y = 0; y < H; y += 18) {
      ctx.fillRect(0, y, W, 9)
    }

    // 四角暗角
    const vignette = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, W, H)

    // 中央展示台（淺色圓盤）
    const disc = ctx.createRadialGradient(W/2, this.heroY-20, 10, W/2, this.heroY-20, 140)
    disc.addColorStop(0, 'rgba(255,200,100,0.10)')
    disc.addColorStop(1, 'rgba(255,200,100,0)')
    ctx.fillStyle = disc
    ctx.fillRect(0, 0, W, H)
  }

  _drawLines(ctx, W) {
    const sz  = this.sz
    const hx  = this.heroX
    const hy  = this.heroY
    const sc  = this.heroSc

    // 英雄各部位近似座標（依 _drawPlayer 比例推算）
    const headTop  = hy - 58 * sc           // 杯頂
    const shoulder = hy - 38 * sc           // 肩膀高度
    const waist    = hy - 18 * sc           // 腰部高度
    const sideL    = hx - 24 * sc           // 左側
    const sideR    = hx + 24 * sc           // 右側

    // 各欄位中心點
    const centers = {}
    for (const s of this.slots) {
      centers[s.slot] = { x: s.x + sz / 2, y: s.y + sz / 2 }
    }

    // 連接線設定
    const lines = [
      { from: centers.helmet, to: { x: hx, y: headTop } },
      { from: centers.armor,  to: { x: sideL, y: shoulder } },
      { from: centers.weapon, to: { x: sideR, y: shoulder } },
      { from: centers.gloves, to: { x: sideL, y: waist } },
      { from: centers.pants,  to: { x: sideR, y: waist } },
      { from: centers.boots,  to: { x: hx, y: hy } },
    ]

    ctx.save()
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5

    for (const ln of lines) {
      const isSelected = this.slots.find(
        s => (centers[s.slot] === ln.from) && s.slot === this.selectedSlot
      )
      ctx.strokeStyle = isSelected
        ? 'rgba(255,220,80,0.70)'
        : 'rgba(180,140,80,0.30)'
      ctx.beginPath()
      ctx.moveTo(ln.from.x, ln.from.y)
      ctx.lineTo(ln.to.x,   ln.to.y)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  _drawSlot(ctx, s) {
    const sz  = this.sz
    const x   = s.x
    const y   = s.y
    const sel = this.selectedSlot === s.slot

    // 取得已裝備的件
    const pieceId  = this.equipSave.equipped?.[s.slot] || null
    const hasItem  = !!pieceId

    // 陰影
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    rrect(ctx, x + 3, y + 5, sz, sz, 10); ctx.fill()

    // 木紋漸層背景
    const wg = ctx.createLinearGradient(x, y, x + sz, y + sz)
    if (sel) {
      wg.addColorStop(0, '#e8c870')
      wg.addColorStop(0.5, '#f5e0a0')
      wg.addColorStop(1, '#c8a040')
    } else {
      wg.addColorStop(0, '#7a4e20')
      wg.addColorStop(0.5, '#a06830')
      wg.addColorStop(1, '#6a3e18')
    }
    ctx.fillStyle = wg
    rrect(ctx, x, y, sz, sz, 10); ctx.fill()

    // 木頭條紋
    ctx.save()
    ctx.beginPath(); rrect(ctx, x, y, sz, sz, 10); ctx.clip()
    ctx.strokeStyle = sel ? 'rgba(255,255,255,0.20)' : 'rgba(255,200,100,0.12)'
    ctx.lineWidth = 3.5
    for (let i = -sz; i < sz * 2; i += 12) {
      ctx.beginPath()
      ctx.moveTo(x + i,      y)
      ctx.lineTo(x + i + sz, y + sz)
      ctx.stroke()
    }
    ctx.restore()

    // 外框
    if (sel) {
      ctx.shadowColor = T.goldLight; ctx.shadowBlur = 14
      ctx.strokeStyle = T.gold; ctx.lineWidth = 2.5
    } else {
      ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 2
    }
    rrect(ctx, x, y, sz, sz, 10); ctx.stroke()
    ctx.shadowBlur = 0

    // 內框凹槽感
    ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1
    rrect(ctx, x + 4, y + 4, sz - 8, sz - 8, 7); ctx.stroke()

    // 裝備圖示 / 空格佔位
    if (hasItem) {
      this._drawEquippedItem(ctx, s, pieceId, sel)
    } else {
      // 空格圖示
      ctx.font = '22px serif'; ctx.textAlign = 'center'
      ctx.fillStyle = sel ? 'rgba(255,220,80,0.50)' : 'rgba(255,200,100,0.20)'
      ctx.fillText(_slotEmoji(s.slot), x + sz / 2, y + sz / 2 + 8)
    }

    // 欄位名稱（下方）
    ctx.font      = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = sel ? T.goldLight : 'rgba(220,180,100,0.70)'
    ctx.fillText(s.nameZh, x + sz / 2, y + sz + 15)
  }

  _drawEquippedItem(ctx, s, pieceId, sel) {
    const sz = this.sz
    const x  = s.x
    const y  = s.y

    // 找到件所屬套裝
    let piece = null
    let setData = null
    for (const set of Object.values(EQUIPMENT_SETS)) {
      for (const p of Object.values(set.pieces)) {
        if (p.id === pieceId) { piece = p; setData = set; break }
      }
      if (piece) break
    }
    if (!piece) return

    const rarity  = this.equipSave.pieceRarities?.[pieceId] || 'white'
    const rData   = getRarity(rarity)

    // 稀有度彩色方框 + 圖片（或 emoji fallback）
    SpriteManager.drawEquipmentSlot(
      ctx, pieceId, x, y, sz,
      rData.color, rData.colorDark,
      setData ? setData.emoji : '?'
    )

    // 等級數字（方框右下角）
    const effLv = getEffectiveLevel(this.equipSave, s.slot, pieceId)
    ctx.font      = 'bold 10px sans-serif'
    ctx.fillStyle = sel ? T.goldLight : 'rgba(255,255,220,0.90)'
    ctx.textAlign = 'center'
    ctx.fillText('Lv.' + effLv, x + sz / 2, y + sz - 5)

    // 選中高光邊框
    if (sel) {
      ctx.strokeStyle = T.goldLight; ctx.lineWidth = 2
      const r = 8
      ctx.beginPath()
      ctx.moveTo(x + r, y); ctx.lineTo(x + sz - r, y)
      ctx.arcTo(x + sz, y, x + sz, y + r, r)
      ctx.lineTo(x + sz, y + sz - r); ctx.arcTo(x + sz, y + sz, x + sz - r, y + sz, r)
      ctx.lineTo(x + r, y + sz); ctx.arcTo(x, y + sz, x, y + sz - r, r)
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath(); ctx.stroke()
    }
  }

  _drawHero(ctx) {
    const x  = this.heroX
    const y  = this.heroY
    const sc = this.heroSc

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    ctx.translate(-x, -y)

    const cupW  = 48, cupH = 58, cupBW = 36
    const topX  = x - cupW / 2
    const botX  = x - cupBW / 2
    const topY  = y - cupH
    const botY  = y

    // 腳下光暈
    const glow = ctx.createRadialGradient(x, y + 8, 5, x, y + 8, 48)
    glow.addColorStop(0, 'rgba(255,200,80,0.25)')
    glow.addColorStop(1, 'rgba(255,200,80,0)')
    ctx.fillStyle = glow
    ctx.fillRect(x - 60, y - 10, 120, 40)

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.30)'
    ctx.beginPath(); ctx.ellipse(x, y + 10, 28, 8, 0, 0, Math.PI * 2); ctx.fill()

    const heroKey = 'hero_' + ((this.gameState.hero && this.gameState.hero.id) ? this.gameState.hero.id : 'knight')
    SpriteManager.drawSprite(ctx, heroKey, x, y, 80, 100, () => {
      const hero = this.gameState.hero
      const c1   = (hero && hero.color)     ? hero.color     : T.heroBlue
      const c2   = (hero && hero.colorDark) ? hero.colorDark : T.heroBlueShadow

      const g = ctx.createLinearGradient(topX, topY, topX + cupW, topY)
      g.addColorStop(0, c1); g.addColorStop(0.5, c1 + 'cc'); g.addColorStop(1, c2)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
      ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
      ctx.closePath(); ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.beginPath()
      ctx.moveTo(topX + 5, topY + 4); ctx.lineTo(topX + cupW * 0.45, topY + 4)
      ctx.lineTo(botX + cupBW * 0.42, botY - 8); ctx.lineTo(botX + 5, botY - 8)
      ctx.closePath(); ctx.fill()

      const rimG = ctx.createLinearGradient(topX, topY, topX, topY + 10)
      rimG.addColorStop(0, '#a0d8ff'); rimG.addColorStop(1, c2)
      ctx.fillStyle = rimG
      ctx.fillRect(topX - 3, topY - 5, cupW + 6, 12)

      const eyeY = topY + cupH * 0.38
      for (const ex of [x - 9, x + 9]) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.ellipse(ex, eyeY, 6, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#1a3a7a'
        ctx.beginPath(); ctx.ellipse(ex + 1, eyeY + 1, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(ex + 2, eyeY - 1, 1.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.strokeStyle = '#1a3a7a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, eyeY + 13, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke()

      ctx.save()
      ctx.translate(x + 32, y - 36)
      ctx.rotate(-0.4)
      ctx.fillStyle = '#d0e8f8'; ctx.fillRect(-2.5, -26, 5, 32)
      ctx.strokeStyle = '#7799aa'; ctx.lineWidth = 1; ctx.strokeRect(-2.5, -26, 5, 32)
      ctx.fillStyle = T.gold; ctx.fillRect(-8, 0, 16, 5)
      ctx.fillStyle = T.woodMid; ctx.fillRect(-2, 5, 4, 12)
      ctx.restore()

      ctx.strokeStyle = c2; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(topX, topY); ctx.lineTo(topX + cupW, topY)
      ctx.lineTo(botX + cupBW, botY); ctx.lineTo(botX, botY)
      ctx.closePath(); ctx.stroke()
    })

    ctx.restore()
  }

  _drawHeader(ctx, W) {
    // 頂部深色條
    const hg = ctx.createLinearGradient(0, 0, 0, 60)
    hg.addColorStop(0, 'rgba(20,10,0,0.95)')
    hg.addColorStop(1, 'rgba(20,10,0,0)')
    ctx.fillStyle = hg
    ctx.fillRect(0, 0, W, 60)

    // 返回按鈕
    ctx.font = 'bold 22px sans-serif'
    ctx.fillStyle = T.gold
    ctx.textAlign = 'left'
    ctx.fillText('‹', 18, 38)

    // 標題
    ctx.font      = 'bold 18px sans-serif'
    ctx.fillStyle = T.textWhite
    ctx.textAlign = 'center'
    ctx.fillText('裝備', W / 2, 36)

    // 英雄名稱
    const heroName = this.gameState.hero?.nameZh || this.gameState.hero?.name || ''
    ctx.font      = '12px sans-serif'
    ctx.fillStyle = T.textGray
    ctx.fillText(heroName, W / 2, 52)
  }

  _drawInfo(ctx, W, H) {
    const slot    = this.selectedSlot
    const slotDef = this.slots.find(s => s.slot === slot)
    if (!slotDef) return

    const pieceId = this.equipSave.equipped?.[slot] || null
    const effLv   = getEffectiveLevel(this.equipSave, slot, pieceId)
    const rarity  = pieceId ? (this.equipSave.pieceRarities?.[pieceId] || 'white') : null
    const rData   = rarity ? getRarity(rarity) : null

    const panelY = H - 110
    const panelH = 105

    // 面板背景
    ctx.fillStyle = 'rgba(20,10,0,0.88)'
    rrect(ctx, 0, panelY, W, panelH, 0); ctx.fill()
    ctx.strokeStyle = 'rgba(200,150,60,0.40)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(W, panelY); ctx.stroke()

    ctx.textAlign = 'left'
    const px = 20

    // 欄位名
    ctx.font = 'bold 15px sans-serif'
    ctx.fillStyle = T.gold
    ctx.fillText(slotDef.nameZh, px, panelY + 28)

    if (pieceId) {
      // 件名稱
      let piece = null, setData = null
      for (const set of Object.values(EQUIPMENT_SETS)) {
        for (const p of Object.values(set.pieces)) {
          if (p.id === pieceId) { piece = p; setData = set; break }
        }
        if (piece) break
      }
      ctx.font = '13px sans-serif'
      ctx.fillStyle = rData ? rData.color : T.textWhite
      ctx.fillText((piece ? piece.nameZh : pieceId), px, panelY + 52)

      ctx.fillStyle = T.textGray
      ctx.font = '12px sans-serif'
      ctx.fillText((rData ? rData.nameZh : '') + '  Lv.' + effLv + ' / ' + (rData ? rData.maxLevel : '?'), px, panelY + 72)

      ctx.fillText((setData ? setData.nameZh + ' 套裝' : ''), px, panelY + 90)
    } else {
      ctx.font = '13px sans-serif'
      ctx.fillStyle = T.textGray
      ctx.fillText('尚未裝備', px, panelY + 52)
    }
  }
}

// 各欄位的預設空格 emoji
function _slotEmoji(slot) {
  const map = {
    weapon: '⚔️', helmet: '⛑️', armor: '🧥',
    gloves: '🧤', pants: '👖', boots: '👟',
  }
  return map[slot] || '❓'
}
