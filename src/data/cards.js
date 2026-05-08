// cards.js — 卡牌系統（通用×10 + 英雄×5，線性星級升級）
//
// 星級規則：重複取得 → +1★，最多 5★，滿星不再出現
// 數值公式：stars * step（線性，每星加固定量）

export const MAX_STARS = 5

// ── 通用牌（10 張）──────────────────────────────────────────────
export const UNIVERSAL_CARDS = {

  power_up: {
    id: 'power_up', group: 'universal',
    name: 'Power Up', nameZh: '力量強化', icon: '💪',
    desc: (s=1) => `ATK +${s*10}%`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.atk = Math.round(state.player.atk * (1 + stars * 0.10))
    },
  },

  armor_up: {
    id: 'armor_up', group: 'universal',
    name: 'Armor Up', nameZh: '防禦強化', icon: '🛡️',
    desc: (s=1) => `DEF +${s*5}`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.def += stars * 5
    },
  },

  vitality: {
    id: 'vitality', group: 'universal',
    name: 'Vitality', nameZh: '生命強化', icon: '❤️',
    desc: (s=1) => `最大HP +${s*20}`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      const bonus = stars * 20
      state.player.maxHp += bonus
      state.player.hp    += bonus
    },
  },

  lethal_strike: {
    id: 'lethal_strike', group: 'universal',
    name: 'Lethal Strike', nameZh: '致命打擊', icon: '💢',
    desc: (s=1) => `暴擊傷害倍率 +${(s*0.2).toFixed(1)}×（共 ×${(2+s*0.2).toFixed(1)}）`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.critMult = (state.player.critMult || 2) + stars * 0.2
    },
  },

  sharp_eye: {
    id: 'sharp_eye', group: 'universal',
    name: 'Sharp Eye', nameZh: '銳利之眼', icon: '👁️',
    desc: (s=1) => `暴擊率 +${s*5}%`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.crit = Math.min((state.player.crit || 0.1) + stars * 0.05, 0.95)
    },
  },

  healing_mist: {
    id: 'healing_mist', group: 'universal',
    name: 'Healing Mist', nameZh: '治癒薄霧', icon: '💧',
    desc: (s=1) => `戰鬥開始回復 ${s*5}% 最大HP`,
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const heal = Math.floor(state.player.maxHp * stars * 0.05)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return heal > 0 ? `治癒薄霧 +${heal}HP` : null
    },
  },

  ball_up: {
    id: 'ball_up', group: 'universal',
    name: 'Ball Up', nameZh: '球數強化', icon: '⚪',
    desc: (s=1) => `杯球台球數 +${s}`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.bonusBalls = (state.player.bonusBalls || 0) + stars
    },
  },

  first_strike: {
    id: 'first_strike', group: 'universal',
    name: 'First Strike', nameZh: '先制一擊', icon: '🗡️',
    desc: (s=1) => `首次攻擊傷害 ×${(1 + s*0.5).toFixed(1)}`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (!state.player._firstStrikeDone) {
        const bonus = Math.floor(ctx.damage * stars * 0.5)
        ctx.target.hp -= bonus
        state.player._firstStrikeDone = true
        return `先制一擊 +${bonus}`
      }
    },
  },

  iron_skin: {
    id: 'iron_skin', group: 'universal',
    name: 'Iron Skin', nameZh: '鐵皮', icon: '🧲',
    desc: (s=1) => `每次受傷減少 ${s*3} 傷害`,
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      if (ctx) ctx.damage = Math.max(1, (ctx.damage || 0) - stars * 3)
    },
  },

  double_chance: {
    id: 'double_chance', group: 'universal',
    name: 'Double Chance', nameZh: '雙重機運', icon: '🎲',
    desc: (s=1) => `${s*6}% 機率攻擊傷害翻倍`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.06) {
        const bonus = ctx.damage
        ctx.target.hp -= bonus
        return `雙重機運 ×2！+${bonus}`
      }
    },
  },
}

