// cards.js — 卡牌系統入口（re-export）
//
// 個別英雄卡牌定義在 cards/ 子目錄：
//   cards/universal.js  — 通用牌（所有英雄）
//   cards/knight.js     — 騎士
//   cards/rogue.js      — 刺客
//   cards/barbarian.js  — 蠻將
//   cards/druid.js      — 德魯伊
//
// 星級規則：重複取得 → +1 星，最多 5 星，滿星不再出現
// 費用規則：第 n 次購買 = (n-1)*100 球，首次永遠免費

export { UNIVERSAL_CARDS } from './cards/universal.js'
export { KNIGHT_CARDS }    from './cards/knight.js'
export { ROGUE_CARDS }     from './cards/rogue.js'
export { BARBARIAN_CARDS } from './cards/barbarian.js'
export { DRUID_CARDS }     from './cards/druid.js'

import { UNIVERSAL_CARDS } from './cards/universal.js'
import { KNIGHT_CARDS }    from './cards/knight.js'
import { ROGUE_CARDS }     from './cards/rogue.js'
import { BARBARIAN_CARDS } from './cards/barbarian.js'
import { DRUID_CARDS }     from './cards/druid.js'

export const MAX_STARS = 5

// ── 輔助函式 ────────────────────────────────────────────────────

export function getHeroCards(heroId) {
  const MAP = {
    knight:    KNIGHT_CARDS,
    rogue:     ROGUE_CARDS,
    barbarian: BARBARIAN_CARDS,
    druid:     DRUID_CARDS,
  }
  return Object.values(MAP[heroId] || {})
}

export function getAllCards() {
  return [
    ...Object.values(UNIVERSAL_CARDS),
    ...Object.values(KNIGHT_CARDS),
    ...Object.values(ROGUE_CARDS),
    ...Object.values(BARBARIAN_CARDS),
    ...Object.values(DRUID_CARDS),
  ]
}

export function getCardById(id) {
  return getAllCards().find(c => c.id === id)
}

export function getCardDesc(card, stars=1) {
  return typeof card.desc === 'function' ? card.desc(stars) : (card.desc || '')
}

// 卡牌費用：第 n 次購買 = (n-1)*100 球，首次永遠免費
export function getCardCost(cardId, cardPurchases={}) {
  return (cardPurchases[cardId] || 0) * 100
}

// drawCardOffers — 抽出選牌清單
// count         = 抽幾張
// wave          = 目前波次（預留擴充用）
// heroId        = 英雄 ID
// cardStars     = { [id]: 已有星數 }
// balls         = 目前可用球數
// cardPurchases = { [id]: 購買次數 }
export function drawCardOffers(count=3, wave=1, heroId='knight', cardStars={}, balls=9999, cardPurchases={}) {
  const canAfford = (c) => getCardCost(c.id, cardPurchases) <= balls
  const notMaxed  = (c) => (cardStars[c.id] || 0) < MAX_STARS
  const isFree    = (c) => (cardPurchases[c.id] || 0) === 0

  // 主要池：買得起的牌
  const univAfford = Object.values(UNIVERSAL_CARDS).filter(c => notMaxed(c) && canAfford(c))
  const heroAfford = getHeroCards(heroId).filter(c => notMaxed(c) && canAfford(c))

  // 免費補充池：未買過的牌（cost=0），球數不足時補滿三選一
  const univFree = Object.values(UNIVERSAL_CARDS).filter(c => notMaxed(c) && isFree(c))
  const heroFree = getHeroCards(heroId).filter(c => notMaxed(c) && isFree(c))

  const seen   = new Set()
  const result = []

  const pickFrom = (pool) => {
    const avail = pool.filter(c => !seen.has(c.id))
    if (!avail.length) return false
    const card = avail[Math.floor(Math.random() * avail.length)]
    seen.add(card.id); result.push(card)
    return true
  }

  // 第一輪：從買得起的牌裡選，優先保證一張英雄牌
  if (heroAfford.length > 0) pickFrom(heroAfford)
  const combined = _shuffle([...univAfford, ...univAfford, ...heroAfford])
  for (const card of combined) {
    if (result.length >= count) break
    if (!seen.has(card.id)) { seen.add(card.id); result.push(card) }
  }

  // 第二輪：不足 count 張時用免費牌補滿（確保永遠有牌可選）
  if (result.length < count) {
    const freeFill = _shuffle([...univFree, ...heroFree])
    for (const card of freeFill) {
      if (result.length >= count) break
      if (!seen.has(card.id)) { seen.add(card.id); result.push(card) }
    }
  }

  return _shuffle(result)
}

function _shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
