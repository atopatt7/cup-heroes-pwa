/**
 * BattleEngine
 * 回合制戰鬥邏輯核心
 *
 * 戰鬥流程：
 *   英雄攻擊敵人 → 敵人攻擊英雄 → 判斷勝負
 *   可觸發被動：double_atk（20% 連擊）、shield（首次減傷）
 */
export class BattleEngine {
  /**
   * @param {object} heroStats - { hp, atk, def, maxHp }
   * @param {object} enemyStats - { hp, atk, def, nameZh, emoji, reward }
   * @param {HeroManager} heroManager
   */
  constructor(heroStats, enemyStats, heroManager) {
    this.hero = { ...heroStats, maxHp: heroStats.hp, currentHp: heroStats.hp }
    this.enemy = { ...enemyStats, currentHp: enemyStats.hp }
    this.hm = heroManager
    this.log = []           // 戰鬥紀錄
    this.round = 0
    this.shieldUsed = false // 盾牆是否已消耗
    this.state = 'idle'     // 'idle' | 'hero_turn' | 'enemy_turn' | 'win' | 'lose'
  }

  /** 計算傷害（最少 1 點） */
  calcDamage(atk, def) {
    return Math.max(1, atk - def)
  }

  /** 執行一個完整回合（英雄攻 → 敵人攻） */
  doRound() {
    if (this.state === 'win' || this.state === 'lose') return null

    this.round++
    const events = []

    // ── 英雄攻擊 ──────────────────────────────────────────
    let heroDmg = this.calcDamage(this.hero.atk, this.enemy.def)
    this.enemy.currentHp -= heroDmg
    events.push({ type: 'hero_attack', damage: heroDmg })

    // 被動：連擊（20%）
    if (this.hm.hasPassive('double_atk') && Math.random() < 0.2) {
      this.enemy.currentHp -= heroDmg
      events.push({ type: 'hero_attack', damage: heroDmg, isDouble: true })
    }

    if (this.enemy.currentHp <= 0) {
      this.enemy.currentHp = 0
      this.state = 'win'
      events.push({ type: 'enemy_dead', reward: this.enemy.reward })
      this._addLog(events)
      return { events, state: this.state }
    }

    // ── 敵人攻擊 ──────────────────────────────────────────
    let enemyDmg = this.calcDamage(this.enemy.atk, this.hero.def)

    // 被動：盾牆（首次受擊減傷 50%）
    if (this.hm.hasPassive('shield') && !this.shieldUsed) {
      enemyDmg = Math.floor(enemyDmg * 0.5)
      this.shieldUsed = true
      events.push({ type: 'shield_trigger' })
    }

    this.hero.currentHp -= enemyDmg
    events.push({ type: 'enemy_attack', damage: enemyDmg })

    if (this.hero.currentHp <= 0) {
      this.hero.currentHp = 0
      this.state = 'lose'
    }

    this._addLog(events)
    return { events, state: this.state }
  }

  /** 治療英雄 */
  heal(amount) {
    this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + amount)
  }

  _addLog(events) {
    this.log.push({ round: this.round, events })
  }

  get heroHpPercent() {
    return this.hero.currentHp / this.hero.maxHp
  }

  get enemyHpPercent() {
    return this.enemy.currentHp / this.enemy.hp
  }
}
