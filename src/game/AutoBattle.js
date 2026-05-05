// AutoBattle.js — 自動戰鬥引擎（支援卡牌星級觸發效果）
import { getCardById } from '../data/cards.js'

function _cardColor(card) {
  if (!card) return '#c0cfe0'
  return card.group === 'hero' ? '#ffd060' : '#88c0ff'
}

export function createBattleState(heroData, enemies, cardStars = {}) {
  const player = {
    ...heroData,
    hp:    heroData.hp,
    maxHp: heroData.maxHp,
    dmgReduction: 0,
    dmgBonus: 1,
    bonusBalls: heroData.bonusBalls || 0,
  }
  const enemyCopies = enemies.map((e, idx) => ({
    ...e,
    maxHp: e.maxHp || e.hp,
    _id: e._id || `e${idx}`,
  }))
  const state = {
    player,
    enemies: enemyCopies,
    cardStars,
    log: [],
    effects: [],
    frame: 0,
    done: false,
    result: null,
  }
  _applyPassives(state)
  _applyBattleStart(state)
  return state
}

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

export function playerAttack(state) {
  const target = state.enemies.find(e => e.hp > 0)
  if (!target) return null

  let atk = state.player.atk
  if (state.player._bloodThirst) {
    const { pct, cap } = state.player._bloodThirst
    const missingPct = 1 - state.player.hp / state.player.maxHp
    const stacks     = Math.floor(missingPct * 10)
    const bonus      = Math.min(stacks * pct, cap)
    atk = Math.floor(atk * (1 + bonus / 100))
  }

  if (state.player._undyingRage && state.player.hp < state.player.maxHp * 0.3) {
    const regen = Math.floor(state.player.maxHp * state.player._undyingRage)
    state.player.hp = Math.min(state.player.hp + regen, state.player.maxHp)
    if (regen > 0) _addEffect(state, 195, 400, '+' + regen + 'HP 不死', '#ff4444')
  }

  if (state.player._regenPct) {
    const regen = Math.floor(state.player.maxHp * state.player._regenPct)
    state.player.hp = Math.min(state.player.hp + regen, state.player.maxHp)
    if (regen > 0) _addEffect(state, 195, 420, '+' + regen + 'HP 新生', '#44dd88')
  }

  let dmgBonus = state.player.dmgBonus || 1
  if (state.player._rageDmgBonus) {
    dmgBonus += state.player._rageDmgBonus
    state.player._rageDmgBonus = 0
  }

  const guaranteedCrit = (state.player._garanteedCrits || 0) > 0
  if (guaranteedCrit) state.player._garanteedCrits--
  const isCrit   = guaranteedCrit || Math.random() < (state.player.crit || 0.15)
  const critMult = state.player.critMult || 2
  let damage = Math.max(1, Math.round(
    (atk - (target.def || 0) * 0.5) * dmgBonus
  ))
  if (isCrit) damage = Math.floor(damage * critMult)

  target.hp -= damage
  const ctx = { damage, isCrit, target }

  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card  = getCardById(cardId)
    const stars = state.cardStars[cardId] || 1
    if (card && card.trigger === 'on_attack' && typeof card.apply === 'function') {
      const msg = card.apply(state, ctx, stars)
      if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 30, msg, _cardColor(card))
    }
  }

  if (isCrit) {
    for (const cardId of deck) {
      const card  = getCardById(cardId)
      const stars = state.cardStars[cardId] || 1
      if (card && card.trigger === 'on_crit' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx, stars)
        if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 50, msg, '#ffe082')
      }
    }
  }

  if (target.hp <= 0) {
    for (const cardId of deck) {
      const card  = getCardById(cardId)
      const stars = state.cardStars[cardId] || 1
      if (card && card.trigger === 'on_kill' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx, stars)
        if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 40, msg, '#ffd700')
      }
    }
  }

  const logText = isCrit ? ('暴擊！' + damage) : ('傷害 ' + damage)
  state.log.push({ text: logText, color: isCrit ? '#ffd700' : '#ff8888', frame: state.frame })
  return { damage, isCrit, target }
}

export function enemyAttack(state) {
  const alive = state.enemies.filter(e => e.hp > 0)
  if (alive.length === 0) return null

  const results = []
  const deck    = state.player.deck || []

  for (const enemy of alive) {
    if (enemy._stunned) {
      enemy._stunned = false
      state.log.push({ text: (enemy.nameZh || enemy.name) + ' 眩暈，跳過攻擊', color: '#88ffcc', frame: state.frame })
      results.push({ attacker: enemy, damage: 0, stunned: true })
      continue
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

    damage = Math.max(0, ctx.damage)
    state.player.hp -= damage
    results.push({ attacker: enemy, damage })
    state.log.push({ text: (enemy.nameZh || enemy.name) + ' 攻擊 -' + damage, color: '#ff6666', frame: state.frame })
  }

  return results
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
