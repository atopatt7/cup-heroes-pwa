// heroes.js — 所有英雄的數值與設定
export const HEROES = {
  knight: {
    id:     'knight',
    name:   'Knight Cup',
    hp:     120,
    maxHp:  120,
    atk:    18,
    def:    8,
    crit:   0.15,
    color:  '#5c8bd6',
    unlocked: true,
    description: '攻防平衡的杯子騎士，適合新手',
  },
  ninja: {
    id:     'ninja',
    name:   'Ninja Cup',
    hp:     90,
    maxHp:  90,
    atk:    28,
    def:    4,
    crit:   0.30,
    color:  '#2d2d2d',
    unlocked: false,
    description: '高攻低防，暴擊率極高，打完第5波解鎖',
  },
}
