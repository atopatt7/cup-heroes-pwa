// chapter3.js — 第三章：暗黑地城
export const chapter3 = {
  id: 3,
  name: 'Dark Dungeon',
  nameZh: '暗黑地城',
  desc: '高難度深淵，只有強者能通過',
  bg: 'dungeon',

  // 等角地板配色（紫黑暗色調）
  floorColors: {
    sky:    ['#080010', '#160820'],
    floor:  ['#1a0a28', '#220e35', '#120618'],
    grid:   'rgba(160,60,220,0.16)',
    border: 'rgba(180,80,255,0.28)',
    fog:    'rgba(8,0,16,',
    glow:   'rgba(200,80,255,',
    ui:     ['#100818', '#06030c'],
  },

  waves: [
    { wave:  1, enemies: [{ type: 'troll', count: 3, hpM: 1.8, atkM: 1.6, defM: 1.5 }, { type: 'orc',    count: 2, hpM: 2.0, atkM: 1.7, defM: 1.5 }] },
    { wave:  2, enemies: [{ type: 'troll', count: 3, hpM: 1.9, atkM: 1.7, defM: 1.5 }, { type: 'orc',    count: 3, hpM: 2.0, atkM: 1.8, defM: 1.5 }] },
    { wave:  3, enemies: [{ type: 'troll', count: 4, hpM: 2.0, atkM: 1.7, defM: 1.6 }, { type: 'orc',    count: 2, hpM: 2.2, atkM: 1.8, defM: 1.6 }] },
    { wave:  4, enemies: [{ type: 'troll', count: 4, hpM: 2.0, atkM: 1.8, defM: 1.6 }, { type: 'orc',    count: 3, hpM: 2.2, atkM: 1.9, defM: 1.6 }] },
    { wave:  5, enemies: [{ type: 'troll', count: 4, hpM: 2.1, atkM: 1.8, defM: 1.7 }, { type: 'orc',    count: 3, hpM: 2.4, atkM: 2.0, defM: 1.7 }] },
    { wave:  6, enemies: [{ type: 'troll', count: 5, hpM: 2.2, atkM: 1.9, defM: 1.7 }, { type: 'orc',    count: 2, hpM: 2.4, atkM: 2.0, defM: 1.8 }] },
    { wave:  7, enemies: [{ type: 'troll', count: 5, hpM: 2.2, atkM: 2.0, defM: 1.8 }, { type: 'orc',    count: 3, hpM: 2.5, atkM: 2.1, defM: 1.8 }] },
    { wave:  8, enemies: [{ type: 'troll', count: 5, hpM: 2.3, atkM: 2.0, defM: 1.8 }, { type: 'orc',    count: 3, hpM: 2.6, atkM: 2.1, defM: 1.9 }] },
    { wave:  9, enemies: [{ type: 'troll', count: 5, hpM: 2.4, atkM: 2.1, defM: 1.9 }, { type: 'goblin', count: 3, hpM: 2.8, atkM: 2.2, defM: 1.8 }] },
    { wave: 10, enemies: [{ type: 'troll', count: 5, hpM: 2.5, atkM: 2.2, defM: 2.0 }, { type: 'orc',    count: 3, hpM: 2.8, atkM: 2.2, defM: 2.0 }] },
    { wave: 11, enemies: [{ type: 'troll', count: 6, hpM: 2.6, atkM: 2.3, defM: 2.0 }, { type: 'orc',    count: 2, hpM: 3.0, atkM: 2.3, defM: 2.0 }] },
    { wave: 12, enemies: [{ type: 'troll', count: 6, hpM: 2.7, atkM: 2.4, defM: 2.1 }, { type: 'orc',    count: 3, hpM: 3.0, atkM: 2.4, defM: 2.1 }] },
    { wave: 13, enemies: [{ type: 'troll', count: 6, hpM: 2.8, atkM: 2.5, defM: 2.2 }, { type: 'orc',    count: 3, hpM: 3.2, atkM: 2.5, defM: 2.2 }] },
    { wave: 14, enemies: [{ type: 'troll', count: 7, hpM: 3.0, atkM: 2.6, defM: 2.3 }, { type: 'orc',    count: 2, hpM: 3.2, atkM: 2.6, defM: 2.3 }] },
    { wave: 15, isBoss: true,
      enemies: [{ type: 'void_lord', count: 1, hpM: 1.0, atkM: 1.0, defM: 1.0 }] },
  ],

  clearReward: {
    gold: 300,
    unlockHero: 'druid',
    cards: ['rejuvenation', 'lethal_strike'],
    title: '深淵征服者',
    desc: '解鎖德魯伊英雄，獲得 300 金幣，牌池加入「新生」與「致命打擊」',
  },
}
