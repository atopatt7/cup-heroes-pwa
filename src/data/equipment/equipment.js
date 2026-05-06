// equipment.js — 裝備資料入口
import { forest_ranger }    from './sets/forest_ranger.js'
import { iron_fortress }    from './sets/iron_fortress.js'
import { shadow_assassin }  from './sets/shadow_assassin.js'
import { flame_berserker }  from './sets/flame_berserker.js'
import { void_mage }        from './sets/void_mage.js'
import { holy_guardian }    from './sets/holy_guardian.js'

export const EQUIPMENT_SETS = {
  forest_ranger,
  iron_fortress,
  shadow_assassin,
  flame_berserker,
  void_mage,
  holy_guardian,
}

// 取得單件裝備（跨所有套裝搜尋）
export function getEquipmentById(id) {
  for (const set of Object.values(EQUIPMENT_SETS)) {
    for (const piece of Object.values(set.pieces)) {
      if (piece.id === id) return { ...piece, setId: set.id, setNameZh: set.nameZh }
    }
  }
  return null
}

// 取得套裝
export function getSetById(setId) {
  return EQUIPMENT_SETS[setId] || null
}
