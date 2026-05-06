// chapter1.js — 第一章：森林小道
export const chapter1 = {
  id: 1,
  name: 'Forest Trail',
  nameZh: '森林小道',
  desc: '新手副本，適合熟悉系統',
  bg: 'forest',

  // 等角地板配色
  floorColors: {
    sky:    ['#0a0e1a', '#172040'],
    floor:  ['#1a3520', '#22402a', '#162c1a'],
    grid:   'rgba(80,180,60,0.16)',
    border: 'rgba(100,210,80,0.28)',
    fog:    'rgba(10,14,26,',
    glow:   'rgba(255,150,50,',
    ui:     ['#0e1a0b', '#060c04'],
  },

  // 波次：每波指定敵人類型、數量、血量倍率、攻擊倍率、防禦倍率
  waves: [
    { wave:  1, enemies: [{ type: 'slime',  count: 2, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave:  2, enemies: [{ type: 'slime',  count: 3, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave:  3, enemies: [{ type: 'slime',  count: 2, hpM: 1.2, atkM: 1.1, defM: 1.0 }, { type: 'goblin', count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave:  4, enemies: [{ type: 'slime',  count: 2, hpM: 1.2, atkM: 1.1, defM: 1.0 }, { type: 'goblin', count: 2, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave:  5, enemies: [{ type: 'slime',  count: 3, hpM: 1.3, atkM: 1.1, defM: 1.1 }, { type: 'goblin', count: 2, hpM: 1.2, atkM: 1.1, defM: 1.0 }] },
    { wave:  6, enemies: [{ type: 'goblin', count: 2, hpM: 1.3, atkM: 1.2, defM: 1.1 }, { type: 'orc',    count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave:  7, enemies: [{ type: 'goblin', count: 3, hpM: 1.4, atkM: 1.2, defM: 1.1 }, { type: 'orc',    count: 1, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave:  8, enemies: [{ type: 'goblin', count: 2, hpM: 1.4, atkM: 1.3, defM: 1.1 }, { type: 'orc',    count: 2, hpM: 1.1, atkM: 1.1, defM: 1.0 }] },
    { wave:  9, enemies: [{ type: 'goblin', count: 1, hpM: 1.5, atkM: 1.3, defM: 1.2 }, { type: 'orc',    count: 2, hpM: 1.2, atkM: 1.1, defM: 1.0 }] },
    { wave: 10, enemies: [{ type: 'goblin', count: 2, hpM: 1.5, atkM: 1.4, defM: 1.2 }, { type: 'orc',    count: 2, hpM: 1.3, atkM: 1.2, defM: 1.1 }] },
    { wave: 11, enemies: [{ type: 'orc',    count: 3, hpM: 1.3, atkM: 1.2, defM: 1.1 }, { type: 'troll',  count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave: 12, enemies: [{ type: 'orc',    count: 2, hpM: 1.4, atkM: 1.3, defM: 1.2 }, { type: 'troll',  count: 2, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave: 13, enemies: [{ type: 'orc',    count: 2, hpM: 1.5, atkM: 1.4, defM: 1.2 }, { type: 'troll',  count: 2, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave: 14, enemies: [{ type: 'orc',    count: 3, hpM: 1.5, atkM: 1.4, defM: 1.3 }, { type: 'troll',  count: 2, hpM: 1.2, atkM: 1.1, defM: 1.0 }] },
    { wave: 15, isBoss: true,
      enemies: [{ type: 'forest_guardian', count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
  ],

  // 通關獎勵
  clearReward: {
    gold: 80,
    unlockHero: 'rogue',
    cards: [],
    title: '森林征服者',
    desc: '解鎖盜賊英雄，獲得 80 金幣',
  },
}
