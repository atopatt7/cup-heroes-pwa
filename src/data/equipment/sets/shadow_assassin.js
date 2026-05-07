import { shadow_assassin_weapon } from '../pieces/shadow_assassin/weapon.js'
import { shadow_assassin_helmet } from '../pieces/shadow_assassin/helmet.js'
import { shadow_assassin_armor  } from '../pieces/shadow_assassin/armor.js'
import { shadow_assassin_gloves } from '../pieces/shadow_assassin/gloves.js'
import { shadow_assassin_pants  } from '../pieces/shadow_assassin/pants.js'
import { shadow_assassin_boots  } from '../pieces/shadow_assassin/boots.js'

export const shadow_assassin = {
  id:     'shadow_assassin',
  name:   'Shadow Assassin',
  nameZh: '暗影刺客',
  emoji:  '🗡️',
  pieces: {
    weapon: shadow_assassin_weapon,
    helmet: shadow_assassin_helmet,
    armor:  shadow_assassin_armor,
    gloves: shadow_assassin_gloves,
    pants:  shadow_assassin_pants,
    boots:  shadow_assassin_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'assassinate',
    nameZh:  '暗殺蓄力',
    descZh:  '每 5 次攻擊後，下次攻擊必定暴擊，造成 300% 傷害',
    effect:  'assassinate',
    params:  { stacksRequired: 5, critMultiplier: 3.0 },
  },
}
