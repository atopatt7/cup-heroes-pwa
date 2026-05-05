// chapters.js — 章節與波次結構
// 3 章節，每章 15 波（波次 1-14 普通 + 波次 15 BOSS）

// 短手函式：建立波次
function w(wave, enemies, isBoss = false) {
  return { wave, label: isBoss ? 'BOSS 關' : `波次 ${wave}`, isBoss, enemies }
}
// 短手函式：建立敵人規格
function e(type, count, hpMult, atkMult) {
  return { type, count, hpMult, atkMult }
}

export const CHAPTERS = [
  // ── 第 1 章：森林小道 ─────────────────────────────────────
  {
    id: 1,
    name: 'Forest Trail',
    nameZh: '森林小道',
    desc: '新手副本，適合熟悉系統',
    bg: 'forest',
    waves: [
      w( 1, [e('slime',  2, 1.0, 1.0)]),
      w( 2, [e('slime',  3, 1.1, 1.0)]),
      w( 3, [e('slime',  2, 1.2, 1.1), e('goblin', 1, 1.0, 1.0)]),
      w( 4, [e('slime',  2, 1.2, 1.1), e('goblin', 2, 1.1, 1.0)]),
      w( 5, [e('slime',  3, 1.3, 1.1), e('goblin', 2, 1.2, 1.1)]),
      w( 6, [e('goblin', 2, 1.3, 1.2), e('orc',    1, 1.0, 1.0)]),
      w( 7, [e('goblin', 3, 1.4, 1.2), e('orc',    1, 1.1, 1.0)]),
      w( 8, [e('goblin', 2, 1.4, 1.3), e('orc',    2, 1.1, 1.1)]),
      w( 9, [e('goblin', 1, 1.5, 1.3), e('orc',    2, 1.2, 1.1)]),
      w(10, [e('goblin', 2, 1.5, 1.4), e('orc',    2, 1.3, 1.2)]),
      w(11, [e('orc',    3, 1.3, 1.2), e('troll',  1, 1.0, 1.0)]),
      w(12, [e('orc',    2, 1.4, 1.3), e('troll',  2, 1.0, 1.0)]),
      w(13, [e('orc',    2, 1.5, 1.4), e('troll',  2, 1.1, 1.0)]),
      w(14, [e('orc',    3, 1.5, 1.4), e('troll',  2, 1.2, 1.1)]),
      w(15, [e('forest_guardian', 1, 1.0, 1.0)], true),
    ],
  },

  // ── 第 2 章：石頭城堡 ─────────────────────────────────────
  {
    id: 2,
    name: 'Stone Castle',
    nameZh: '石頭城堡',
    desc: '中階戰場，trolls 開始登場',
    bg: 'castle',
    waves: [
      w( 1, [e('orc',   2, 1.3, 1.2), e('goblin', 2, 1.4, 1.2)]),
      w( 2, [e('orc',   3, 1.4, 1.2), e('goblin', 2, 1.5, 1.2)]),
      w( 3, [e('orc',   2, 1.5, 1.3), e('troll',  1, 1.0, 1.0)]),
      w( 4, [e('orc',   3, 1.5, 1.3), e('troll',  1, 1.1, 1.0)]),
      w( 5, [e('orc',   2, 1.6, 1.4), e('troll',  2, 1.1, 1.0)]),
      w( 6, [e('orc',   3, 1.6, 1.4), e('troll',  2, 1.2, 1.1)]),
      w( 7, [e('orc',   2, 1.7, 1.5), e('troll',  3, 1.2, 1.1)]),
      w( 8, [e('orc',   2, 1.7, 1.5), e('troll',  3, 1.3, 1.2)]),
      w( 9, [e('orc',   1, 1.8, 1.5), e('troll',  3, 1.4, 1.2)]),
      w(10, [e('troll', 3, 1.5, 1.3), e('orc',    2, 1.8, 1.6)]),
      w(11, [e('troll', 4, 1.5, 1.3), e('orc',    1, 1.9, 1.6)]),
      w(12, [e('troll', 4, 1.6, 1.4), e('orc',    2, 2.0, 1.7)]),
      w(13, [e('troll', 4, 1.7, 1.5), e('orc',    2, 2.0, 1.8)]),
      w(14, [e('troll', 5, 1.8, 1.5), e('orc',    2, 2.1, 1.8)]),
      w(15, [e('iron_knight', 1, 1.0, 1.0)], true),
    ],
  },

  // ── 第 3 章：暗黑地城 ─────────────────────────────────────
  {
    id: 3,
    name: 'Dark Dungeon',
    nameZh: '暗黑地城',
    desc: '高難度深淵，只有強者能過',
    bg: 'dungeon',
    waves: [
      w( 1, [e('troll', 3, 1.8, 1.6), e('orc',    2, 2.0, 1.7)]),
      w( 2, [e('troll', 3, 1.9, 1.7), e('orc',    3, 2.0, 1.8)]),
      w( 3, [e('troll', 4, 2.0, 1.7), e('orc',    2, 2.2, 1.8)]),
      w( 4, [e('troll', 4, 2.0, 1.8), e('orc',    3, 2.2, 1.9)]),
      w( 5, [e('troll', 4, 2.1, 1.8), e('orc',    3, 2.4, 2.0)]),
      w( 6, [e('troll', 5, 2.2, 1.9), e('orc',    2, 2.4, 2.0)]),
      w( 7, [e('troll', 5, 2.2, 2.0), e('orc',    3, 2.5, 2.1)]),
      w( 8, [e('troll', 5, 2.3, 2.0), e('orc',    3, 2.6, 2.1)]),
      w( 9, [e('troll', 5, 2.4, 2.1), e('goblin', 3, 2.8, 2.2)]),
      w(10, [e('troll', 5, 2.5, 2.2), e('orc',    3, 2.8, 2.2)]),
      w(11, [e('troll', 6, 2.6, 2.3), e('orc',    2, 3.0, 2.3)]),
      w(12, [e('troll', 6, 2.7, 2.4), e('orc',    3, 3.0, 2.4)]),
      w(13, [e('troll', 6, 2.8, 2.5), e('orc',    3, 3.2, 2.5)]),
      w(14, [e('troll', 7, 3.0, 2.6), e('orc',    2, 3.2, 2.6)]),
      w(15, [e('void_lord', 1, 1.0, 1.0)], true),
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

// Boss emoji per chapter (for HomeScene preview)
export const CHAPTER_BOSS_EMOJI = ['🌲', '🤺', '👑']

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
        type:  spec.type,
        hp:    Math.round(template.hp    * spec.hpMult),
        maxHp: Math.round(template.hp    * spec.hpMult),
        atk:   Math.round(template.atk   * spec.atkMult),
        x: xOffset,
        y: 0,
      })
      xOffset += template.size + 20
    }
  }

  return enemies
}

// 取得章節/波次標籤（BattleScene 用）
export function getWaveLabel(chapterIdx, waveIdx) {
  const chapter = CHAPTERS[chapterIdx]
  if (!chapter) return ''
  const wave = chapter.waves[waveIdx]
  return wave ? `第${chapterIdx + 1}章  ${wave.label}` : ''
}

export const TOTAL_CHAPTERS  = CHAPTERS.length        // 3
export const WAVES_PER_CHAPTER = 15
