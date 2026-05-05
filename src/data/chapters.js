// chapters.js — 章節與波次結構
// 3 章節，每章 3 波普通 + 1 波 Boss
// 靈感來自原版 Cup Heroes 的 Chapter Race 系統

export const CHAPTERS = [
  {
    id: 1,
    name: 'Forest Trail',
    nameZh: '森林小道',
    bg: 'forest',   // BattleScene 用來選背景色調
    waves: [
      {
        wave: 1, label: '波次 1',
        enemies: [
          { type: 'slime',  count: 2, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
      {
        wave: 2, label: '波次 2',
        enemies: [
          { type: 'slime',  count: 2, hpMult: 1.1, atkMult: 1.1 },
          { type: 'goblin', count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
      {
        wave: 3, label: '波次 3',
        enemies: [
          { type: 'goblin', count: 2, hpMult: 1.2, atkMult: 1.2 },
          { type: 'orc',    count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
      {
        wave: 4, label: 'BOSS 關', isBoss: true,
        enemies: [
          { type: 'forest_guardian', count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
    ],
  },

  {
    id: 2,
    name: 'Stone Castle',
    nameZh: '石頭城堡',
    bg: 'castle',
    waves: [
      {
        wave: 1, label: '波次 1',
        enemies: [
          { type: 'orc',    count: 2, hpMult: 1.3, atkMult: 1.2 },
          { type: 'goblin', count: 1, hpMult: 1.2, atkMult: 1.1 },
        ],
      },
      {
        wave: 2, label: '波次 2',
        enemies: [
          { type: 'orc',    count: 2, hpMult: 1.5, atkMult: 1.3 },
          { type: 'troll',  count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
      {
        wave: 3, label: '波次 3',
        enemies: [
          { type: 'troll',  count: 2, hpMult: 1.2, atkMult: 1.2 },
          { type: 'orc',    count: 2, hpMult: 1.5, atkMult: 1.3 },
        ],
      },
      {
        wave: 4, label: 'BOSS 關', isBoss: true,
        enemies: [
          { type: 'iron_knight', count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
    ],
  },

  {
    id: 3,
    name: 'Dark Dungeon',
    nameZh: '暗黑地城',
    bg: 'dungeon',
    waves: [
      {
        wave: 1, label: '波次 1',
        enemies: [
          { type: 'troll',  count: 2, hpMult: 1.6, atkMult: 1.5 },
          { type: 'orc',    count: 2, hpMult: 1.8, atkMult: 1.4 },
        ],
      },
      {
        wave: 2, label: '波次 2',
        enemies: [
          { type: 'troll',  count: 3, hpMult: 1.8, atkMult: 1.6 },
          { type: 'goblin', count: 2, hpMult: 2.0, atkMult: 1.5 },
        ],
      },
      {
        wave: 3, label: '波次 3',
        enemies: [
          { type: 'troll',  count: 2, hpMult: 2.0, atkMult: 1.8 },
          { type: 'orc',    count: 3, hpMult: 2.0, atkMult: 1.6 },
        ],
      },
      {
        wave: 4, label: 'BOSS 關', isBoss: true,
        enemies: [
          { type: 'void_lord', count: 1, hpMult: 1.0, atkMult: 1.0 },
        ],
      },
    ],
  },
]

// 基礎敵人模板
export const ENEMY_TYPES = {
  slime: {
    name: 'Slime', nameZh: '史萊姆',
    hp: 40, atk: 8, def: 2,
    color: '#4caf50', size: 38,
    reward: 5,
    emoji: '🟢',
  },
  goblin: {
    name: 'Goblin', nameZh: '哥布林',
    hp: 60, atk: 12, def: 4,
    color: '#9c27b0', size: 44,
    reward: 8,
    emoji: '👺',
  },
  orc: {
    name: 'Orc', nameZh: '半獸人',
    hp: 90, atk: 18, def: 8,
    color: '#ff6f00', size: 52,
    reward: 12,
    emoji: '👹',
  },
  troll: {
    name: 'Troll', nameZh: '巨魔',
    hp: 140, atk: 24, def: 12,
    color: '#c62828', size: 60,
    reward: 18,
    emoji: '🧟',
  },
  // Boss 類型
  forest_guardian: {
    name: 'Forest Guardian', nameZh: '森林守護者',
    hp: 280, atk: 22, def: 10,
    color: '#2e7d32', size: 76,
    reward: 40,
    isBoss: true,
    emoji: '🌲',
  },
  iron_knight: {
    name: 'Iron Knight', nameZh: '鐵甲騎士',
    hp: 420, atk: 30, def: 18,
    color: '#546e7a', size: 76,
    reward: 60,
    isBoss: true,
    emoji: '🤺',
  },
  void_lord: {
    name: 'Void Lord', nameZh: '虛空領主',
    hp: 600, atk: 40, def: 22,
    color: '#4a148c', size: 80,
    reward: 100,
    isBoss: true,
    emoji: '👑',
  },
}

// 根據章節 + 波次資料生成敵人列表
export function generateWaveEnemies(chapterIdx, waveIdx) {
  const chapter = CHAPTERS[chapterIdx]
  if (!chapter) return []
  const waveData = chapter.waves[waveIdx]
  if (!waveData) return []

  const enemies = []
  let xOffset = 260

  for (const spec of waveData.enemies) {
    const template = ENEMY_TYPES[spec.type]
    if (!template) continue
    for (let i = 0; i < spec.count; i++) {
      enemies.push({
        ...template,
        hp:    Math.round(template.hp    * spec.hpMult),
        maxHp: Math.round(template.hp    * spec.hpMult),
        atk:   Math.round(template.atk   * spec.atkMult),
        x: xOffset,
        y: 0, // BattleScene 根據 groundY 設定
      })
      xOffset += template.size + 20
    }
  }

  return enemies
}

// 取得章節/波次標籤
export function getWaveLabel(chapterIdx, waveIdx) {
  const chapter = CHAPTERS[chapterIdx]
  if (!chapter) return ''
  const wave = chapter.waves[waveIdx]
  return wave ? `第${chapterIdx + 1}章 ${wave.label}` : ''
}

export const TOTAL_CHAPTERS = CHAPTERS.length
