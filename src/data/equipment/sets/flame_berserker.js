import { flame_berserker_weapon } from '../pieces/flame_berserker/weapon.js'
import { flame_berserker_helmet } from '../pieces/flame_berserker/helmet.js'
import { flame_berserker_armor  } from '../pieces/flame_berserker/armor.js'
import { flame_berserker_gloves } from '../pieces/flame_berserker/gloves.js'
import { flame_berserker_pants  } from '../pieces/flame_berserker/pants.js'
import { flame_berserker_boots  } from '../pieces/flame_berserker/boots.js'

export const flame_berserker = {
  id:     'flame_berserker',
  name:   'Flame Berserker',
  nameZh: '烈焰狂戰',
  emoji:  '🪓',
  pieces: {
    weapon: flame_berserker_weapon,
    helmet: flame_berserker_helmet,
    armor:  flame_berserker_armor,
    gloves: flame_berserker_gloves,
    pants:  flame_berserker_pants,
    boots:  flame_berserker_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'berserker_rage',
    nameZh:  '瀕死狂化',
    descZh:  '血量低於 50% 時傷害 +50%；低於 25% 時傷害 +100%',
    effect:  'berserker_rage',
    params:  { threshold1: 0.50, bonus1: 0.50, threshold2: 0.25, bonus2: 1.00 },
  },
}
