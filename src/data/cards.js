// cards.js — 卡牌系統（通用牌 × 10 + 英雄牌 × 5/英雄，星級升級）
//
// group   : 'universal' | 'hero'
// heroId  : undefined（通用）| 'knight' | 'rogue' | 'barbarian' | 'druid'
// desc    : (stars: number) => string  — 隨星級顯示不同數值
// apply   : (state, ctx, stars=1) — 效果隨星級增強
// 觸發時機: 'passive' | 'battle_start' | 'on_attack' | 'on_crit' | 'on_kill' | 'on_hit'
//
// 星級規則：
//   重複選到同一張牌 → +1 星（不重複加入牌組，而是升星）
//   最多 5 星；滿星後不再出現於選項

export const MAX_STARS = 5

// ── 星級縮放工具 ─────────────────────────────────────────────
// 每升 1 星效果 × (1 + stepPct)，stepPct 預設 0.15（每星 +15%）
export function sc(base, stars, stepPct = 0.15) {
  return Math.round(base * (1 + (stars - 1) * stepPct))
}
// 小數版：每星加固定值 step
export function scAdd(base, stars, step) {
  return +(base + (stars - 1) * step).toFixed(3)
}

// ── 通用牌（所有英雄可取得，共 10 張）─────────────────────────
export const UNIVERSAL_CARDS = {

  power_up: {
    id: 'power_up', group: 'universal',
    name: 'Power Up', nameZh: '力量強化',
    icon: '💪',
    desc: (s = 1) => `攻擊力 +${sc(10, s)}%`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.atk = Math.round(state.player.atk * (1 + sc(10, stars) / 100))
    },
  },

  armor_up: {
    id: 'armor_up', group: 'universal',
    name: 'Armor Up', nameZh: '防禦強化',
    icon: '🛡️',
    desc: (s = 1) => `防禦力 +${sc(10, s, 0.2)}`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.def += sc(10, stars, 0.2)
    },
  },

  vitality: {
    id: 'vitality', group: 'universal',
    name: 'Vitality', nameZh: '生命強化',
    icon: '❤️',
    desc: (s = 1) => `最大HP +${sc(25, s)}`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      const bonus = sc(25, stars)
      state.player.maxHp += bonus
      state.player.hp    += bonus
    },
  },

  swift_strike: {
    id: 'swift_strike', group: 'universal',
    name: 'Swift Strike', nameZh: '迅捷攻擊',
    icon: '⚡',
    desc: (s = 1) => `攻速 +${sc(15, s)}%`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.spd = +((state.player.spd || 1) * (1 + sc(15, stars) / 100)).toFixed(3)
    },
  },

  sharp_eye: {
    id: 'sharp_eye', group: 'universal',
    name: 'Sharp Eye', nameZh: '銳利之眼',
    icon: '👁️',
    desc: (s = 1) => `暴擊率 +${scAdd(8, s, 1.5)}%`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.crit = Math.min((state.player.crit || 0.1) + scAdd(8, stars, 1.5) / 100, 0.95)
    },
  },

  healing_mist: {
    id: 'healing_mist', group: 'universal',
    name: 'Healing Mist', nameZh: '治癒薄霧',
    icon: '💧',
    desc: (s = 1) => `每波開始恢復 ${sc(10, s)}% 最大HP`,
    trigger: 'battle_start',
    apply(state, _ctx, stars = 1) {
      const heal = Math.floor(state.player.maxHp * sc(10, stars) / 100)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return `治癒薄霧 +${heal}HP`
    },
  },

  ball_up: {
    id: 'ball_up', group: 'universal',
    name: 'Ball Up', nameZh: '球數強化',
    icon: '⚪',
    desc: (s = 1) => `杯球台球數 +${sc(2, s, 0.5)}`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.bonusBalls = (state.player.bonusBalls || 0) + sc(2, stars, 0.5)
    },
  },

  first_strike: {
    id: 'first_strike', group: 'universal',
    name: 'First Strike', nameZh: '先制一擊',
    icon: '🗡️',
    desc: (s = 1) => `戰鬥首次攻擊傷害 ×${(1.5 + (s - 1) * 0.25).toFixed(2)}`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      if (!state.player._firstStrikeDone) {
        const mult = 1.5 + (stars - 1) * 0.25
        const bonus = Math.floor(ctx.damage * (mult - 1))
        ctx.target.hp -= bonus
        state.player._firstStrikeDone = true
        return `先制一擊 +${bonus}`
      }
    },
  },

  iron_skin: {
    id: 'iron_skin', group: 'universal',
    name: 'Iron Skin', nameZh: '鐵皮',
    icon: '🧲',
    desc: (s = 1) => `每次受傷固定減少 ${sc(5, s, 0.2)} 傷害`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      if (ctx) ctx.damage = Math.max(1, (ctx.damage || 0) - sc(5, stars, 0.2))
    },
  },

  double_chance: {
    id: 'double_chance', group: 'universal',
    name: 'Double Chance', nameZh: '雙重機運',
    icon: '🎲',
    desc: (s = 1) => `${scAdd(12, s, 2)}% 機率攻擊傷害翻倍`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      if (Math.random() < scAdd(12, stars, 2) / 100) {
        const bonus = ctx.damage
        ctx.target.hp -= bonus
        return `雙重機運 ×2！+${bonus}`
      }
    },
  },
}

