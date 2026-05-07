import { iron_fortress_weapon } from '../pieces/iron_fortress/weapon.js'
import { iron_fortress_helmet } from '../pieces/iron_fortress/helmet.js'
import { iron_fortress_armor  } from '../pieces/iron_fortress/armor.js'
import { iron_fortress_gloves } from '../pieces/iron_fortress/gloves.js'
import { iron_fortress_pants  } from '../pieces/iron_fortress/pants.js'
import { iron_fortress_boots  } from '../pieces/iron_fortress/boots.js'

export const iron_fortress = {
  id:     'iron_fortress',
  name:   'Iron Fortress',
  nameZh: '鐵壁堡壘',
  emoji:  '🛡️',
  pieces: {
    weapon: iron_fortress_weapon,
    helmet: iron_fortress_helmet,
    armor:  iron_fortress_armor,
    gloves: iron_fortress_gloves,
    pants:  iron_fortress_pants,
    boots:  iron_fortress_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'iron_block',
    nameZh:  '鐵壁格擋',
    descZh:  '受到傷害時有 35% 機率完全格擋，該次傷害歸零',
    effect:  'iron_block',
    params:  { chance: 0.35 },
  },
}
