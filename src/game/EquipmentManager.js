// EquipmentManager.js — 裝備系統邏輯
//
// 設計原則：
//   - 裝備等級（slotLevel）以欄位（slot）為單位，同欄位所有套裝的件共用
//     例：weapon slotLevel = 25 → 所有套裝武器的「基準等級」都是 25
//   - 但每件的「有效等級」= min(slotLevel, 該件自己稀有度的 maxLevel)
//     例：slotLevel=25，紫色武器（上限60）有效等級=25，白色武器（上限20）有效等級=20
//   - 稀有度（rarity）以單件為單位，各件獨立
//     例：森林遊俠武器可以是紫色，鐵壁堡壘武器可以是白色，互不影響
//   - slotLevel 能升到多高，取決於該欄位中你擁有的最高稀有度件
//     例：武器欄有紫色件 → slot 最高可升到 60；只有白色件 → 只能升到 20
//   - 合成：3 件相同件 + 相同稀有度 → 1 件同件下一稀有度，slotLevel 不變

import { RARITY, RARITY_ORDER, getNextRarity, getRarity } from '../data/equipment/rarity.js'
import { EQUIPMENT_SETS, getEquipmentById }                from '../data/equipment/equipment.js'

export { RARITY, RARITY_ORDER, getNextRarity, getRarity }

// ── 欄位清單 ──────────────────────────────────────────────
export const SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'pants', 'boots']

export const SLOT_NAME = {
  weapon: '武器',
  helmet: '頭盔',
  armor:  '上衣',
  gloves: '手套',
  pants:  '褲子',
  boots:  '鞋子',
}

// ── 預設存檔結構 ──────────────────────────────────────────
// 存放在 SaveManager 的 save.equipment 欄位
export function defaultEquipmentSave() {
  return {
    // 各欄位等級（1 起，全套裝共用）
    slotLevels: {
      weapon: 1, helmet: 1, armor: 1,
      gloves: 1, pants:  1, boots: 1,
    },

    // 各件的稀有度（key = piece id，只記錄已擁有的件）
    // 格式：{ 'forest_ranger_weapon': 'white', ... }
    pieceRarities: {},

    // 各件的庫存數量（用於合成）
    // 格式：{ 'forest_ranger_weapon': { white: 2, blue: 1 }, ... }
    pieceCounts: {},

    // 當前裝備中的件（key = slot，value = piece id 或 null）
    equipped: {
      weapon: null, helmet: null, armor: null,
      gloves: null, pants:  null, boots: null,
    },
  }
}

// ── 取得某件的有效等級 ────────────────────────────────────
// = min(slotLevel, 該件自己稀有度的 maxLevel)
// 白色武器永遠不會超過 20，即使 weapon slotLevel 已是 50
export function getEffectiveLevel(equipSave, slot, pieceId) {
  const slotLv = equipSave.slotLevels[slot] || 1
  if (!pieceId) return slotLv
  const rarity = equipSave.pieceRarities[pieceId] || 'white'
  const maxLv  = getRarity(rarity).maxLevel
  return Math.min(slotLv, maxLv)
}

// ── 欄位升級 ──────────────────────────────────────────────
// slotLevel 上限 = 你在該欄位中擁有的「最高稀有度件」的 maxLevel
// 低稀有度件不影響能不能升欄位，但它們自己的有效等級仍受自身稀有度封頂
export function canLevelUpSlot(equipSave, slot) {
  const maxPossible = _slotMaxLevel(equipSave, slot)
  return (equipSave.slotLevels[slot] || 1) < maxPossible
}

export function levelUpSlot(equipSave, slot) {
  if (!canLevelUpSlot(equipSave, slot)) {
    return { ok: false, reason: '已達目前稀有度上限' }
  }
  const next = { ...equipSave, slotLevels: { ...equipSave.slotLevels } }
  next.slotLevels[slot] = (next.slotLevels[slot] || 1) + 1
  return { ok: true, save: next }
}

// 欄位最高可升等級 = 你在該欄位擁有的件中，最高稀有度的 maxLevel
function _slotMaxLevel(equipSave, slot) {
  let best = getRarity('white').maxLevel
  for (const [pid, rarity] of Object.entries(equipSave.pieceRarities)) {
    const template = getEquipmentById(pid)
    if (template && template.slot === slot) {
      const cap = getRarity(rarity).maxLevel
      if (cap > best) best = cap
    }
  }
  return best
}

// ── 取得件庫存數量 ────────────────────────────────────────
export function getPieceCount(equipSave, pieceId, rarity) {
  return (equipSave.pieceCounts[pieceId] || {})[rarity] || 0
}