// ── 騎士英雄牌（5 張）─────────────────────────────────────────
export const KNIGHT_CARDS = {

  shield_bash: {
    id: 'shield_bash', group: 'hero', heroId: 'knight',
    name: 'Shield Bash', nameZh: '盾擊',
    icon: '🛡️',
    desc: (s = 1) => `攻擊時 ${scAdd(20, s, 3)}% 機率眩暈敵人（跳過下次攻擊）`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      if (Math.random() < scAdd(20, stars, 3) / 100) {
        ctx.target._stunned = true
        return '盾擊！眩暈！'
      }
    },
  },

  parry: {
    id: 'parry', group: 'hero', heroId: 'knight',
    name: 'Parry', nameZh: '完美格擋',
    icon: '🤺',
    desc: (s = 1) => `被攻擊時 ${scAdd(18, s, 2.5)}% 機率完全格擋`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      if (Math.random() < scAdd(18, stars, 2.5) / 100) {
        ctx.damage = 0
        return '完美格擋！'
      }
    },
  },

  sword_mastery: {
    id: 'sword_mastery', group: 'hero', heroId: 'knight',
    name: 'Sword Mastery', nameZh: '劍術精通',
    icon: '⚔️',
    desc: (s = 1) => `每次攻擊後 +${sc(1, s, 0.5)} ATK（上限 +${sc(20, s)}）`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      const cap = sc(20, stars)
      state.player._masteryGained = state.player._masteryGained || 0
      if (state.player._masteryGained < cap) {
        const gain = sc(1, stars, 0.5)
        state.player.atk += gain
        state.player._masteryGained += gain
        return `劍術精通 ATK+${gain}`
      }
    },
  },

  holy_blade: {
    id: 'holy_blade', group: 'hero', heroId: 'knight',
    name: 'Holy Blade', nameZh: '聖光劍',
    icon: '✨',
    desc: (s = 1) => `暴擊時治癒造成傷害的 ${sc(25, s)}%`,
    trigger: 'on_crit',
    apply(state, ctx, stars = 1) {
      const heal = Math.floor(ctx.damage * sc(25, stars) / 100)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return `聖光劍 +${heal}HP`
    },
  },

  fortress: {
    id: 'fortress', group: 'hero', heroId: 'knight',
    name: 'Fortress', nameZh: '要塞姿態',
    icon: '🏰',
    desc: (s = 1) => `戰鬥開始時防禦 +${sc(20, s)}，暴擊率 +${sc(5, s)}%`,
    trigger: 'battle_start',
    apply(state, _ctx, stars = 1) {
      state.player.def  += sc(20, stars)
      state.player.crit  = Math.min((state.player.crit || 0.1) + sc(5, stars) / 100, 0.95)
      return `要塞姿態 DEF+${sc(20, stars)}`
    },
  },
}

