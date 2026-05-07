import { forest_ranger_weapon } from '../pieces/forest_ranger/weapon.js'
import { forest_ranger_helmet } from '../pieces/forest_ranger/helmet.js'
import { forest_ranger_armor  } from '../pieces/forest_ranger/armor.js'
import { forest_ranger_gloves } from '../pieces/forest_ranger/gloves.js'
import { forest_ranger_pants  } from '../pieces/forest_ranger/pants.js'
import { forest_ranger_boots  } from '../pieces/forest_ranger/boots.js'

export const forest_ranger = {
  id:     'forest_ranger',
  name:   'Forest Ranger',
  nameZh: '森林遊俠',
  emoji:  '🌿',
  pieces: {
    weapon: forest_ranger_weapon,
    helmet: forest_ranger_helmet,
    armor:  forest_ranger_armor,
    gloves: forest_ranger_gloves,
    pants:  forest_ranger_pants,
    boots:  forest_ranger_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'double_shot',
    nameZh:  '連射之林',
    descZh:  '每次攻擊有 30% 機率再射一次，造成 60% 額外傷害',
    effect:  'double_shot',
    params:  { chance: 0.30, damageRatio: 0.60 },
  },
}
