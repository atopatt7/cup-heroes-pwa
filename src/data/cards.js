// cards.js — 卡牌系統（靈感來自原版 Cup Heroes 技能卡）
// 觸發時機: 'passive' | 'battle_start' | 'on_attack' | 'on_crit' | 'on_kill' | 'on_hit' | 'on_low_hp'
// 稀有度顏色: common=#8B9BB4, rare=#1E88E5, epic=#8E24AA, legendary=#F9A825

export const RARITY = {
  common:    { label: 'Common',    color: '#8B9BB4', glow: '#c0cfe0', stars: 1 },
  rare:      { label: 'Rare',      color: '#1E88E5', glow: '#64b5f6', stars: 2 },
  epic:      { label: 'Epic',      color: '#8E24AA', glow: '#ce93d8', stars: 3 },
  legendary: { label: 'Legendary', color: '#F9A825', glow: '#ffe082', stars: 4 },
}

// ── 卡牌定義 ─────────────────────────────────────────────────────────────────
export const CARDS = {

  // ══ COMMON ══════════════════════════════════════════════════════════════
  shield_wall: {
    id: 'shield_wall', rarity: 'common',
    name: 'Shield Wall', nameZh: '盾牆',
    icon: '🛡️',
    desc: '受傷時減少20%傷害',
    trigger: 'passive',
    apply(state) {
      state.player.dmgReduction = (state.player.dmgReduction || 0) + 0.20
    },
    battleDesc: '盾牆 減傷20%',
  },

  double_strike: {
    id: 'double_strike', rarity: 'common',
    name: 'Double Strike', nameZh: '雙擊',
    icon: '⚔️',
    desc: '每次攻擊追加一次半傷',
    trigger: 'on_attack',
    apply(state, ctx) {
      const bonus = Math.floor(ctx.damage * 0.5)
      ctx.target.hp -= bonus
      ctx.extraDamage = (ctx.extraDamage || 0) + bonus
      return `雙擊 +${bonus}`
    },
    battleDesc: '雙擊',
  },

  quick_shot: {
    id: 'quick_shot', rarity: 'common',
    name: 'Quick Shot', nameZh: '快速射擊',
    icon: '🏹',
    desc: '攻速提升25%',
    trigger: 'passive',
    apply(state) {
      state.player.spd = (state.player.spd || 1) * 1.25
    },
    battleDesc: '快速射擊 攻速+25%',
  },

  battle_cry: {
    id: 'battle_cry', rarity: 'common',
    name: 'Battle Cry', nameZh: '戰吼',
    icon: '📣',
    desc: '戰鬥開始時攻擊力+8',
    trigger: 'battle_start',
    apply(state) {
      state.player.atk += 8
      return '戰吼 ATK+8'
    },
    battleDesc: '戰吼',
  },

  quick_heal: {
    id: 'quick_heal', rarity: 'common',
    name: 'Quick Heal', nameZh: '急速治癒',
    icon: '💊',
    desc: '戰鬥開始時恢復15%最大HP',
    trigger: 'battle_start',
    apply(state) {
      const heal = Math.floor(state.player.maxHp * 0.15)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return `急速治癒 +${heal}HP`
    },
    battleDesc: '急速治癒',
  },

  ball_bonus: {
    id: 'ball_bonus', rarity: 'common',
    name: 'Ball Bonus', nameZh: '額外球數',
    icon: '⚪',
    desc: '杯球台球數+3',
    trigger: 'passive',
    apply(state) {
      state.player.bonusBalls = (state.player.bonusBalls || 0) + 3
    },
    battleDesc: '額外球數',
  },

  // ══ RARE ════════════════════════════════════════════════════════════════
  battle_frenzy: {
    id: 'battle_frenzy', rarity: 'rare',
    name: 'Battle Frenzy', nameZh: '戰鬥狂熱',
    icon: '🔥',
    desc: '每次擊殺攻擊力+6（最多+30）',
    trigger: 'on_kill',
    apply(state) {
      const gained = Math.min(6, 30 - (state.player._frenzyStacks || 0) * 6)
      if (gained > 0) {
        state.player.atk += gained
        state.player._frenzyStacks = (state.player._frenzyStacks || 0) + 1
        return `戰鬥狂熱 ATK+${gained}`
      }
    },
    battleDesc: '戰鬥狂熱',
  },

  vampiric_touch: {
    id: 'vampiric_touch', rarity: 'rare',
    name: 'Vampiric Touch', nameZh: '吸血觸碰',
    icon: '🧛',
    desc: '每次攻擊吸取傷害的25%為HP',
    trigger: 'on_attack',
    apply(state, ctx) {
      const heal = Math.floor(ctx.damage * 0.25)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return `吸血 +${heal}HP`
    },
    battleDesc: '吸血觸碰',
  },

  iron_will: {
    id: 'iron_will', rarity: 'rare',
    name: 'Iron Will', nameZh: '鐵血意志',
    icon: '💪',
    desc: '一次致命傷可以以1HP存活',
    trigger: 'on_hit',
    _used: false,
    apply(state, ctx) {
      if (!state.player._ironWillUsed && state.player.hp <= 0) {
        state.player.hp = 1
        state.player._ironWillUsed = true
        return '鐵血意志 絕境存活！'
      }
    },
    battleDesc: '鐵血意志',
  },

  crowd_shot: {
    id: 'crowd_shot', rarity: 'rare',
    name: 'Crowd Shot', nameZh: '群攻射擊',
    icon: '🎯',
    desc: '40%機率攻擊所有敵人',
    trigger: 'on_attack',
    apply(state, ctx) {
      if (Math.random() < 0.40) {
        let total = 0
        for (const e of state.enemies) {
          if (e.hp > 0 && e !== ctx.target) {
            const splash = Math.floor(ctx.damage * 0.6)
            e.hp -= splash
            total += splash
          }
        }
        if (total > 0) return `群攻 額外${total}傷害`
      }
    },
    battleDesc: '群攻射擊',
  },

  berserk_charge: {
    id: 'berserk_charge', rarity: 'rare',
    name: 'Berserk Charge', nameZh: '狂暴衝鋒',
    icon: '⚡',
    desc: 'HP低於50%時攻擊力翻倍',
    trigger: 'passive',
    apply(state) {
      // 動態效果，在傷害計算前檢查
      state.player._berserker = true
    },
    battleDesc: '狂暴衝鋒',
  },

  // ══ EPIC ═══════════════════════════════════════════════════════════════
  dark_harmony: {
    id: 'dark_harmony', rarity: 'epic',
    name: 'Dark Harmony', nameZh: '暗黑和諧',
    icon: '🌑',
    desc: '吸血提升至40%，並獲得+20%傷害',
    trigger: 'passive',
    apply(state) {
      state.player.darkHarmony = true
      state.player.dmgBonus = (state.player.dmgBonus || 1) * 1.20
    },
    battleDesc: '暗黑和諧 傷害+20%+吸血',
  },

  deadly_tango: {
    id: 'deadly_tango', rarity: 'epic',
    name: 'Deadly Tango', nameZh: '死亡探戈',
    icon: '💃',
    desc: '擊殺後下次攻擊傷害+50%，最多疊3層',
    trigger: 'on_kill',
    apply(state) {
      state.player._tangoStacks = Math.min((state.player._tangoStacks || 0) + 1, 3)
      return `死亡探戈 疊${state.player._tangoStacks}層`
    },
    battleDesc: '死亡探戈',
  },

  hawk_shot: {
    id: 'hawk_shot', rarity: 'epic',
    name: 'Hawk Shot', nameZh: '鷹眼狙擊',
    icon: '🦅',
    desc: '暴擊時額外對目標造成30%最大HP傷害',
    trigger: 'on_crit',
    apply(state, ctx) {
      const bonus = Math.floor(ctx.target.maxHp * 0.30)
      ctx.target.hp -= bonus
      return `鷹眼狙擊 -${bonus}HP`
    },
    battleDesc: '鷹眼狙擊',
  },

  explosive_arrow: {
    id: 'explosive_arrow', rarity: 'epic',
    name: 'Explosive Arrow', nameZh: '爆炸箭',
    icon: '💥',
    desc: '攻擊時100%對所有敵人造成50%傷害',
    trigger: 'on_attack',
    apply(state, ctx) {
      let total = 0
      for (const e of state.enemies) {
        if (e.hp > 0 && e !== ctx.target) {
          const splash = Math.floor(ctx.damage * 0.5)
          e.hp -= splash
          total += splash
        }
      }
      if (total > 0) return `爆炸箭 擴散${total}`
    },
    battleDesc: '爆炸箭',
  },

  thorn_blast: {
    id: 'thorn_blast', rarity: 'epic',
    name: 'Thorn Blast', nameZh: '荊棘爆發',
    icon: '🌵',
    desc: '被擊時反彈30%傷害給攻擊者',
    trigger: 'on_hit',
    apply(state, ctx) {
      if (ctx.attacker && ctx.attacker.hp > 0) {
        const thorn = Math.floor(ctx.damage * 0.30)
        ctx.attacker.hp -= thorn
        return `荊棘反彈 -${thorn}`
      }
    },
    battleDesc: '荊棘爆發',
  },

  // ══ LEGENDARY ══════════════════════════════════════════════════════════
  phoenix_rise: {
    id: 'phoenix_rise', rarity: 'legendary',
    name: 'Phoenix Rise', nameZh: '鳳凰涅槃',
    icon: '🔥',
    desc: '第一次死亡時以80%HP復活',
    trigger: 'on_hit',
    apply(state, ctx) {
      if (!state.player._phoenixUsed && state.player.hp <= 0) {
        state.player.hp = Math.floor(state.player.maxHp * 0.80)
        state.player._phoenixUsed = true
        return '鳳凰涅槃！復活80%HP！'
      }
    },
    battleDesc: '鳳凰涅槃',
  },

  void_bloom: {
    id: 'void_bloom', rarity: 'legendary',
    name: 'Void Bloom', nameZh: '虛空綻放',
    icon: '🌸',
    desc: '戰鬥開始施咒：每回合對所有敵人造成5%最大HP傷害',
    trigger: 'battle_start',
    apply(state) {
      state.voidBloom = true
      return '虛空綻放 施咒成功！'
    },
    battleDesc: '虛空綻放',
  },

  ultimate_storm: {
    id: 'ultimate_storm', rarity: 'legendary',
    name: 'Ultimate Storm', nameZh: '終極風暴',
    icon: '🌪️',
    desc: '每隔5次攻擊，對所有敵人造成3倍傷害',
    trigger: 'on_attack',
    apply(state, ctx) {
      state.player._stormCount = (state.player._stormCount || 0) + 1
      if (state.player._stormCount >= 5) {
        state.player._stormCount = 0
        let total = 0
        for (const e of state.enemies) {
          if (e.hp > 0) {
            const dmg = ctx.damage * 3
            e.hp -= dmg
            total += dmg
          }
        }
        return `終極風暴！${total}總傷害！`
      }
    },
    battleDesc: '終極風暴',
  },

  rigged_formula: {
    id: 'rigged_formula', rarity: 'legendary',
    name: 'Rigged Formula', nameZh: '必勝公式',
    icon: '🎲',
    desc: '暴擊率+30%，暴擊傷害倍率×1.5',
    trigger: 'passive',
    apply(state) {
      state.player.crit = Math.min((state.player.crit || 0.15) + 0.30, 0.95)
      state.player.critMult = (state.player.critMult || 2) * 1.5
    },
    battleDesc: '必勝公式 暴擊+30%',
  },
}