// ── 刺客英雄牌（5 張）─────────────────────────────────────────
export const ROGUE_CARDS = {

  shadowstep: {
    id: 'shadowstep', group: 'hero', heroId: 'rogue',
    name: 'Shadowstep', nameZh: '暗影步',
    icon: '🌑',
    desc: (s = 1) => `被攻擊時 ${scAdd(18, s, 3)}% 機率完全閃避`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      if (Math.random() < scAdd(18, stars, 3) / 100) {
        ctx.damage = 0
        return '暗影步！閃避！'
      }
    },
  },

  poison_blade: {
    id: 'poison_blade', group: 'hero', heroId: 'rogue',
    name: 'Poison Blade', nameZh: '毒刃',
    icon: '🐍',
    desc: (s = 1) => `攻擊時施毒，每回合 ${sc(4, s, 0.2)}% 目標HP 持續傷害`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      ctx.target._poisonPct = Math.max(ctx.target._poisonPct || 0, sc(4, stars, 0.2) / 100)
      return '毒刃！施毒！'
    },
  },

  backstab: {
    id: 'backstab', group: 'hero', heroId: 'rogue',
    name: 'Backstab', nameZh: '背刺',
    icon: '🗡️',
    desc: (s = 1) => `戰鬥首次攻擊傷害 ×${(2 + (s - 1) * 0.3).toFixed(1)}`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      if (!state.player._backstabDone) {
        const mult  = 2 + (stars - 1) * 0.3
        const bonus = Math.floor(ctx.damage * (mult - 1))
        ctx.target.hp -= bonus
        state.player._backstabDone = true
        return `背刺！×${mult.toFixed(1)} +${bonus}`
      }
    },
  },

  smoke_bomb: {
    id: 'smoke_bomb', group: 'hero', heroId: 'rogue',
    name: 'Smoke Bomb', nameZh: '煙霧彈',
    icon: '💨',
    desc: (s = 1) => `首次被擊後下 ${sc(1, s, 0.5)} 次攻擊必定暴擊`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      if (!state.player._smokeBombUsed) {
        state.player._garanteedCrits = (state.player._garanteedCrits || 0) + sc(1, stars, 0.5)
        state.player._smokeBombUsed  = true
        return `煙霧彈！下 ${sc(1, stars, 0.5)} 次必暴！`
      }
    },
  },

  combo_strike: {
    id: 'combo_strike', group: 'hero', heroId: 'rogue',
    name: 'Combo Strike', nameZh: '連擊強化',
    icon: '💥',
    desc: (s = 1) => `對同一目標連擊，每次 +${scAdd(12, s, 2)}% 傷害`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      const key = ctx.target?._id || 'e0'
      if (state.player._comboTarget === key) {
        state.player._comboCount = (state.player._comboCount || 0) + 1
      } else {
        state.player._comboTarget = key
        state.player._comboCount  = 0
      }
      if (state.player._comboCount > 0) {
        const bonus = Math.floor(ctx.damage * state.player._comboCount * scAdd(12, stars, 2) / 100)
        ctx.target.hp -= bonus
        return `連擊×${state.player._comboCount} +${bonus}`
      }
    },
  },
}

