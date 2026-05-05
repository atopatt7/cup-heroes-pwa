// SaveManager.js — 管理 localStorage 存檔

const SAVE_KEY = 'cup-heroes-save-v2'

const DEFAULT_SAVE = {
  unlockedHeroes:   ['knight'],
  bestWave:         0,
  unlockedLevelIdx: 0,
  gold:             0,
  diamonds:         0,
  playerLevel:      1,
  playerExp:        0,
  selectedHeroId:   'knight',
  heroDeck:         {},
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
      console.warn('[SaveManager] cannot write to localStorage')
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

  advanceLevel(levelIdx) {
    const data = this.load()
    if (levelIdx > (data.unlockedLevelIdx ?? 0)) {
      data.unlockedLevelIdx = levelIdx
      this.save(data)
    }
  },

  setSelectedHero(heroId) {
    const data = this.load()
    data.selectedHeroId = heroId
    this.save(data)
  },

  setHeroDeck(heroId, deck) {
    const data = this.load()
    if (!data.heroDeck) data.heroDeck = {}
    data.heroDeck[heroId] = [...deck]
    this.save(data)
  },

  addGold(amount) {
    const data = this.load()
    data.gold = (data.gold || 0) + amount
    this.save(data)
    return data.gold
  },

  addDiamonds(amount) {
    const data = this.load()
    data.diamonds = (data.diamonds || 0) + amount
    this.save(data)
    return data.diamonds
  },

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
