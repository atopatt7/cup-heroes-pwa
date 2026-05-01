// drawHelpers.js — 共用繪圖工具
import { T } from './theme.js'

/** 圓角矩形 path（不含 fill/stroke）*/
export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y,     x + w, y + r,     r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x,     y + h, x,       y + h - r, r)
  ctx.lineTo(x,     y + r)
  ctx.arcTo(x,     y,     x + r,   y,         r)
  ctx.closePath()
}

/** 卡通風天空背景（漸層 + 雲朵）*/
export function drawSky(ctx, W, H, clouds) {
  const bg = ctx.createLinearGradient(0, 0, 0, H * 0.75)
  bg.addColorStop(0,   T.skyTop)
  bg.addColorStop(0.6, T.skyMid)
  bg.addColorStop(1,   T.skyBot)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 雲
  for (const c of clouds) {
    ctx.globalAlpha = 0.88
    ctx.fillStyle   = T.cloud
    _drawCloud(ctx, c.x, c.y, c.scale)
  }
  ctx.globalAlpha = 1
}

function _drawCloud(ctx, cx, cy, sc) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(sc, sc)
  ctx.beginPath()
  ctx.arc(0,    0,  28, 0, Math.PI * 2)
  ctx.arc(32,  -8,  22, 0, Math.PI * 2)
  ctx.arc(60,   0,  26, 0, Math.PI * 2)
  ctx.arc(32,   8,  22, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 草地 + 泥土 */
export function drawGround(ctx, W, H, groundY) {
  // 草
  const grassH = 18
  ctx.fillStyle = T.grassTop
  ctx.fillRect(0, groundY, W, grassH)
  // 草高光
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(0, groundY, W, 5)
  // 泥土
  const dirtG = ctx.createLinearGradient(0, groundY + grassH, 0, H)
  dirtG.addColorStop(0, T.dirt)
  dirtG.addColorStop(1, '#8a5230')
  ctx.fillStyle = dirtG
  ctx.fillRect(0, groundY + grassH, W, H - groundY - grassH)
}

/** 帶光暈的按鈕 */
export function drawBtn(ctx, cx, cy, w, h, label, c1, c2, r = 14) {
  const x = cx - w / 2, y = cy - h / 2
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, c1); g.addColorStop(1, c2)
  ctx.fillStyle = g
  rrect(ctx, x, y, w, h, r); ctx.fill()
  // 頂部高光
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  rrect(ctx, x + 3, y + 3, w - 6, h / 2 - 3, r - 2)
  ctx.fill()
  // 邊框
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5
  rrect(ctx, x, y, w, h, r); ctx.stroke()
  // 文字
  ctx.fillStyle = T.textWhite; ctx.font = `bold 18px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy + 1); ctx.textBaseline = 'alphabetic'
}

/** 卡通風英雄 HP 條 */
export function drawHpBar(ctx, x, y, w, h, hp, maxHp, label, color) {
  const pct = Math.max(0, hp / maxHp)
  // 外框
  ctx.fillStyle = '#1a1a3a'
  rrect(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2); ctx.fill()
  // 背景
  ctx.fillStyle = '#333355'
  rrect(ctx, x, y, w, h, h / 2); ctx.fill()
  // 血條
  if (pct > 0) {
    const barColor = pct > 0.5 ? color : pct > 0.25 ? '#f39c12' : '#e74c3c'
    const bw = Math.max(h, w * pct)
    const bg2 = ctx.createLinearGradient(x, y, x, y + h)
    bg2.addColorStop(0, barColor + 'ff')
    bg2.addColorStop(1, barColor + 'aa')
    ctx.fillStyle = bg2
    rrect(ctx, x, y, Math.min(w * pct, w), h, h / 2); ctx.fill()
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    rrect(ctx, x + 2, y + 2, Math.min(w * pct, w) - 4, h / 2 - 2, (h / 2 - 2) / 2); ctx.fill()
  }
  // 文字
  ctx.fillStyle = '#fff'; ctx.font = `bold ${h - 3}px sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(`${label}  ${Math.ceil(hp)}/${maxHp}`, x + 6, y + h - 3)
}