// ── 蠻將英雄牌（5 張）─────────────────────────────────────────
export const BARBARIAN_CARDS = {

  rage_fuel: {
    id: 'rage_fuel', group: 'hero', heroId: 'barbarian',
    name: 'Rage Fuel', nameZh: '怒氣積累',
    icon: '😡',
    desc: (s = 1) => `被擊獲怒氣；每 10 點爆發，下次攻擊 +${sc(25, s)}% 傷害`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      state.player._rage = (state.player._rage || 0) + 1
      if (state.player._rage >= 10) {
        state.player._rageDmgBonus = (state.player._rageDmgBonus || 0) + sc(25, stars) / 100
        state.player._rage = 0
        return `怒氣爆發！+${sc(25, stars)}% 傷害`
      }
    },
  },

  blood_thirst: {
    id: 'blood_thirst', group: 'hero', heroId: 'barbarian',
    name: 'Blood Thirst', nameZh: '嗜血',
    icon: '🩸',
    desc: (s = 1) => `HP 每低 10% 攻擊力 +${sc(4, s)}%（上限 +${sc(40, s)}%）`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player._bloodThirst = { pct: sc(4, stars), cap: sc(40, stars) }
    },
  },

  undying_rage: {
    id: 'undying_rage', group: 'hero', heroId: 'barbarian',
    name: 'Undying Rage', nameZh: '不死之怒',
    icon: '💀',
    desc: (s = 1) => `HP 低於 30% 時每回合自動回 ${sc(3, s, 0.5)}% HP`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player._undyingRage = sc(3, stars, 0.5) / 100
    },
  },

  war_stomp: {
    id: 'war_stomp', group: 'hero', heroId: 'barbarian',
    name: 'War Stomp', nameZh: '戰地踩踏',
    icon: '💥',
    desc: (s = 1) => `戰鬥開始對所有敵人造成 ${sc(30, s)}% ATK 的傷害`,
    trigger: 'battle_start',
    apply(state, _ctx, stars = 1) {
      const dmg = Math.floor(state.player.atk * sc(30, stars) / 100)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= dmg; total += dmg }
      }
      return `戰地踩踏！全敵 -${total}`
    },
  },

  thick_skin: {
    id: 'thick_skin', group: 'hero', heroId: 'barbarian',
    name: 'Thick Skin', nameZh: '厚皮',
    icon: '🦏',
    desc: (s = 1) => `受傷減少 ${sc(8, s, 0.15)}%`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player.dmgReduction = (state.player.dmgReduction || 0) + sc(8, stars, 0.15) / 100
    },
  },
}

// ── 德魯伊英雄牌（5 張）───────────────────────────────────────
export const DRUID_CARDS = {

  thorns_aura: {
    id: 'thorns_aura', group: 'hero', heroId: 'druid',
    name: 'Thorns Aura', nameZh: '荊棘光環',
    icon: '🌵',
    desc: (s = 1) => `被攻擊時反彈 ${sc(18, s)}% 傷害給全體敵人`,
    trigger: 'on_hit',
    apply(state, ctx, stars = 1) {
      const thorn = Math.floor((ctx?.damage || 0) * sc(18, stars) / 100)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= thorn; total += thorn }
      }
      if (total > 0) return `荊棘光環 -${total}`
    },
  },

  natures_wrath: {
    id: 'natures_wrath', group: 'hero', heroId: 'druid',
    name: "Nature's Wrath", nameZh: '自然之怒',
    icon: '⚡',
    desc: (s = 1) => `每 ${Math.max(3, 5 - (s - 1))} 次攻擊召喚閃電，造成 ${sc(200, s)}% ATK 傷害`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      const interval = Math.max(3, 5 - (stars - 1))
      state.player._natWrathCount = (state.player._natWrathCount || 0) + 1
      if (state.player._natWrathCount >= interval) {
        state.player._natWrathCount = 0
        const dmg    = Math.floor(state.player.atk * sc(200, stars) / 100)
        const target = (state.enemies || []).filter(e => e.hp > 0).sort((a, b) => b.hp - a.hp)[0]
        if (target) { target.hp -= dmg; return `自然之怒！閃電 -${dmg}` }
      }
    },
  },

  rejuvenation: {
    id: 'rejuvenation', group: 'hero', heroId: 'druid',
    name: 'Rejuvenation', nameZh: '新生',
    icon: '🍃',
    desc: (s = 1) => `每回合恢復 ${sc(2, s, 0.5)}% 最大HP`,
    trigger: 'passive',
    apply(state, _ctx, stars = 1) {
      state.player._regenPct = (state.player._regenPct || 0) + sc(2, stars, 0.5) / 100
    },
  },

  toxic_bloom: {
    id: 'toxic_bloom', group: 'hero', heroId: 'druid',
    name: 'Toxic Bloom', nameZh: '劇毒綻放',
    icon: '🌸',
    desc: (s = 1) => `攻擊時 ${scAdd(20, s, 3)}% 機率施強毒（每回合 ${sc(8, s)}% HP）`,
    trigger: 'on_attack',
    apply(state, ctx, stars = 1) {
      if (Math.random() < scAdd(20, stars, 3) / 100) {
        ctx.target._poisonPct = Math.max(ctx.target._poisonPct || 0, sc(8, stars) / 100)
        return '劇毒綻放！施毒！'
      }
    },
  },

  overgrowth: {
    id: 'overgrowth', group: 'hero', heroId: 'druid',
    name: 'Overgrowth', nameZh: '過度生長',
    icon: '🌿',
    desc: (s = 1) => `戰鬥開始 HP +${sc(25, s)}；敵人攻速 -${sc(12, s)}%`,
    trigger: 'battle_start',
    apply(state, _ctx, stars = 1) {
      const hpBonus   = sc(25, stars)
      state.player.maxHp += hpBonus
      state.player.hp    += hpBonus
      const debuff = sc(12, stars) / 100
      for (const e of (state.enemies || [])) {
        e.spd = Math.max(0.3, (e.spd || 1) * (1 - debuff))
      }
      return `過度生長 HP+${hpBonus}，敵攻速-${sc(12, stars)}%`
    },
  },
}

