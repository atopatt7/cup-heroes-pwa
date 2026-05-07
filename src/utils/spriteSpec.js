// spriteSpec.js — 美術圖規格說明
//
// 用途：提供給 Gemini 生成美術圖時的規格參考
// 生成後的圖片放到 public/sprites/ 對應目錄即可自動套用
//
// 統一規格：
//   - 格式：PNG（支援透明背景）
//   - 背景：透明
//   - 風格：卡通風格、扁平 2D 插畫、鮮豔飽和色彩（仿原版 Cup Heroes）
//   - 錨點：角色腳底置於圖片底部中央

// ── 英雄規格 ──────────────────────────────────────────────
// 路徑：public/sprites/heroes/{id}.png
// 尺寸：200 × 260 px（寬 × 高）
export const HERO_SPRITES = [
  {
    id:       'knight',
    file:     'heroes/knight.png',
    size:     [200, 260],
    nameZh:   '鐵甲騎士',
    prompt:   '卡通風格 2D 遊戲角色插圖，透明背景。鐵甲騎士，穿著藍色重甲，手持長劍，杯子形狀的身體輪廓（寬肩窄腳），圓圓大眼睛，可愛稚氣，角色站立姿態，腳底對齊圖片底部中央。',
  },
  {
    id:       'rogue',
    file:     'heroes/rogue.png',
    size:     [200, 260],
    nameZh:   '暗影盜賊',
    prompt:   '卡通風格 2D 遊戲角色插圖，透明背景。暗影盜賊，穿著深紫色皮甲與兜帽，手持雙刀，杯子形狀的身體輪廓，圓圓大眼睛閃著精靈光芒，可愛敏捷感，腳底對齊圖片底部中央。',
  },
  {
    id:       'barbarian',
    file:     'heroes/barbarian.png',
    size:     [200, 260],
    nameZh:   '野蠻戰士',
    prompt:   '卡通風格 2D 遊戲角色插圖，透明背景。野蠻戰士，穿著橙紅色皮甲，手持巨斧，杯子形狀的身體輪廓（特別寬壯），圓圓大眼睛透露兇猛，可愛霸氣，腳底對齊圖片底部中央。',
  },
  {
    id:       'druid',
    file:     'heroes/druid.png',
    size:     [200, 260],
    nameZh:   '自然德魯伊',
    prompt:   '卡通風格 2D 遊戲角色插圖，透明背景。自然德魯伊，穿著綠色法袍，頭戴花環，手持木杖，杯子形狀的身體輪廓，圓圓大眼睛散發自然光芒，可愛神秘，腳底對齊圖片底部中央。',
  },
]

// ── 敵人規格 ──────────────────────────────────────────────
// 路徑：public/sprites/enemies/{type}.png
// 尺寸：普通敵人 160×160 px，Boss 220×280 px
export const ENEMY_SPRITES = [
  {
    id:     'slime',
    file:   'enemies/slime.png',
    size:   [160, 160],
    nameZh: '黏液怪',
    isBoss: false,
    prompt: '卡通風格 2D 遊戲敵人插圖，透明背景。可愛黏液怪，藍綠色圓滾滾果凍身體，大大的圓眼睛，可愛又帶點壞笑，底部對齊圖片底部中央。',
  },
  {
    id:     'goblin',
    file:   'enemies/goblin.png',
    size:   [160, 160],
    nameZh: '哥布林',
    isBoss: false,
    prompt: '卡通風格 2D 遊戲敵人插圖，透明背景。哥布林，綠色小個子，尖耳朵，拿著生鏽小刀，圓圓眼睛露出狡猾表情，可愛搞笑，腳底對齊圖片底部中央。',
  },
  {
    id:     'orc',
    file:   'enemies/orc.png',
    size:   [160, 160],
    nameZh: '獸人',
    isBoss: false,
    prompt: '卡通風格 2D 遊戲敵人插圖，透明背景。獸人，深綠色肌肉壯漢，獠牙外露，拿著木棍，圓圓眼睛帶兇狠感但仍可愛，腳底對齊圖片底部中央。',
  },
  {
    id:     'troll',
    file:   'enemies/troll.png',
    size:   [160, 160],
    nameZh: '巨魔',
    isBoss: false,
    prompt: '卡通風格 2D 遊戲敵人插圖，透明背景。巨魔，紫灰色大塊頭，岩石般皮膚，舉著石頭，圓圓大眼睛略帶呆萌感，腳底對齊圖片底部中央。',
  },
  {
    id:     'forest_guardian',
    file:   'enemies/forest_guardian.png',
    size:   [220, 280],
    nameZh: '森林守護者',
    isBoss: true,
    prompt: '卡通風格 2D 遊戲 Boss 插圖，透明背景。森林守護者，巨大樹精靈，深綠色樹皮身體，長著枝葉，大圓眼睛散發綠色光芒，威嚴中帶點可愛，腳底對齊圖片底部中央。',
  },
  {
    id:     'iron_knight',
    file:   'enemies/iron_knight.png',
    size:   [220, 280],
    nameZh: '鐵甲武士',
    isBoss: true,
    prompt: '卡通風格 2D 遊戲 Boss 插圖，透明背景。鐵甲武士，全身銀色重甲，頭戴王冠，手持長槍，大圓眼睛透過面罩發光，霸氣中帶可愛，腳底對齊圖片底部中央。',
  },
  {
    id:     'void_lord',
    file:   'enemies/void_lord.png',
    size:   [220, 280],
    nameZh: '虛空領主',
    isBoss: true,
    prompt: '卡通風格 2D 遊戲 Boss 插圖，透明背景。虛空領主，黑紫色半透明身體，漂浮在空中，身邊環繞紫色能量球，大圓眼睛發出紫光，神秘感十足但仍可愛，底部對齊圖片底部中央。',
  },
]

// ── 裝備規格說明 ──────────────────────────────────────────
// 裝備不需要個別圖片；外觀由遊戲動態生成稀有度方框
// 若日後想加入裝備圖示，放到 public/sprites/equipment/{id}.png 即可
// 路徑：public/sprites/equipment/{id}.png
// 尺寸：96 × 96 px（正方形）
// 說明：透明背景，圖案會疊在稀有度彩色方框上方
export const EQUIPMENT_NOTE = `
裝備視覺 = 稀有度彩色方框（canvas 動態繪製）+ 可選自訂圖示
若要加入自訂圖示，將 96×96 透明背景 PNG 放到 public/sprites/equipment/ 即可。
`

// ── 使用說明 ──────────────────────────────────────────────
export const USAGE = `
生成美術圖步驟：
1. 使用 Gemini API 依照上方 prompt 生成對應圖片
2. 儲存到 public/sprites/ 對應目錄（heroes/ / enemies/ / equipment/）
3. 圖片命名要與 id 完全一致（例：knight.png, slime.png）
4. 重新部署後遊戲自動切換為圖片渲染，fallback canvas 繪圖自動停用

目前所有場景已接好 SpriteManager 接口：
  - BattleScene.js     → 英雄 + 敵人立繪
  - HeroSelectScene.js → 英雄卡片立繪
  - EquipmentScene.js  → 英雄立繪 + 裝備格稀有度方框
`
