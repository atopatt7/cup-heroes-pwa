// AutoBattle.js — 自動戰鬥引擎（支援卡牌 + 裝備 + 套裝技能）
import { getCardById } from '../data/cards.js'

function _cardColor(card) {
  if (!card) return '#c0cfe0'
  return card.group === 'hero' ? '#ffd060' : '#88c0ff'
}

// ── 建立戰鬥狀態 ──────────────────────────────────────────
// equipStats:   { atk, hp, def, crit, critMult, spd }（來自 EquipmentManager.getEquipmentStats）
// activeBonuses: [{ setId, bonus: { effect, params } }]（來自 EquipmentManager.getActiveSetBonuses）
export function createBattleState(heroData, enemies, cardStars = {}, equipStats = {}, activeBonuses = []) {
  const bonusHp = equipStats.hp || 0

  const player = {
    ...heroData,
    hp:       heroData.hp       + bonusHp,
    maxHp:    heroData.maxHp    + bonusHp,
    atk:      (heroData.atk      || 0)    + (equipStats.atk      || 0),
    def:      (heroData.def      || 0)    + (equipStats.def      || 0),
    crit:     (heroData.crit     || 0.15) + (equipStats.crit     || 0),
    critMult: (heroData.critMult || 2.0)  + (equipStats.critMult || 0),
    dmgReduction: 0,
    dmgBonus:     1,
    bonusBalls:   heroData.bonusBalls || 0,
  }

  // 套用套裝技能到 player 狀態
  for (const { bonus } of activeBonuses) {
    _applySetBonusToPlayer(player, bonus)
  }

  const enemyCopies = enemies.map((e, idx) => ({
    ...e,
    maxHp: e.maxHp || e.hp,
    _id: e._id || ('e' + idx),
  }))

  const state = {
    player,
    enemies: enemyCopies,
    cardStars,
    log:     [],
    effects: [],
    frame:   0,
    done:    false,
    result:  null,
  }

  _applyPassives(state)
  _applyBattleStart(state)
  return state
}

// ── 套裝技能初始化 ────────────────────────────────────────
function _applySetBonusToPlayer(player, bonus) {
  const p = bonus.params
  switch (bonus.effect) {
    case 'double_shot':
      // 連射之林：攻擊後 30% 觸發第二刀 60% 傷害
      player._doubleShot = { chance: p.chance, damageRatio: p.damageRatio }
      break
    case 'iron_block':
      // 鐵壁格擋：受擊時 35% 機率傷害歸零
      player._ironBlock = { chance: p.chance }
      break
    case 'assassinate':
      // 暗殺蓄力：每 5 次攻擊必定 3x 暴擊
      player._assassinate = { stacksRequired: p.stacksRequired, critMultiplier: p.critMultiplier, count: 0 }
      break
    case 'berserker_rage':
      // 瀕死狂化：血量低於門檻時傷害加成
      player._berserkerRage = { threshold1: p.threshold1, bonus1: p.bonus1, threshold2: p.threshold2, bonus2: p.bonus2 }
      break
    case 'void_chain':
      // 虛空連鎖：連續擊殺疊加傷害
      player._voidChain = { bonusPerKill: p.bonusPerKill, stacks: 0 }
      break
    case 'holy_mending':
      // 聖光庇佑：每 3 殺回血 15%
      player._holyMending = { killsRequired: p.killsRequired, healRatio: p.healRatio, killCount: 0 }
      break
  }
}

// ── 被動卡牌 ─────────────────────────────────────────────
function _applyPassives(state) {
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card  = getCardById(cardId)
    const stars = state.cardStars[cardId] || 1
    if (card && card.trigger === 'passive' && typeof card.apply === 'function') {
      const msg = card.apply(state, null, stars)
      if (msg) state.log.push({ text: msg, color: _cardColor(card), frame: 0 })
    }
  }
}

function _applyBattleStart(state) {
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card  = getCardById(cardId)
    const stars = state.cardStars[cardId] || 1
    if (card && card.trigger === 'battle_start' && typeof card.apply === 'function') {
      const msg = card.apply(state, null, stars)
      if (msg) state.log.push({ text: msg, color: _cardColor(card), frame: 0 })
    }
  }
}

