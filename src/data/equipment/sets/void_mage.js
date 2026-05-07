import { void_mage_weapon } from '../pieces/void_mage/weapon.js'
import { void_mage_helmet } from '../pieces/void_mage/helmet.js'
import { void_mage_armor  } from '../pieces/void_mage/armor.js'
import { void_mage_gloves } from '../pieces/void_mage/gloves.js'
import { void_mage_pants  } from '../pieces/void_mage/pants.js'
import { void_mage_boots  } from '../pieces/void_mage/boots.js'

export const void_mage = {
  id:     'void_mage',
  name:   'Void Mage',
  nameZh: '虛空術士',
  emoji:  '🔮',
  pieces: {
    weapon: void_mage_weapon,
    helmet: void_mage_helmet,
    armor:  void_mage_armor,
    gloves: void_mage_gloves,
    pants:  void_mage_pants,
    boots:  void_mage_boots,
  },
  setBonus: {
    requiredPieces: 4,
    id:      'void_chain',
    nameZh:  '虛空連鎖',
    descZh:  '擊殺敵人後下次攻擊傷害 +100%，可無限疊加直到一次未擊殺為止',
    effect:  'void_chain',
    params:  { bonusPerKill: 1.00 },
  },
}