// ── 輔助函式 ─────────────────────────────────────────────────

// 取得指定英雄的英雄牌列表
export function getHeroCards(heroId) {
  const MAP = {
    knight:    KNIGHT_CARDS,
    rogue:     ROGUE_CARDS,
    barbarian: BARBARIAN_CARDS,
    druid:     DRUID_CARDS,
  }
  return Object.values(MAP[heroId] || {})
}

// 取所有牌的扁平列表
export function getAllCards() {
  return [
    ...Object.values(UNIVERSAL_CARDS),
    ...Object.values(KNIGHT_CARDS),
    ...Object.values(ROGUE_CARDS),
    ...Object.values(BARBARIAN_CARDS),
    ...Object.values(DRUID_CARDS),
  ]
}

// 依 ID 查卡
export function getCardById(id) {
  return getAllCards().find(c => c.id === id)
}

// 取得卡牌描述文字（相容 string / function）
export function getCardDesc(card, stars = 1) {
  return typeof card.desc === 'function' ? card.desc(stars) : (card.desc || '')
}

// ── 抽卡邏輯 ─────────────────────────────────────────────────
// cardStars: { [cardId]: starCount }  — 從 gameState 傳入
// 1. 排除已滿星（5星）的牌
// 2. 保證每次至少 1 張英雄牌（如有可用）
// 3. 其餘從通用 + 英雄混合池中隨機補足
export function drawCardOffers(count = 3, wave = 1, heroId = 'knight', cardStars = {}) {
  const univAvail = Object.values(UNIVERSAL_CARDS).filter(c => (cardStars[c.id] || 0) < MAX_STARS)
  const heroAvail = getHeroCards(heroId).filter(c => (cardStars[c.id] || 0) < MAX_STARS)

  const seen   = new Set()
  const result = []

  const pickFrom = (pool) => {
    const avail = pool.filter(c => !seen.has(c.id))
    if (!avail.length) return false
    const card = avail[Math.floor(Math.random() * avail.length)]
    seen.add(card.id)
    result.push(card)
    return true
  }

  // 保證至少 1 張英雄牌
  if (heroAvail.length > 0) pickFrom(heroAvail)

  // 剩餘名額從通用 + 英雄混合補足（通用機率偏高）
  const combined = _shuffle([...univAvail, ...univAvail, ...heroAvail])  // univ x2 weight
  for (const card of combined) {
    if (result.length >= count) break
    if (!seen.has(card.id)) { seen.add(card.id); result.push(card) }
  }

  return _shuffle(result)
}

function _shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
