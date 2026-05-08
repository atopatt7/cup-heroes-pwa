// rogue.js — 刺客專屬技能卡牌（共 5 張）

export const ROGUE_CARDS = {

  shadowstep: {
    id: 'shadowstep', group: 'hero', heroId: 'rogue',
    name: 'Shadowstep', nameZh: '暗影步', icon: '🌑',
    desc: (s=1) => '被攻擊時 ' + (s*10) + '% 機率完全閃避',
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
    desc: (s=1) => '攻擊施毒，每回合 ' + (s*2) + '% 目標HP',
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      ctx.target._poisonPct = Math.max(ctx.target._poisonPct || 0, stars * 0.02)
      return '毒刃！施毒！'
    },
  },

  backstab: {
    id: 'backstab', group: 'hero', heroId: 'rogue',
    name: 'Backstab', nameZh: '背刺', icon: '🗡️',
    desc: (s=1) => '首次攻擊傷害 ×' + (1 + s).toFixed(1),
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (!state.player._backstabDone) {
        const bonus = Math.floor(ctx.damage * stars)
        ctx.target.hp -= bonus
        state.player._backstabDone = true
        return '背刺！×' + (1+stars).toFixed(1) + ' +' + bonus
      }
    },
  },

  smoke_bomb: {
    id: 'smoke_bomb', group: 'hero', heroId: 'rogue',
    name: 'Smoke Bomb', nameZh: '煙霧彈', icon: '💨',
    desc: (s=1) => '首次被擊後下 ' + s + ' 次攻擊必定暴擊',
    trigger: 'on_hit',
    apply(state, _ctx, stars=1) {
      if (!state.player._smokeBombUsed) {
        state.player._garanteedCrits = (state.player._garanteedCrits || 0) + stars
        state.player._smokeBombUsed  = true
        return '煙霧彈！下 ' + stars + ' 次必暴！'
      }
    },
  },

  combo_strike: {
    id: 'combo_strike', group: 'hero', heroId: 'rogue',
    name: 'Combo Strike', nameZh: '連擊強化', icon: '💥',
    desc: (s=1) => '對同一目標連擊，每次 +' + (s*5) + '% 傷害',
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
        return '連擊×' + state.player._comboCount + ' +' + bonus
      }
    },
  },
}