// ── 玩家攻擊 ─────────────────────────────────────────────
export function playerAttack(state) {
  const target = state.enemies.find(e => e.hp > 0)
  if (!target) return null

  // ── ATK 計算（含嗜血卡牌）
  let atk = state.player.atk
  if (state.player._bloodThirst) {
    const { pct, cap } = state.player._bloodThirst
    const missingPct   = 1 - state.player.hp / state.player.maxHp
    const stacks       = Math.floor(missingPct * 10)
    atk = Math.floor(atk * (1 + Math.min(stacks * pct, cap) / 100))
  }

  // ── 不死之怒 / 再生卡牌
  if (state.player._undyingRage && state.player.hp < state.player.maxHp * 0.3) {
    const regen = Math.floor(state.player.maxHp * state.player._undyingRage)
    state.player.hp = Math.min(state.player.hp + regen, state.player.maxHp)
    if (regen > 0) _addEffect(state, target.x || 200, (target.y || 300) - 30, '+' + regen + 'HP 不死', '#ff4444')
  }
  if (state.player._regenPct) {
    const regen = Math.floor(state.player.maxHp * state.player._regenPct)
    state.player.hp = Math.min(state.player.hp + regen, state.player.maxHp)
    if (regen > 0) _addEffect(state, target.x || 200, (target.y || 300) - 30, '+' + regen + 'HP 新生', '#44dd88')
  }

  // ── 傷害加成（卡牌怒氣）
  let dmgBonus = state.player.dmgBonus || 1
  if (state.player._rageDmgBonus) {
    dmgBonus += state.player._rageDmgBonus
    state.player._rageDmgBonus = 0
  }

  // ── 瀕死狂化（套裝）
  if (state.player._berserkerRage) {
    const hpPct = state.player.hp / state.player.maxHp
    const br    = state.player._berserkerRage
    if (hpPct < br.threshold2)     dmgBonus += br.bonus2
    else if (hpPct < br.threshold1) dmgBonus += br.bonus1
  }

  // ── 虛空連鎖（套裝）加成
  let voidBonus = 1.0
  if (state.player._voidChain && state.player._voidChain.stacks > 0) {
    voidBonus = 1 + state.player._voidChain.stacks * state.player._voidChain.bonusPerKill
  }

  // ── 暗殺蓄力（套裝）計數
  let assassinateCritMult = null
  if (state.player._assassinate) {
    const sa = state.player._assassinate
    sa.count++
    if (sa.count >= sa.stacksRequired) {
      sa.count          = 0
      assassinateCritMult = sa.critMultiplier  // 觸發本次攻擊 3x 暴擊
    }
  }

  // ── 暴擊判斷
  const guaranteedCrit = assassinateCritMult !== null || (state.player._garanteedCrits || 0) > 0
  if ((state.player._garanteedCrits || 0) > 0) state.player._garanteedCrits--

  const isCrit     = guaranteedCrit || Math.random() < (state.player.crit || 0.15)
  const critMult   = assassinateCritMult || (state.player.critMult || 2)

  // ── 傷害計算
  let damage = Math.max(1, Math.round(
    (atk - (target.def || 0) * 0.5) * dmgBonus * voidBonus
  ))
  if (isCrit) damage = Math.floor(damage * critMult)

  target.hp -= damage

  // ── 虛空連鎖：擊殺疊加，未殺重置
  if (state.player._voidChain) {
    if (target.hp <= 0) {
      state.player._voidChain.stacks++
      if (state.player._voidChain.stacks > 1) {
        _addEffect(state, target.x || 300, (target.y || 300) - 50,
          '虛空連鎖 x' + state.player._voidChain.stacks, '#cc88ff')
      }
    } else {
      state.player._voidChain.stacks = 0  // 未擊殺，清零
    }
  }

  const ctx = { damage, isCrit, target }

  // ── on_attack 卡牌
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card  = getCardById(cardId)
    const stars = state.cardStars[cardId] || 1
    if (card && card.trigger === 'on_attack' && typeof card.apply === 'function') {
      const msg = card.apply(state, ctx, stars)
      if (msg) _addEffect(state, target.x || 300, (target.y || 300) - 30, msg, _cardColor(card))
    }
  }

  // ── on_crit 卡牌
  if (isCrit) {
    for (const cardId of deck) {
      const card  = getCardById(cardId)
      const stars = state.cardStars[cardId] || 1
      if (card && card.trigger === 'on_crit' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx, stars)
        if (msg) _addEffect(state, target.x || 300, (target.y || 300) - 50, msg, '#ffe082')
      }
    }
  }

  // ── on_kill 卡牌 + 套裝
  let extraDamage = 0
  if (target.hp <= 0) {
    for (const cardId of deck) {
      const card  = getCardById(cardId)
      const stars = state.cardStars[cardId] || 1
      if (card && card.trigger === 'on_kill' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx, stars)
        if (msg) _addEffect(state, target.x || 300, (target.y || 300) - 40, msg, '#ffd700')
      }
    }

    // 聖光庇佑：計殺數，每 3 殺回血
    if (state.player._holyMending) {
      const hm = state.player._holyMending
      hm.killCount++
      if (hm.killCount >= hm.killsRequired) {
        hm.killCount = 0
        const heal = Math.floor(state.player.maxHp * hm.healRatio)
        state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
        _addEffect(state, state.player._posX || 150, (state.player._posY || 400) - 40,
          '+' + heal + ' 聖光庇佑', '#ffe066')
      }
    }
  }

  // ── 連射之林（套裝）：30% 機率追加一刀
  if (state.player._doubleShot) {
    const ds = state.player._doubleShot
    if (Math.random() < ds.chance) {
      const extraTarget = state.enemies.find(e => e.hp > 0) // 可能是下一個
      if (extraTarget) {
        extraDamage = Math.max(1, Math.round(damage * ds.damageRatio))
        extraTarget.hp -= extraDamage
        _addEffect(state, extraTarget.x || 300, (extraTarget.y || 300) - 60,
          '連射 +' + extraDamage, '#88ffdd')
      }
    }
  }

  const logText = isCrit ? ('暴擊！' + damage) : ('傷害 ' + damage)
  state.log.push({ text: logText, color: isCrit ? '#ffd700' : '#ff8888', frame: state.frame })

  return { damage, isCrit, target, extraDamage }
}

