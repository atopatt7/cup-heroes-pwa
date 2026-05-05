// upgrades.js — 升級卡效果定義
const ALL_UPGRADES = [
  {
    id: 'atk_sm',
    name: '鋒利磨刃',
    desc: '攻擊力 +5',
    icon: '⚔️',
    rarity: 'common',
    apply: (hero) => { hero.atk += 5 },
  },
  {
    id: 'atk_lg',
    name: '力量爆發',
    desc: '攻擊力 +12',
    icon: '💥',
    rarity: 'rare',
    apply: (hero) => { hero.atk += 12 },
  },
  {
    id: 'def_sm',
    name: '強化盾甲',
    desc: '防禦力 +4',
    icon: '🛡️',
    rarity: 'common',
    apply: (hero) => { hero.def += 4 },
  },
  {
    id: 'hp_sm',
    name: '生命之泉',
    desc: '最大HP +20，恢復20HP',
    icon: '❤️',
    rarity: 'common',
    apply: (hero) => { hero.maxHp += 20; hero.hp = Math.min(hero.hp + 20, hero.maxHp) },
  },
  {
    id: 'hp_lg',
    name: '不死之身',
    desc: '最大HP +50，完全恢復',
    icon: '💖',
    rarity: 'epic',
    apply: (hero) => { hero.maxHp += 50; hero.hp = hero.maxHp },
  },
  {
    id: 'crit_up',
    name: '致命直覺',
    desc: '暴擊率 +10%',
    icon: '🎯',
    rarity: 'rare',
    apply: (hero) => { hero.crit = Math.min((hero.crit || 0.15) + 0.10, 0.80) },
  },
  {
    id: 'crit_dmg',
    name: '暴擊強化',
    desc: '暴擊傷害 ×2.5 → ×3',
    icon: '⚡',
    rarity: 'epic',
    apply: (hero) => { hero.critMult = (hero.critMult || 2) + 1 },
  },
  {
    id: 'balls_up',
    name: '滿杯球',
    desc: '杯球台球數 +5',
    icon: '⚪',
    rarity: 'common',
    apply: (hero) => { hero.bonusBalls = (hero.bonusBalls || 0) + 5 },
  },
]

// 隨機抽 3 張不重複的升級卡
export function drawUpgrades(count = 3) {
  const shuffled = [...ALL_UPGRADES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
