// SaveManager.js
// 管理 localStorage 存檔：解鎖英雄、最高波次

const SAVE_KEY = 'cup-heroes-save-v1'

const DEFAULT_SAVE = {
  unlockedHeroes: ['knight'],  // 已解鎖的英雄 id
  bestWave: 0,                 // 最高通關波次
}

export const SaveManager = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return { ...DEFAULT_SAVE }
      return { ...DEFAULT_SAVE, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_SAVE }
    }
  },

  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      console.warn('[SaveManager] 無法寫入 localStorage')
    }
  },

  unlockHero(heroId) {
    const data = this.load()
    if (!data.unlockedHeroes.includes(heroId)) {
      data.unlockedHeroes.push(heroId)
      this.save(data)
    }
  },

  updateBestWave(wave) {
    const data = this.load()
    if (wave > data.bestWave) {
      data.bestWave = wave
      this.save(data)
    }
  },

  isUnlocked(heroId) {
    return this.load().unlockedHeroes.includes(heroId)
  },

  reset() {
    localStorage.removeItem(SAVE_KEY)
  },
}
