// chapter2.js — 第二章：石頭城堡
export const chapter2 = {
  id: 2,
  name: 'Stone Castle',
  nameZh: '石頭城堡',
  desc: '中階戰場，鐵甲士兵開始登場',
  bg: 'castle',

  // 等角地板配色（石灰冷色調）
  floorColors: {
    sky:    ['#0e0e18', '#1c1c30'],
    floor:  ['#2a2a3a', '#323245', '#1e1e2e'],
    grid:   'rgba(120,120,180,0.16)',
    border: 'rgba(150,150,220,0.28)',
    fog:    'rgba(14,14,24,',
    glow:   'rgba(180,160,80,',
    ui:     ['#12121e', '#080810'],
  },

  waves: [
    { wave:  1, enemies: [{ type: 'orc',   count: 2, hpM: 1.3, atkM: 1.2, defM: 1.2 }, { type: 'goblin', count: 2, hpM: 1.4, atkM: 1.2, defM: 1.1 }] },
    { wave:  2, enemies: [{ type: 'orc',   count: 3, hpM: 1.4, atkM: 1.2, defM: 1.2 }, { type: 'goblin', count: 2, hpM: 1.5, atkM: 1.2, defM: 1.1 }] },
    { wave:  3, enemies: [{ type: 'orc',   count: 2, hpM: 1.5, atkM: 1.3, defM: 1.2 }, { type: 'troll',  count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
    { wave:  4, enemies: [{ type: 'orc',   count: 3, hpM: 1.5, atkM: 1.3, defM: 1.3 }, { type: 'troll',  count: 1, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave:  5, enemies: [{ type: 'orc',   count: 2, hpM: 1.6, atkM: 1.4, defM: 1.3 }, { type: 'troll',  count: 2, hpM: 1.1, atkM: 1.0, defM: 1.0 }] },
    { wave:  6, enemies: [{ type: 'orc',   count: 3, hpM: 1.6, atkM: 1.4, defM: 1.3 }, { type: 'troll',  count: 2, hpM: 1.2, atkM: 1.1, defM: 1.1 }] },
    { wave:  7, enemies: [{ type: 'orc',   count: 2, hpM: 1.7, atkM: 1.5, defM: 1.4 }, { type: 'troll',  count: 3, hpM: 1.2, atkM: 1.1, defM: 1.1 }] },
    { wave:  8, enemies: [{ type: 'orc',   count: 2, hpM: 1.7, atkM: 1.5, defM: 1.4 }, { type: 'troll',  count: 3, hpM: 1.3, atkM: 1.2, defM: 1.2 }] },
    { wave:  9, enemies: [{ type: 'orc',   count: 1, hpM: 1.8, atkM: 1.5, defM: 1.4 }, { type: 'troll',  count: 3, hpM: 1.4, atkM: 1.2, defM: 1.2 }] },
    { wave: 10, enemies: [{ type: 'troll', count: 3, hpM: 1.5, atkM: 1.3, defM: 1.3 }, { type: 'orc',    count: 2, hpM: 1.8, atkM: 1.6, defM: 1.4 }] },
    { wave: 11, enemies: [{ type: 'troll', count: 4, hpM: 1.5, atkM: 1.3, defM: 1.3 }, { type: 'orc',    count: 1, hpM: 1.9, atkM: 1.6, defM: 1.5 }] },
    { wave: 12, enemies: [{ type: 'troll', count: 4, hpM: 1.6, atkM: 1.4, defM: 1.4 }, { type: 'orc',    count: 2, hpM: 2.0, atkM: 1.7, defM: 1.5 }] },
    { wave: 13, enemies: [{ type: 'troll', count: 4, hpM: 1.7, atkM: 1.5, defM: 1.4 }, { type: 'orc',    count: 2, hpM: 2.0, atkM: 1.8, defM: 1.5 }] },
    { wave: 14, enemies: [{ type: 'troll', count: 5, hpM: 1.8, atkM: 1.5, defM: 1.5 }, { type: 'orc',    count: 2, hpM: 2.1, atkM: 1.8, defM: 1.6 }] },
    { wave: 15, isBoss: true,
      enemies: [{ type: 'iron_knight', count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
  ],

  clearReward: {
    gold: 150,
    unlockHero: 'barbarian',
    cards: ['fortress'],
    title: '城堡攻略者',
    desc: '解鎖蠻族英雄，獲得 150 金幣，牌池加入「要塞」',
  },
}
