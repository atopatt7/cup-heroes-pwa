// heroes.js — 英雄定義（靈感來自原版 Cup Heroes 戰士系統）
// 每位英雄有獨特屬性 + 起始卡牌ID清單

export const HEROES = {
  knight: {
    id: 'knight',
    name: 'Cup Knight',
    nameZh: '杯子騎士',
    description: '攻防平衡的鐵衛，以厚重盾甲撐過苦戰',
    hp: 160, maxHp: 160,
    atk: 20, def: 12,
    spd: 1.0,    // 攻速倍率
    crit: 0.12,  // 暴擊率
    critMult: 2, // 暴擊傷害倍率
    color: '#2196F3',
    colorDark: '#0d47a1',
    startingCards: ['shield_wall', 'double_strike'],
    emoji: '⚔️',
    unlocked: true,
  },

  rogue: {
    id: 'rogue',
    name: 'Shadow Rogue',
    nameZh: '暗影刺客',
    description: '極高暴擊與攻速，一擊必殺的暗殺者',
    hp: 110, maxHp: 110,
    atk: 28, def: 5,
    spd: 1.5,
    crit: 0.35,
    critMult: 2.5,
    color: '#7B1FA2',
    colorDark: '#4a148c',
    startingCards: ['quick_shot', 'battle_frenzy'],
    emoji: '🗡️',
    unlocked: false,
    unlockHint: '通關第一章解鎖',
    unlockCondition: 'chapter1_clear',
  },

  barbarian: {
    id: 'barbarian',
    name: 'Iron Barbarian',
    nameZh: '鐵血蠻將',
    description: '超高HP，血越少攻擊越猛，以命換命',
    hp: 220, maxHp: 220,
    atk: 16, def: 8,
    spd: 0.85,
    crit: 0.10,
    critMult: 2,
    color: '#E64A19',
    colorDark: '#bf360c',
    startingCards: ['berserk_charge', 'iron_will'],
    emoji: '🪓',
    unlocked: false,
    unlockHint: '通關第二章解鎖',
    unlockCondition: 'chapter2_clear',
  },

  druid: {
    id: 'druid',
    name: 'Forest Druid',
    nameZh: '森林德魯伊',
    description: '以自然魔法治癒同伴，施毒傷害敵人',
    hp: 130, maxHp: 130,
    atk: 22, def: 7,
    spd: 1.0,
    crit: 0.18,
    critMult: 2,
    color: '#388E3C',
    colorDark: '#1b5e20',
    startingCards: ['vampiric_touch', 'thorn_blast'],
    emoji: '🌿',
    unlocked: false,
    unlockHint: '通關第三章解鎖',
    unlockCondition: 'chapter3_clear',
  },
}

// 取得英雄副本（避免直接修改原始資料）
export function getHero(id) {
  const h = HEROES[id]
  if (!h) return { ...HEROES.knight, deck: [...HEROES.knight.startingCards] }
  return {
    ...h,
    hp: h.maxHp,  // 重置為滿血
    deck: [...h.startingCards],
  }
}
