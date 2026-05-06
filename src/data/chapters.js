// chapters.js — 章節資料入口
import { chapter1 } from './chapters/chapter1.js'
import { chapter2 } from './chapters/chapter2.js'
import { chapter3 } from './chapters/chapter3.js'
import { ENEMY_TYPES } from './enemies.js'

export const CHAPTERS = [chapter1, chapter2, chapter3]

export const TOTAL_CHAPTERS    = CHAPTERS.length   // 3
export const WAVES_PER_CHAPTER = 15

// Boss emoji 供 HomeScene 預覽
export const CHAPTER_BOSS_EMOJI = ['🌲', '🤺', '👑']

// 根據章節 + 波次索引生成實際敵人列表
export function generateWaveEnemies(chapterIdx, waveIdx) {
  const chapter  = CHAPTERS[chapterIdx]
  if (!chapter) return []
  const waveData = chapter.waves[waveIdx]
  if (!waveData) return []

  const enemies = []

  for (const spec of waveData.enemies) {
    const template = ENEMY_TYPES[spec.type]
    if (!template) continue

    for (let i = 0; i < spec.count; i++) {
      const hp  = Math.round(template.baseHp  * spec.hpM)
      const atk = Math.round(template.baseAtk * spec.atkM)
      const def = Math.round(template.baseDef * (spec.defM || 1.0))
      enemies.push({
        ...template,
        hp,
        maxHp: hp,
        atk,
        def,
        x: 0,   // BattleScene 會依等角位置覆寫
        y: 0,
      })
    }
  }

  return enemies
}

// 取得波次標籤（BattleScene 用）
export function getWaveLabel(chapterIdx, waveIdx) {
  const chapter = CHAPTERS[chapterIdx]
  if (!chapter) return ''
  const wave = chapter.waves[waveIdx]
  if (!wave) return ''
  const label = wave.isBoss ? 'BOSS 關' : ('波次 ' + wave.wave)
  return '第' + (chapterIdx + 1) + '章  ' + label
}

// 取得章節通關獎勵
export function getChapterReward(chapterIdx) {
  const chapter = CHAPTERS[chapterIdx]
  return chapter ? chapter.clearReward : null
}
