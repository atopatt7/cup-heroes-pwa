// rarity.js — 裝備稀有度定義

export const RARITY = {
  white: {
    id:       'white',
    nameZh:   '白色',
    color:    '#e0e0e0',
    colorDark:'#9e9e9e',
    maxLevel:  20,
    synCount:  3,     // 幾個合成下一階
  },
  blue: {
    id:       'blue',
    nameZh:   '藍色',
    color:    '#4a90d9',
    colorDark:'#1a5fa8',
    maxLevel:  40,
    synCount:  3,
  },
  purple: {
    id:       'purple',
    nameZh:   '紫色',
    color:    '#9c27b0',
    colorDark:'#6a0080',
    maxLevel:  60,
    synCount:  3,
  },
  yellow: {
    id:       'yellow',
    nameZh:   '黃色',
    color:    '#ffd700',
    colorDark:'#c8a000',
    maxLevel:  80,
    synCount:  3,
  },
  red: {
    id:       'red',
    nameZh:   '紅色',
    color:    '#f44336',
    colorDark:'#b71c1c',
    maxLevel:  100,
    synCount:  null,  // 最高階，無法繼續合成
  },
}

// 稀有度順序（低 → 高）
export const RARITY_ORDER = ['white', 'blue', 'purple', 'yellow', 'red']

// 取得下一階稀有度 id，最高階回傳 null
export function getNextRarity(rarityId) {
  const idx = RARITY_ORDER.indexOf(rarityId)
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null
  return RARITY_ORDER[idx + 1]
}

// 取得稀有度資料
export function getRarity(rarityId) {
  return RARITY[rarityId] || RARITY.white
}
