// AutoBattle.js — 自動戰鬥引擎（支援卡牌觸發效果）
// 配合 BattleScene 使用，不直接繪圖
import { CARDS } from '../data/cards.js'

// ── 建立戰鬥狀態 ───────────────────────────────────────────────────────────
export function createBattleState(heroData, enemies) {
  // 玩家深拷貝
  const player = {
    ...heroData,
    hp:    heroData.hp,
    maxHp: heroData.maxHp,
    dmgReduction: 0,
    dmgBonus: 1,
    _frenzyStacks: 0,
    _tangoStacks: 0,
    _stormCount: 0,
    _ironWillUsed: false,
    _phoenixUsed: false,
    _berserker: false,
    darkHarmony: false,
    bonusBalls: heroData.bonusBalls || 0,
  }

  // 敵人深拷貝
  const enemyCopies = enemies.map(e => ({ ...e, maxHp: e.maxHp || e.hp }))

  const state = {
    player,
    enemies: enemyCopies,
    log: [],          // { text, color, frame }
    effects: [],      // { x, y, text, color, life }
    frame: 0,
    voidBloom: false,
    done: false,
    result: null,     // 'victory' | 'defeat'
  }

  // 套用被動卡和戰鬥開始卡
  _applyPassives(state)
  _applyBattleStart(state)

  return state
}

// ── 套用被動技能 ───────────────────────────────────────────────────────────
function _applyPassives(state) {
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card = CARDS[cardId]
    if (card && card.trigger === 'passive' && typeof card.apply === 'function') {
      const msg = card.apply(state)
      if (msg) state.log.push({ text: msg, color: RARITY_COLORS[card.rarity], frame: 0 })
    }
  }
}

// ── 套用戰鬥開始技能 ──────────────────────────────────────────────────────
function _applyBattleStart(state) {
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card = CARDS[cardId]
    if (card && card.trigger === 'battle_start' && typeof card.apply === 'function') {
      const msg = card.apply(state)
      if (msg) state.log.push({ text: msg, color: RARITY_COLORS[card.rarity], frame: 0 })
    }
  }
}

const RARITY_COLORS = {
  common:    '#c0cfe0',
  rare:      '#64b5f6',
  epic:      '#ce93d8',
  legendary: '#ffe082',
}

// ── 玩家攻擊 ──────────────────────────────────────────────────────────────
export function playerAttack(state) {
  const target = state.enemies.find(e => e.hp > 0)
  if (!target) return null

  // 基礎傷害
  let atk = state.player.atk
  // 狂暴效果
  if (state.player._berserker && state.player.hp < state.player.maxHp * 0.5) {
    atk = Math.floor(atk * 2)
  }
  // 死亡探戈疊層
  if (state.player._tangoStacks > 0) {
    atk = Math.floor(atk * (1 + state.player._tangoStacks * 0.5))
    state.player._tangoStacks = 0
  }

  // 暴擊判定
  const isCrit = Math.random() < (state.player.crit || 0.15)
  const critMult = state.player.critMult || 2
  let damage = Math.max(1, Math.round(
    (atk - (target.def || 0) * 0.5) * (state.player.dmgBonus || 1)
  ))
  if (isCrit) damage = Math.floor(damage * critMult)

  // 套用傷害
  target.hp -= damage

  const ctx = { damage, isCrit, target }

  // on_attack 卡牌觸發
  const deck = state.player.deck || []
  for (const cardId of deck) {
    const card = CARDS[cardId]
    if (card && card.trigger === 'on_attack' && typeof card.apply === 'function') {
      const msg = card.apply(state, ctx)
      if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 30, msg, RARITY_COLORS[card.rarity])
    }
  }

  // on_crit 觸發
  if (isCrit) {
    for (const cardId of deck) {
      const card = CARDS[cardId]
      if (card && card.trigger === 'on_crit' && typeof card.apply === 'function') {
        const msg = card.apply(state, ctx)
        if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 50, msg, '#ffe082')
      }
    }
  }

  // 吸血（暗黑和諧增強版）
  if (state.player.darkHarmony) {
    const lifesteal = Math.floor(damage * 0.40)
    state.player.hp = Math.min(state.player.hp + lifesteal, state.player.maxHp)
  }

  // on_kill 觸發
  if (target.hp <= 0) {
    for (const cardId of deck) {
      const card = CARDS[cardId]
      if (card && card.trigger === 'on_kill' && typeof card.apply === 'function') {
        const msg = card.apply(state)
        if (msg) _addEffect(state, target.x || 300, (target.y || 200) - 40, msg, '#ffd700')
      }
    }
  }

  // 虛空綻放（每回合對所有敵人）
  if (state.voidBloom) {
    for (const e of state.enemies) {
      if (e.hp > 0) {
        const voidDmg = Math.floor(e.maxHp * 0.05)
        e.hp -= voidDmg
      }
    }
  }

  // 日誌
  const logText = isCrit ? `暴擊！${damage}` : `傷害 ${damage}`
  state.log.push({ text: logText, color: isCrit ? '#ffd700' : '#ff8888', frame: state.frame })

  return { damage, isCrit, target, extraDamage: ctx.extraDamage || 0 }
}

// ── 敵人攻擊 ──────────────────────────────────────────────────────────────
export function enemyAttack(state) {
  const alive = state.enemies.filter(e => e.hp > 0)
  if (alive.length === 0) return null

  const results = []
  const deck = state.player.deck || []

  for (const enemy of alive) {
    let damage = Math.max(1, Math.round(
      (enemy.atk || 10) * (1 - (state.player.dmgReduction || 0)) - (state.player.def || 0) * 0.3
    ))

    // on_hit 觸發（在傷害扣血前）
    const ctx = { damage, attacker: enemy }
    for (const cardId of deck) {
      const card = CARDS[cardId]
      if (card && card.trigger === 'on_hit' && typeof card.apply === 'function') {
        card.apply(state, ctx)
      }
    }

    state.player.hp -= damage
    results.push({ attacker: enemy, damage })
    state.log.push({ text: `${enemy.nameZh || enemy.name} 攻擊 -${damage}`, color: '#ff6666', frame: state.frame })
  }

  return results
}

// ── 取得下一個存活敵人 ────────────────────────────────────────────────────
export function getNextTarget(state) {
  return state.enemies.find(e => e.hp > 0) || null
}

// ── 檢查戰鬥是否結束 ──────────────────────────────────────────────────────
export function checkBattleEnd(state) {
  if (state.enemies.every(e => e.hp <= 0)) {
    state.done = true
    state.result = 'victory'
    return 'victory'
  }
  if (state.player.hp <= 0) {
    state.done = true
    state.result = 'defeat'
    return 'defeat'
  }
  return null
}

// ── 內部工具 ──────────────────────────────────────────────────────────────
function _addEffect(state, x, y, text, color) {
  state.effects.push({ x, y, text, color, life: 60 })
}
