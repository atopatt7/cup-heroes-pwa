// SpriteManager.js — 圖片接口系統
// 使用方式：
//   1. 把圖片放到 public/sprites/heroes/knight.png 等路徑
//   2. 呼叫 SpriteManager.drawSprite(ctx, 'hero_knight', x, y, w, h, fallbackFn)
//   3. 如果圖片已載入 → 畫圖片；否則 → 執行 fallbackFn（canvas 繪圖）
//
// 預期圖片路徑（以 GitHub Pages base 為準）：
//   public/sprites/heroes/knight.png      → hero_knight
//   public/sprites/heroes/rogue.png       → hero_rogue
//   public/sprites/heroes/barbarian.png   → hero_barbarian
//   public/sprites/heroes/druid.png       → hero_druid
//   public/sprites/enemies/slime.png      → enemy_slime
//   public/sprites/enemies/goblin.png     → enemy_goblin
//   public/sprites/enemies/orc.png        → enemy_orc
//   public/sprites/enemies/troll.png      → enemy_troll
//   public/sprites/enemies/forest_guardian.png → enemy_forest_guardian
//   public/sprites/enemies/iron_knight.png     → enemy_iron_knight
//   public/sprites/enemies/void_lord.png       → enemy_void_lord

const BASE = '/cup-heroes-pwa/sprites'

// 所有預定義的圖片路徑
export const SPRITE_PATHS = {
  // 英雄
  hero_knight:          `${BASE}/heroes/knight.png`,
  hero_rogue:           `${BASE}/heroes/rogue.png`,
  hero_barbarian:       `${BASE}/heroes/barbarian.png`,
  hero_druid:           `${BASE}/heroes/druid.png`,
  // 敵人
  enemy_slime:          `${BASE}/enemies/slime.png`,
  enemy_goblin:         `${BASE}/enemies/goblin.png`,
  enemy_orc:            `${BASE}/enemies/orc.png`,
  enemy_troll:          `${BASE}/enemies/troll.png`,
  enemy_forest_guardian:`${BASE}/enemies/forest_guardian.png`,
  enemy_iron_knight:    `${BASE}/enemies/iron_knight.png`,
  enemy_void_lord:      `${BASE}/enemies/void_lord.png`,
}

// 內部快取
const _cache   = {}  // key → HTMLImageElement（成功）
const _failed  = new Set()  // 載入失敗的 key（不重試）
const _loading = new Set()  // 正在載入中的 key

export const SpriteManager = {
  /**
   * 預載全部圖片（在遊戲啟動時呼叫一次）
   * 如果圖片檔案不存在，會靜默失敗，不影響遊戲
   */
  preloadAll() {
    for (const [key, path] of Object.entries(SPRITE_PATHS)) {
      this.load(key, path)
    }
  },

  /**
   * 載入單張圖片
   */
  load(key, path) {
    if (_cache[key] || _failed.has(key) || _loading.has(key)) return
    _loading.add(key)
    const img = new Image()
    img.onload  = () => { _cache[key] = img; _loading.delete(key) }
    img.onerror = () => { _failed.add(key); _loading.delete(key) }
    img.src = path
  },

  /**
   * 取得已載入的圖片，若未載入則回傳 null
   */
  get(key) {
    return _cache[key] || null
  },

  /**
   * 是否已成功載入
   */
  isLoaded(key) {
    return key in _cache
  },

  /**
   * 繪製 sprite，如果圖片未載入就執行 fallback 函式
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} key   - sprite key，如 'hero_knight'
   * @param {number} x     - 繪製中心 X
   * @param {number} y     - 繪製底部 Y（腳的位置）
   * @param {number} w     - 寬度
   * @param {number} h     - 高度
   * @param {Function} [fallback] - 無圖時執行的繪圖函式
   */
  drawSprite(ctx, key, x, y, w, h, fallback) {
    const img = _cache[key]
    if (img) {
      // 圖片已載入：以底部中心為錨點繪製
      ctx.drawImage(img, x - w / 2, y - h, w, h)
    } else {
      // 圖片未載入：執行 fallback
      if (typeof fallback === 'function') fallback()
    }
  },
}
