// druid.js — 德魯伊專屬技能卡牌（共 5 張）

export const DRUID_CARDS = {

  thorns_aura: {
    id: 'thorns_aura', group: 'hero', heroId: 'druid',
    name: 'Thorns Aura', nameZh: '荊棘光環', icon: '🌵',
    desc: (s=1) => '被攻擊時反彈 ' + (s*10) + '% 傷害給全體敵人',
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      const thorn = Math.floor((ctx?.damage || 0) * stars * 0.10)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= thorn; total += thorn }
      }
      if (total > 0) return '荊棘光環 -' + total
    },
  },

  natures_wrath: {
    id: 'natures_wrath', group: 'hero', heroId: 'druid',
    name: "Nature's Wrath", nameZh: '自然之怒', icon: '⚡',
    desc: (s=1) => '每 4 次攻擊召喚閃電，造成 ' + (s*60) + '% ATK 傷害',
    trigger: 'on_attack',
    apply(state, _ctx, stars=1) {
      state.player._natWrathCount = (state.player._natWrathCount || 0) + 1
      if (state.player._natWrathCount >= 4) {
        state.player._natWrathCount = 0
        const dmg    = Math.floor(state.player.atk * stars * 0.60)
        const target = (state.enemies || []).filter(e => e.hp > 0).sort((a, b) => b.hp - a.hp)[0]
        if (target) { target.hp -= dmg; return '自然之怒！閃電 -' + dmg }
      }
    },
  },

  rejuvenation: {
    id: 'rejuvenation', group: 'hero', heroId: 'druid',
    name: 'Rejuvenation', nameZh: '新生', icon: '🍃',
    desc: (s=1) => '每回合恢復 ' + s + '% 最大HP',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._regenPct = (state.player._regenPct || 0) + stars * 0.01
    },
  },

  toxic_bloom: {
    id: 'toxic_bloom', group: 'hero', heroId: 'druid',
    name: 'Toxic Bloom', nameZh: '劇毒綻放', icon: '🌸',
    desc: (s=1) => '攻擊時 ' + (s*8) + '% 機率施毒（每回合 ' + (s*4) + '% HP）',
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
    desc: (s=1) => '戰鬥開始 HP+' + (s*20) + '；敵人 DEF-' + (s*3),
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const hpBonus = stars * 20
      state.player.maxHp += hpBonus
      state.player.hp    += hpBonus
      const defDebuff = stars * 3
      for (const e of (state.enemies || [])) {
        e.def = Math.max(0, (e.def || 0) - defDebuff)
      }
      return '過度生長 HP+' + hpBonus + '，敵DEF-' + defDebuff
    },
  },
}
