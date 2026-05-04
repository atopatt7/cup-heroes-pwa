// SaveManager.js — 管理 localStorage 存檔

const SAVE_KEY = 'cup-heroes-save-v2'

const DEFAULT_SAVE = {
  unlockedHeroes:   ['knight'],  // 已解鎖的英雄 id
  bestWave:         0,           // 最高通關波次
  unlockedLevelIdx: 0,           // 已解鎖到第幾關（0 = 第 1 關）
  gold:             0,
  diamonds:         0,
  playerLevel:      1,
  playerExp:        0,
  selectedHeroId:   'knight',
  heroDeck:         {},          // { heroId: [cardId, ...] }
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

  // 更新解鎖關卡進度（只前進，不倒退）
  advanceLevel(levelIdx) {
    const data = this.load()
    if (levelIdx > (data.unlockedLevelIdx ?? 0)) {
      data.unlockedLevelIdx = levelIdx
      this.save(data)
    }
  },

  // 設定當前選用英雄
  setSelectedHero(heroId) {
    const data = this.load()
    data.selectedHeroId = heroId
    this.save(data)
  },

  // 儲存英雄牌組
  setHeroDeck(heroId, deck) {
    const data = this.load()
    if (!data.heroDeck) data.heroDeck = {}
    data.heroDeck[heroId] = [...deck]
    this.save(data)
  },

  // 增加金幣
  addGold(amount) {
    const data = this.load()
    data.gold = (data.gold || 0) + amount
    this.save(data)
    return data.gold
  },

  // 增加鑽石
  addDiamonds(amount) {
    const data = this.load()
    data.diamonds = (data.diamonds || 0) + amount
    this.save(data)
    return data.diamonds
  },

  // 增加經驗值（自動升級）
  addExp(amount) {
    const data = this.load()
    data.playerExp   = (data.playerExp   || 0) + amount
    data.playerLevel = (data.playerLevel || 1)
    let expNeeded = data.playerLevel * 100
    while (data.playerExp >= expNeeded) {
      data.playerExp   -= expNeeded
      data.playerLevel += 1
      expNeeded = data.playerLevel * 100
    }
    this.save(data)
    return { level: data.playerLevel, exp: data.playerExp }
  },

  reset() {
    localStorage.removeItem(SAVE_KEY)
  },
}