// ── 騎士英雄牌（5 張）──────────────────────────────────────────
export const KNIGHT_CARDS = {

  shield_bash: {
    id: 'shield_bash', group: 'hero', heroId: 'knight',
    name: 'Shield Bash', nameZh: '盾擊', icon: '🛡️',
    desc: (s=1) => `攻擊時 ${s*10}% 機率眩暈敵人`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.10) {
        ctx.target._stunned = true
        return '盾擊！眩暈！'
      }
    },
  },

  parry: {
    id: 'parry', group: 'hero', heroId: 'knight',
    name: 'Parry', nameZh: '完美格擋', icon: '🤺',
    desc: (s=1) => `被攻擊時 ${s*8}% 機率完全格擋`,
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.08) {
        ctx.damage = 0
        return '完美格擋！'
      }
    },
  },

  sword_mastery: {
    id: 'sword_mastery', group: 'hero', heroId: 'knight',
    name: 'Sword Mastery', nameZh: '劍術精通', icon: '⚔️',
    desc: (s=1) => `每次攻擊後 ATK+1（上限 +${s*5}）`,
    trigger: 'on_attack',
    apply(state, _ctx, stars=1) {
      const cap = stars * 5
      state.player._masteryGained = state.player._masteryGained || 0
      if (state.player._masteryGained < cap) {
        state.player.atk += 1
        state.player._masteryGained += 1
        return `劍術精通 ATK+1`
      }
    },
  },

  holy_blade: {
    id: 'holy_blade', group: 'hero', heroId: 'knight',
    name: 'Holy Blade', nameZh: '聖光劍', icon: '✨',
    desc: (s=1) => `暴擊時治癒造成傷害的 ${s*10}%`,
    trigger: 'on_crit',
    apply(state, ctx, stars=1) {
      const heal = Math.floor(ctx.damage * stars * 0.10)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return `聖光劍 +${heal}HP`
    },
  },

  fortress: {
    id: 'fortress', group: 'hero', heroId: 'knight',
    name: 'Fortress', nameZh: '要塞姿態', icon: '🏰',
    desc: (s=1) => `戰鬥開始 DEF+${s*10}，暴擊率+${s*3}%`,
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      state.player.def  += stars * 10
      state.player.crit  = Math.min((state.player.crit || 0.1) + stars * 0.03, 0.95)
      return `要塞姿態 DEF+${stars*10}`
    },
  },
}

// ── 刺客英雄牌（5 張）──────────────────────────────────────────
export const ROGUE_CARDS = {

  shadowstep: {
    id: 'shadowstep', group: 'hero', heroId: 'rogue',
    name: 'Shadowstep', nameZh: '暗影步', icon: '🌑',
    desc: (s=1) => `被攻擊時 ${s*10}% 機率完全閃避`,
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.10) {
        ctx.damage = 0
        return '暗影步！閃避！'
      }
    },
  },

  poison_blade: {
    id: 'poison_blade', group: 'hero', heroId: 'rogue',
    name: 'Poison Blade', nameZh: '毒刃', icon: '🐍',
    desc: (s=1) => `攻擊施毒，每回合 ${s*2}% 目標HP`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      ctx.target._poisonPct = Math.max(ctx.target._poisonPct || 0, stars * 0.02)
      return '毒刃！施毒！'
    },
  },

  backstab: {
    id: 'backstab', group: 'hero', heroId: 'rogue',
    name: 'Backstab', nameZh: '背刺', icon: '🗡️',
    desc: (s=1) => `首次攻擊傷害 ×${(1 + s).toFixed(1)}`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (!state.player._backstabDone) {
        const bonus = Math.floor(ctx.damage * stars)
        ctx.target.hp -= bonus
        state.player._backstabDone = true
        return `背刺！×${(1+stars).toFixed(1)} +${bonus}`
      }
    },
  },

  smoke_bomb: {
    id: 'smoke_bomb', group: 'hero', heroId: 'rogue',
    name: 'Smoke Bomb', nameZh: '煙霧彈', icon: '💨',
    desc: (s=1) => `首次被擊後下 ${s} 次攻擊必定暴擊`,
    trigger: 'on_hit',
    apply(state, _ctx, stars=1) {
      if (!state.player._smokeBombUsed) {
        state.player._garanteedCrits = (state.player._garanteedCrits || 0) + stars
        state.player._smokeBombUsed  = true
        return `煙霧彈！下 ${stars} 次必暴！`
      }
    },
  },

  combo_strike: {
    id: 'combo_strike', group: 'hero', heroId: 'rogue',
    name: 'Combo Strike', nameZh: '連擊強化', icon: '💥',
    desc: (s=1) => `對同一目標連擊，每次 +${s*5}% 傷害`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      const key = ctx.target?._id || 'e0'
      if (state.player._comboTarget === key) {
        state.player._comboCount = (state.player._comboCount || 0) + 1
      } else {
        state.player._comboTarget = key
        state.player._comboCount  = 0
      }
      if (state.player._comboCount > 0) {
        const bonus = Math.floor(ctx.damage * state.player._comboCount * stars * 0.05)
        ctx.target.hp -= bonus
        return `連擊×${state.player._comboCount} +${bonus}`
      }
    },
  },
}