// 按稀有度分組
export const CARDS_BY_RARITY = {
  common:    Object.values(CARDS).filter(c => c.rarity === 'common'),
  rare:      Object.values(CARDS).filter(c => c.rarity === 'rare'),
  epic:      Object.values(CARDS).filter(c => c.rarity === 'epic'),
  legendary: Object.values(CARDS).filter(c => c.rarity === 'legendary'),
}

// 抽卡：根據波次決定稀有度機率
// wave 1-3: 多 common，wave 4-6: 多 rare，wave 7+: 可能 epic/legendary
export function drawCardOffers(count = 3, wave = 1) {
  const pool = []

  // 稀有度機率表
  let legendaryChance = Math.min(wave * 0.02, 0.15)
  let epicChance = Math.min(wave * 0.05, 0.30)
  let rareChance = Math.min(0.20 + wave * 0.03, 0.45)
  // common = 剩餘

  const seen = new Set()
  const result = []

  for (let i = 0; i < count * 5 && result.length < count; i++) {
    const roll = Math.random()
    let rarity
    if (roll < legendaryChance) rarity = 'legendary'
    else if (roll < legendaryChance + epicChance) rarity = 'epic'
    else if (roll < legendaryChance + epicChance + rareChance) rarity = 'rare'
    else rarity = 'common'

    const rarityPool = CARDS_BY_RARITY[rarity]
    if (!rarityPool || rarityPool.length === 0) continue

    const card = rarityPool[Math.floor(Math.random() * rarityPool.length)]
    if (!seen.has(card.id)) {
      seen.add(card.id)
      result.push(card)
    }
  }

  // 如果不夠，用 common 補
  while (result.length < count) {
    const card = CARDS_BY_RARITY.common[Math.floor(Math.random() * CARDS_BY_RARITY.common.length)]
    if (!result.find(c => c.id === card.id)) result.push(card)
  }

  return result
}