// ── 新增件到庫存 ──────────────────────────────────────────
export function addPiece(equipSave, pieceId, rarity = 'white') {
  const next = {
    ...equipSave,
    pieceCounts: {
      ...equipSave.pieceCounts,
      [pieceId]: {
        ...(equipSave.pieceCounts[pieceId] || {}),
      },
    },
  }
  next.pieceCounts[pieceId][rarity] = (next.pieceCounts[pieceId][rarity] || 0) + 1
  return { ok: true, save: next }
}

// ── 合成判斷 ──────────────────────────────────────────────
export function canSynthesize(equipSave, pieceId, rarity) {
  const nextR = getNextRarity(rarity)
  if (!nextR) return false   // 已是最高階
  const count = getPieceCount(equipSave, pieceId, rarity)
  const needed = getRarity(rarity).synCount
  return count >= needed
}

// ── 執行合成 ──────────────────────────────────────────────
// 消耗 3 個同件同稀有度 → 獲得 1 個同件下一稀有度（等級由 slotLevels 決定，不變）
export function synthesize(equipSave, pieceId, rarity) {
  if (!canSynthesize(equipSave, pieceId, rarity)) {
    return { ok: false, reason: '庫存不足，無法合成' }
  }

  const needed  = getRarity(rarity).synCount
  const nextR   = getNextRarity(rarity)

  const next = {
    ...equipSave,
    pieceCounts: {
      ...equipSave.pieceCounts,
      [pieceId]: { ...(equipSave.pieceCounts[pieceId] || {}) },
    },
    pieceRarities: {
      ...equipSave.pieceRarities,
    },
  }

  // 扣除消耗
  next.pieceCounts[pieceId][rarity] -= needed

  // 新增下一階
  next.pieceCounts[pieceId][nextR] = (next.pieceCounts[pieceId][nextR] || 0) + 1

  // 如果該件目前稀有度低於新取得的，自動更新顯示稀有度
  const currentRarity  = next.pieceRarities[pieceId]
  const currentIdx     = RARITY_ORDER.indexOf(currentRarity || 'white')
  const nextIdx        = RARITY_ORDER.indexOf(nextR)
  if (nextIdx > currentIdx) {
    next.pieceRarities[pieceId] = nextR
  }

  return { ok: true, save: next, gained: nextR }
}

// ── 裝備 / 卸下件 ─────────────────────────────────────────
export function equipPiece(equipSave, pieceId) {
  const template = getEquipmentById(pieceId)
  if (!template) return { ok: false, reason: '找不到裝備' }
  if (!equipSave.pieceRarities[pieceId]) return { ok: false, reason: '尚未擁有此件' }

  const next = {
    ...equipSave,
    equipped: { ...equipSave.equipped, [template.slot]: pieceId },
  }
  return { ok: true, save: next }
}

export function unequipSlot(equipSave, slot) {
  const next = {
    ...equipSave,
    equipped: { ...equipSave.equipped, [slot]: null },
  }
  return { ok: true, save: next }
}

// ── 套裝技能判斷 ──────────────────────────────────────────
// 計算每個套裝目前裝備了幾件，回傳已達門檻的套裝技能陣列
// 回傳格式：[{ setId, setNameZh, setEmoji, pieceCount, bonus }]
export function getActiveSetBonuses(equipSave) {
  // 統計每個套裝裝備件數
  const countBySet = {}
  for (const pieceId of Object.values(equipSave.equipped)) {
    if (!pieceId) continue
    const template = getEquipmentById(pieceId)
    if (!template) continue
    countBySet[template.setId] = (countBySet[template.setId] || 0) + 1
  }

  // 篩選達到 requiredPieces 的套裝
  const active = []
  for (const [setId, count] of Object.entries(countBySet)) {
    const set = EQUIPMENT_SETS[setId]
    if (!set || !set.setBonus) continue
    if (count >= set.setBonus.requiredPieces) {
      active.push({
        setId,
        setNameZh:  set.nameZh,
        setEmoji:   set.emoji,
        pieceCount: count,
        bonus:      set.setBonus,
      })
    }
  }
  return active
}

// 快速判斷單一套裝技能是否啟動
export function isSetBonusActive(equipSave, setId) {
  return getActiveSetBonuses(equipSave).some(s => s.setId === setId)
}

// 取得單一套裝目前裝備件數
export function getEquippedSetCount(equipSave, setId) {
  let count = 0
  for (const pieceId of Object.values(equipSave.equipped)) {
    if (!pieceId) continue
    const template = getEquipmentById(pieceId)
    if (template && template.setId === setId) count++
  }
  return count
}