// ── 蠻將英雄牌（5 張）──────────────────────────────────────────
export const BARBARIAN_CARDS = {

  rage_fuel: {
    id: 'rage_fuel', group: 'hero', heroId: 'barbarian',
    name: 'Rage Fuel', nameZh: '怒氣積累', icon: '😡',
    desc: (s=1) => `每 10 次被擊後，下次攻擊 +${s*15}% 傷害`,
    trigger: 'on_hit',
    apply(state, _ctx, stars=1) {
      state.player._rage = (state.player._rage || 0) + 1
      if (state.player._rage >= 10) {
        state.player._rageDmgBonus = (state.player._rageDmgBonus || 0) + stars * 0.15
        state.player._rage = 0
        return `怒氣爆發！+${stars*15}% 傷害`
      }
    },
  },

  blood_thirst: {
    id: 'blood_thirst', group: 'hero', heroId: 'barbarian',
    name: 'Blood Thirst', nameZh: '嗜血', icon: '🩸',
    desc: (s=1) => `每缺失 10%HP → ATK+${s*2}%（上限+${s*20}%）`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._bloodThirst = { pct: stars * 2, cap: stars * 20 }
    },
  },

  undying_rage: {
    id: 'undying_rage', group: 'hero', heroId: 'barbarian',
    name: 'Undying Rage', nameZh: '不死之怒', icon: '💀',
    desc: (s=1) => `HP 低於 30% 時每回合回復 ${s}% HP`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._undyingRage = stars * 0.01
    },
  },

  war_stomp: {
    id: 'war_stomp', group: 'hero', heroId: 'barbarian',
    name: 'War Stomp', nameZh: '戰地踩踏', icon: '💥',
    desc: (s=1) => `戰鬥開始對所有敵人造成 ${s*20}% ATK 傷害`,
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const dmg = Math.floor(state.player.atk * stars * 0.20)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= dmg; total += dmg }
      }
      return `戰地踩踏！全敵 -${total}`
    },
  },

  thick_skin: {
    id: 'thick_skin', group: 'hero', heroId: 'barbarian',
    name: 'Thick Skin', nameZh: '厚皮', icon: '🦏',
    desc: (s=1) => `受傷減少 ${s*5}%`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.dmgReduction = (state.player.dmgReduction || 0) + stars * 0.05
    },
  },
}

// ── 德魯伊英雄牌（5 張）────────────────────────────────────────
export const DRUID_CARDS = {

  thorns_aura: {
    id: 'thorns_aura', group: 'hero', heroId: 'druid',
    name: 'Thorns Aura', nameZh: '荊棘光環', icon: '🌵',
    desc: (s=1) => `被攻擊時反彈 ${s*10}% 傷害給全體敵人`,
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      const thorn = Math.floor((ctx?.damage || 0) * stars * 0.10)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= thorn; total += thorn }
      }
      if (total > 0) return `荊棘光環 -${total}`
    },
  },

  natures_wrath: {
    id: 'natures_wrath', group: 'hero', heroId: 'druid',
    name: "Nature's Wrath", nameZh: '自然之怒', icon: '⚡',
    desc: (s=1) => `每 4 次攻擊召喚閃電，造成 ${s*60}% ATK 傷害`,
    trigger: 'on_attack',
    apply(state, _ctx, stars=1) {
      state.player._natWrathCount = (state.player._natWrathCount || 0) + 1
      if (state.player._natWrathCount >= 4) {
        state.player._natWrathCount = 0
        const dmg    = Math.floor(state.player.atk * stars * 0.60)
        const target = (state.enemies || []).filter(e => e.hp > 0).sort((a, b) => b.hp - a.hp)[0]
        if (target) { target.hp -= dmg; return `自然之怒！閃電 -${dmg}` }
      }
    },
  },

  rejuvenation: {
    id: 'rejuvenation', group: 'hero', heroId: 'druid',
    name: 'Rejuvenation', nameZh: '新生', icon: '🍃',
    desc: (s=1) => `每回合恢復 ${s}% 最大HP`,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._regenPct = (state.player._regenPct || 0) + stars * 0.01
    },
  },

  toxic_bloom: {
    id: 'toxic_bloom', group: 'hero', heroId: 'druid',
    name: 'Toxic Bloom', nameZh: '劇毒綻放', icon: '🌸',
    desc: (s=1) => `攻擊時 ${s*8}% 機率施毒（每回合 ${s*4}% HP）`,
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.08) {
        ctx.target._poisonPct = Math.max(ctx.target._poisonPct || 0, stars * 0.04)
        return '劇毒綻放！施毒！'
      }
    },
  },

  overgrowth: {
    id: 'overgrowth', group: 'hero', heroId: 'druid',
    name: 'Overgrowth', nameZh: '過度生長', icon: '🌿',
    desc: (s=1) => `戰鬥開始 HP+${s*20}；敵人 DEF-${s*3}`,
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const hpBonus = stars * 20
      state.player.maxHp += hpBonus
      state.player.hp    += hpBonus
      const defDebuff = stars * 3
      for (const e of (state.enemies || [])) {
        e.def = Math.max(0, (e.def || 0) - defDebuff)
      }
      return `過度生長 HP+${hpBonus}，敵DEF-${defDebuff}`
    },
  },
}

