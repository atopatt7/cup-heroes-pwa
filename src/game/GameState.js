// GameState.js — 遊戲狀態（章節系統版本）
import { getHero } from '../data/heroes.js'
import { CHAPTERS } from '../data/chapters.js'

// 建立新遊戲狀態
export function createGameState(heroId = 'knight') {
  return {
    chapterIdx: 0,
    waveIdx:    0,
    hero:       getHero(heroId),
    score:      0,
    gold:       0,
  }
}

// 取得當前章節資料
export function getCurrentChapter(gs) {
  return CHAPTERS[gs.chapterIdx] || CHAPTERS[0]
}

// 取得當前波次資料
export function getCurrentWave(gs) {
  const ch = getCurrentChapter(gs)
  return ch.waves[gs.waveIdx] || ch.waves[0]
}

// 是否為 Boss 波次
export function isBossWave(gs) {
  const wave = getCurrentWave(gs)
  return wave?.isBoss ?? false
}

// 章節總數
export const TOTAL_CHAPTERS = CHAPTERS.length
export const WAVES_PER_CHAPTER = 4
