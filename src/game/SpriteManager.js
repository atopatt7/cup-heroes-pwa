// SpriteManager.js — 圖片接口系統
//
// 使用說明：
//   把圖片放到 public/sprites/ 對應目錄後，遊戲自動切換為圖片渲染；
//   圖片不存在時靜默 fallback 到 canvas 繪圖，遊戲不中斷。
//
// 路徑對應：
//   public/sprites/heroes/{id}.png       → hero_{id}
//   public/sprites/enemies/{type}.png    → enemy_{type}
//   public/sprites/equipment/{id}.png    → equipment_{id}  （可選，裝備以稀有度方框為主）

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/sprites'

// ── 英雄 ID 清單 ──────────────────────────────────────────
const HERO_IDS = ['knight', 'rogue', 'barbarian', 'druid']

// ── 敵人 type 清單 ────────────────────────────────────────
const ENEMY_TYPES = [
  'slime', 'goblin', 'orc', 'troll',
  'forest_guardian', 'iron_knight', 'void_lord',
]

// ── 裝備件 ID 清單（共 36 件）────────────────────────────
const EQUIPMENT_IDS = [
  'forest_ranger_weapon',  'forest_ranger_helmet',  'forest_ranger_armor',
  'forest_ranger_gloves',  'forest_ranger_pants',   'forest_ranger_boots',
  'iron_fortress_weapon',  'iron_fortress_helmet',  'iron_fortress_armor',
  'iron_fortress_gloves',  'iron_fortress_pants',   'iron_fortress_boots',
  'shadow_assassin_weapon','shadow_assassin_helmet','shadow_assassin_armor',
  'shadow_assassin_gloves','shadow_assassin_pants', 'shadow_assassin_boots',
  'flame_berserker_weapon','flame_berserker_helmet','flame_berserker_armor',
  'flame_berserker_gloves','flame_berserker_pants', 'flame_berserker_boots',
  'void_mage_weapon',      'void_mage_helmet',      'void_mage_armor',
  'void_mage_gloves',      'void_mage_pants',        'void_mage_boots',
  'holy_guardian_weapon',  'holy_guardian_helmet',  'holy_guardian_armor',
  'holy_guardian_gloves',  'holy_guardian_pants',   'holy_guardian_boots',
]

// ── 完整 sprite 路徑表 ────────────────────────────────────
export const SPRITE_PATHS = {}

for (const id of HERO_IDS) {
  SPRITE_PATHS[`hero_${id}`] = `${BASE}/heroes/${id}.png`
}
for (const t of ENEMY_TYPES) {
  SPRITE_PATHS[`enemy_${t}`] = `${BASE}/enemies/${t}.png`
}
for (const id of EQUIPMENT_IDS) {
  SPRITE_PATHS[`equipment_${id}`] = `${BASE}/equipment/${id}.png`
}

// ── 內部快取 ──────────────────────────────────────────────
const _cache   = {}
const _failed  = new Set()
const _loading = new Set()

export const SpriteManager = {
  // 預載所有圖片（遊戲啟動時呼叫一次）
  preloadAll() {
    for (const [key, path] of Object.entries(SPRITE_PATHS)) {
      this.load(key, path)
    }
  },

  load(key, path) {
    if (_cache[key] || _failed.has(key) || _loading.has(key)) return
    _loading.add(key)
    const img = new Image()
    img.onload  = () => { _cache[key] = img; _loading.delete(key) }
    img.onerror = () => { _failed.add(key); _loading.delete(key) }
    img.src = path
  },

  get(key)      { return _cache[key] || null },
  isLoaded(key) { return key in _cache },

  // ── drawSprite：底部中心錨點 ──────────────────────────
  // x = 中心 X，y = 底部 Y（腳的位置）
  drawSprite(ctx, key, x, y, w, h, fallback) {
    const img = _cache[key]
    if (img) {
      ctx.drawImage(img, x - w / 2, y - h, w, h)
    } else if (typeof fallback === 'function') {
      fallback()
    }
  },

  // ── 英雄便捷方法（底部中心錨點）──────────────────────
  drawHero(ctx, heroId, x, y, w, h, fallback) {
    this.drawSprite(ctx, `hero_${heroId}`, x, y, w, h, fallback)
  },

  // ── 敵人便捷方法（底部中心錨點）──────────────────────
  drawEnemy(ctx, enemyType, x, y, w, h, fallback) {
    this.drawSprite(ctx, `enemy_${enemyType}`, x, y, w, h, fallback)
  },

  // ── 裝備格子繪製 ──────────────────────────────────────
  // x, y = 方框左上角；sz = 邊長
  // 有圖片 → 稀有度框 + 圖片；無圖片 → 稀有度框 + emoji
  drawEquipmentSlot(ctx, pieceId, x, y, sz, rarityColor, rarityDark, setEmoji) {
    _drawRarityFrame(ctx, x, y, sz, rarityColor, rarityDark)

    const key = pieceId ? `equipment_${pieceId}` : null
    const img = key ? _cache[key] : null

    if (img) {
      const pad = Math.round(sz * 0.08)
      ctx.drawImage(img, x + pad, y + pad, sz - pad * 2, sz - pad * 2)
    } else if (setEmoji) {
      ctx.font      = Math.round(sz * 0.4) + 'px serif'
      ctx.textAlign = 'center'
      ctx.fillText(setEmoji, x + sz / 2, y + sz / 2 + Math.round(sz * 0.14))
    }
  },
}

// ── 稀有度方框（內部輔助）────────────────────────────────
function _drawRarityFrame(ctx, x, y, sz, color, darkColor) {
  const r = 8

  // 背景漸層
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur  = 8
  const bg = ctx.createLinearGradient(x, y, x + sz, y + sz)
  bg.addColorStop(0, _alpha(color, 0.22))
  bg.addColorStop(1, _alpha(darkColor || color, 0.40))
  ctx.fillStyle = bg
  _rrect(ctx, x, y, sz, sz, r); ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()

  // 外框
  const border = ctx.createLinearGradient(x, y, x, y + sz)
  border.addColorStop(0, color)
  border.addColorStop(1, darkColor || color)
  ctx.strokeStyle = border; ctx.lineWidth = 2.5
  _rrect(ctx, x, y, sz, sz, r); ctx.stroke()

  // 內高光
  ctx.strokeStyle = _alpha('#ffffff', 0.18); ctx.lineWidth = 1
  _rrect(ctx, x + 2, y + 2, sz - 4, sz - 4, r - 1); ctx.stroke()
}

function _rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function _alpha(hex, a) {
  const n = parseInt((hex || '#888888').replace('#', ''), 16)
  return 'rgba(' + ((n >> 16) & 0xff) + ',' + ((n >> 8) & 0xff) + ',' + (n & 0xff) + ',' + a + ')'
}