// ── 輔助函式 ────────────────────────────────────────────────────
export function getHeroCards(heroId) {
  const MAP = {
    knight:    KNIGHT_CARDS,
    rogue:     ROGUE_CARDS,
    barbarian: BARBARIAN_CARDS,
    druid:     DRUID_CARDS,
  }
  return Object.values(MAP[heroId] || {})
}

export function getAllCards() {
  return [
    ...Object.values(UNIVERSAL_CARDS),
    ...Object.values(KNIGHT_CARDS),
    ...Object.values(ROGUE_CARDS),
    ...Object.values(BARBARIAN_CARDS),
    ...Object.values(DRUID_CARDS),
  ]
}

export function getCardById(id) {
  return getAllCards().find(c => c.id === id)
}

export function getCardDesc(card, stars=1) {
  return typeof card.desc === 'function' ? card.desc(stars) : (card.desc || '')
}

// 卡牌費用：第 n 次購買 = (n-1)*100 球，首次永遠免費
export function getCardCost(cardId, cardPurchases={}) {
  return (cardPurchases[cardId] || 0) * 100
}

// count  = 抽幾張
// balls  = 目前可用球數（只抽買得起的）
// cardPurchases = { [id]: 購買次數 }
export function drawCardOffers(count=3, wave=1, heroId='knight', cardStars={}, balls=9999, cardPurchases={}) {
  const canAfford = (c) => getCardCost(c.id, cardPurchases) <= balls
  const notMaxed  = (c) => (cardStars[c.id] || 0) < MAX_STARS
  const isFree    = (c) => (cardPurchases[c.id] || 0) === 0

  // 主要池：買得起的牌
  const univAfford = Object.values(UNIVERSAL_CARDS).filter(c => notMaxed(c) && canAfford(c))
  const heroAfford = getHeroCards(heroId).filter(c => notMaxed(c) && canAfford(c))

  // 免費補充池：未買過的牌（cost=0），當球數不足時用來補滿三選一
  const univFree = Object.values(UNIVERSAL_CARDS).filter(c => notMaxed(c) && isFree(c))
  const heroFree = getHeroCards(heroId).filter(c => notMaxed(c) && isFree(c))

  const seen   = new Set()
  const result = []

  const pickFrom = (pool) => {
    const avail = pool.filter(c => !seen.has(c.id))
    if (!avail.length) return false
    const card = avail[Math.floor(Math.random() * avail.length)]
    seen.add(card.id); result.push(card)
    return true
  }

  // 第一輪：從買得起的牌裡選，優先保證一張英雄牌
  if (heroAfford.length > 0) pickFrom(heroAfford)
  const combined = _shuffle([...univAfford, ...univAfford, ...heroAfford])
  for (const card of combined) {
    if (result.length >= count) break
    if (!seen.has(card.id)) { seen.add(card.id); result.push(card) }
  }

  // 第二輪：不足 count 張時用免費牌補滿（確保永遠有牌可選）
  if (result.length < count) {
    const freeFill = _shuffle([...univFree, ...heroFree])
    for (const card of freeFill) {
      if (result.length >= count) break
      if (!seen.has(card.id)) { seen.add(card.id); result.push(card) }
    }
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
