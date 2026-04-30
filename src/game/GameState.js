// GameState.js — 遊戲狀態初始化與管理
import { HEROES } from '../data/heroes.js'

// 建立新遊戲狀態
export function createGameState(heroId = 'knight') {
  const heroData = HEROES[heroId]
  return {
    currentWave: 1,
    hero: { ...heroData },
  }
}

// 波次是否為 Boss 波
export function isBossWave(wave) {
  return wave % 5 === 0
}

// 最大波次
export const MAX_WAVE = 15
