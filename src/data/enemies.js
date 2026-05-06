// enemies.js — 敵人資料入口
import { slime }            from './enemies/slime.js'
import { goblin }           from './enemies/goblin.js'
import { orc }              from './enemies/orc.js'
import { troll }            from './enemies/troll.js'
import { forest_guardian }  from './enemies/forest_guardian.js'
import { iron_knight }      from './enemies/iron_knight.js'
import { void_lord }        from './enemies/void_lord.js'

export const ENEMY_TYPES = {
  slime, goblin, orc, troll,
  forest_guardian, iron_knight, void_lord,
}

export function getEnemyById(id) {
  return ENEMY_TYPES[id] || null
}
