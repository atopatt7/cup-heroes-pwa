import { holy_guardian_weapon } from '../pieces/holy_guardian/weapon.js'
import { holy_guardian_helmet } from '../pieces/holy_guardian/helmet.js'
import { holy_guardian_armor  } from '../pieces/holy_guardian/armor.js'
import { holy_guardian_gloves } from '../pieces/holy_guardian/gloves.js'
import { holy_guardian_pants  } from '../pieces/holy_guardian/pants.js'
import { holy_guardian_boots  } from '../pieces/holy_guardian/boots.js'

export const holy_guardian = {
  id:     'holy_guardian',
  name:   'Holy Guardian',
  nameZh: '聖光守護',
  emoji:  '✨',
  pieces: {
    weapon: holy_guardian_weapon,
    helmet: holy_guardian_helmet,
    armor:  holy_guardian_armor,
    gloves: holy_guardian_gloves,
    pants:  holy_guardian_pants,
    boots:  holy_guardian_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'holy_mending',
    nameZh:  '聖光庇佑',
    descZh:  '每擊殺 3 個敵人，恢復 15% 最大生命值',
    effect:  'holy_mending',
    params:  { killsRequired: 3, healRatio: 0.15 },
  },
}
