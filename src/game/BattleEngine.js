// BattleEngine.js — 傷害計算邏輯，與畫面無關
export const BattleEngine = {
  // 計算實際傷害
  calcDamage(atk, def, critRate = 0.15, critMult = 2) {
    const base = Math.max(1, Math.floor(atk - def * 0.5) + Math.floor(Math.random() * 5))
    const isCrit = Math.random() < critRate
    return {
      damage: isCrit ? Math.floor(base * critMult) : base,
      isCrit,
    }
  },

  // 玩家攻擊目標
  playerAttack(player, target) {
    const { damage, isCrit } = this.calcDamage(
      player.atk,
      target.def,
      player.crit || 0.15,
      player.critMult || 2
    )
    target.hp = Math.max(0, target.hp - damage)
    return { damage, isCrit, targetDead: target.hp <= 0 }
  },

  // 敵人攻擊玩家
  enemyAttack(enemies, player) {
    const results = []
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue
      const { damage } = this.calcDamage(enemy.atk, player.def, 0.05, 1.5)
      player.hp = Math.max(0, player.hp - damage)
      results.push({ enemy, damage })
    }
    return { results, playerDead: player.hp <= 0 }
  },
}