// ── 敵人攻擊 ─────────────────────────────────────────────
export function enemyAttack(state) {
  const alive = state.enemies.filter(e => e.hp > 0)
  if (alive.length === 0) return null

  const results = []
  const deck    = state.player.deck || []

  for (const enemy of alive) {
    if (enemy._stunned) {
      enemy._stunned = false
      state.log.push({ text: (enemy.nameZh || enemy.name) + ' 眩暈', color: '#88ffcc', frame: state.frame })
      results.push({ attacker: enemy, damage: 0, stunned: true })
      continue
    }

    let damage = Math.max(1, Math.round(
      (enemy.atk || 10) * (1 - (state.player.dmgReduction || 0)) - (state.player.def || 0) * 0.3
    ))
    const ctx = { damage, attacker: enemy }

    // on_hit 卡牌
    for (const cardId of deck) {
      const card  = getCardById(cardId)
      const stars = state.cardStars[cardId] || 1
      if (card && card.trigger === 'on_hit' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx, stars)
        if (msg) _addEffect(state, 195, 380, msg, _cardColor(card))
      }
    }

    // 鐵壁格擋（套裝）：35% 機率傷害歸零
    if (state.player._ironBlock && Math.random() < state.player._ironBlock.chance) {
      ctx.damage = 0
      _addEffect(state, state.player._posX || 150, (state.player._posY || 400) - 50,
        '格擋！', '#88ccff')
    }

    damage = Math.max(0, ctx.damage)
    state.player.hp -= damage
    results.push({ attacker: enemy, damage })
    state.log.push({
      text:  (enemy.nameZh || enemy.name) + ' 攻擊 -' + damage,
      color: '#ff6666',
      frame: state.frame,
    })
  }

  return results
}

// ── 單一敵人攻擊（供依序攻擊系統使用）────────────────────
export function enemyAttackOne(state, enemy) {
  if (!enemy || enemy.hp <= 0) return null
  const deck = state.player.deck || []

  if (enemy._stunned) {
    enemy._stunned = false
    state.log.push({ text: (enemy.nameZh || enemy.name) + ' 眩暈', color: '#88ffcc', frame: state.frame })
    return { attacker: enemy, damage: 0, stunned: true }
  }

  let damage = Math.max(1, Math.round(
    (enemy.atk || 10) * (1 - (state.player.dmgReduction || 0)) - (state.player.def || 0) * 0.3
  ))
  const ctx = { damage, attacker: enemy }

  for (const cardId of deck) {
    const card  = getCardById(cardId)
    const stars = state.cardStars[cardId] || 1
    if (card && card.trigger === 'on_hit' && typeof card.apply === 'function') {
      const msg = card.apply(state, ctx, stars)
      if (msg) _addEffect(state, 195, 380, msg, _cardColor(card))
    }
  }

  if (state.player._ironBlock && Math.random() < state.player._ironBlock.chance) {
    ctx.damage = 0
    _addEffect(state, state.player._posX || 150, (state.player._posY || 400) - 50, 'block!', '#88ccff')
  }

  damage = Math.max(0, ctx.damage)
  state.player.hp -= damage
  state.log.push({
    text:  (enemy.nameZh || enemy.name) + ' atk -' + damage,
    color: '#ff6666',
    frame: state.frame,
  })
  return { attacker: enemy, damage }
}

export function getNextTarget(state) {
  return state.enemies.find(e => e.hp > 0) || null
}

export function checkBattleEnd(state) {
  if (state.enemies.every(e => e.hp <= 0)) {
    state.done = true; state.result = 'victory'; return 'victory'
  }
  if (state.player.hp <= 0) {
    state.done = true; state.result = 'defeat'; return 'defeat'
  }
  return null
}

function _addEffect(state, x, y, text, color) {
  state.effects.push({ x, y, text, color, life: 60 })
}
