import heroData from '../data/heroes.json'

/**
 * HeroManager
 * 負責英雄的狀態管理、存檔、升級
 */
export class HeroManager {
  constructor() {
    this.heroes = JSON.parse(JSON.stringify(heroData)) // 深拷貝
    this.activeHeroId = 'knight'
    this.passives = [] // 已獲得的被動效果 id
  }

  get activeHero() {
    return this.heroes.find((h) => h.id === this.activeHeroId)
  }

  /** 取得英雄當前戰鬥用數值（含升級加成） */
  getCombatStats() {
    return { ...this.activeHero.baseStats }
  }

  /** 套用升級卡效果 */
  applyUpgrade(upgrade) {
    const hero = this.activeHero
    const { effect } = upgrade

    if (effect.stat) {
      hero.baseStats[effect.stat] += effect.value
    } else if (effect.type === 'heal') {
      // Heal 由 BattleEngine 處理
    } else if (effect.type === 'passive') {
      if (!this.passives.includes(effect.id)) {
        this.passives.push(effect.id)
      }
    }
  }

  hasPassive(id) {
    return this.passives.includes(id)
  }

  /** 解鎖英雄 */
  unlock(heroId) {
    const hero = this.heroes.find((h) => h.id === heroId)
    if (hero) hero.unlocked = true
  }

  /** 存檔到 localStorage */
  save() {
    localStorage.setItem(
      'cup-heroes-save',
      JSON.stringify({
        heroes: this.heroes,
        activeHeroId: this.activeHeroId,
        passives: this.passives,
      })
    )
  }

  /** 從 localStorage 讀取存檔 */
  load() {
    const raw = localStorage.getItem('cup-heroes-save')
    if (!raw) return false
    try {
      const data = JSON.parse(raw)
      this.heroes = data.heroes
      this.activeHeroId = data.activeHeroId
      this.passives = data.passives || []
      return true
    } catch {
      return false
    }
  }
}
