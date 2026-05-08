// universal.js — 通用技能卡牌（所有英雄皆可取得，共 10 張）

export const UNIVERSAL_CARDS = {

  power_up: {
    id: 'power_up', group: 'universal',
    name: 'Power Up', nameZh: '力量強化', icon: '💪',
    desc: (s=1) => 'ATK +' + (s*10) + '%',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.atk = Math.round(state.player.atk * (1 + stars * 0.10))
    },
  },

  armor_up: {
    id: 'armor_up', group: 'universal',
    name: 'Armor Up', nameZh: '防禦強化', icon: '🛡️',
    desc: (s=1) => 'DEF +' + (s*5),
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.def += stars * 5
    },
  },

  vitality: {
    id: 'vitality', group: 'universal',
    name: 'Vitality', nameZh: '生命強化', icon: '❤️',
    desc: (s=1) => '最大HP +' + (s*20),
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
    desc: (s=1) => '暴擊傷害倍率 +' + (s*0.2).toFixed(1) + '×（共 ×' + (2+s*0.2).toFixed(1) + '）',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.critMult = (state.player.critMult || 2) + stars * 0.2
    },
  },

  sharp_eye: {
    id: 'sharp_eye', group: 'universal',
    name: 'Sharp Eye', nameZh: '銳利之眼', icon: '👁️',
    desc: (s=1) => '暴擊率 +' + (s*5) + '%',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.crit = Math.min((state.player.crit || 0.1) + stars * 0.05, 0.95)
    },
  },

  healing_mist: {
    id: 'healing_mist', group: 'universal',
    name: 'Healing Mist', nameZh: '治癒薄霧', icon: '💧',
    desc: (s=1) => '戰鬥開始回復 ' + (s*5) + '% 最大HP',
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const heal = Math.floor(state.player.maxHp * stars * 0.05)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return heal > 0 ? '治癒薄霧 +' + heal + 'HP' : null
    },
  },

  ball_up: {
    id: 'ball_up', group: 'universal',
    name: 'Ball Up', nameZh: '球數強化', icon: '⚪',
    desc: (s=1) => '杯球台球數 +' + s,
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.bonusBalls = (state.player.bonusBalls || 0) + stars
    },
  },

  first_strike: {
    id: 'first_strike', group: 'universal',
    name: 'First Strike', nameZh: '先制一擊', icon: '🗡️',
    desc: (s=1) => '首次攻擊傷害 ×' + (1 + s*0.5).toFixed(1),
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (!state.player._firstStrikeDone) {
        const bonus = Math.floor(ctx.damage * stars * 0.5)
        ctx.target.hp -= bonus
        state.player._firstStrikeDone = true
        return '先制一擊 +' + bonus
      }
    },
  },

  iron_skin: {
    id: 'iron_skin', group: 'universal',
    name: 'Iron Skin', nameZh: '鐵皮', icon: '🧲',
    desc: (s=1) => '每次受傷減少 ' + (s*3) + ' 傷害',
    trigger: 'on_hit',
    apply(state, ctx, stars=1) {
      if (ctx) ctx.damage = Math.max(1, (ctx.damage || 0) - stars * 3)
    },
  },

  double_chance: {
    id: 'double_chance', group: 'universal',
    name: 'Double Chance', nameZh: '雙重機運', icon: '🎲',
    desc: (s=1) => (s*6) + '% 機率攻擊傷害翻倍',
    trigger: 'on_attack',
    apply(state, ctx, stars=1) {
      if (Math.random() < stars * 0.06) {
        const bonus = ctx.damage
        ctx.target.hp -= bonus
        return '雙重機運 ×2！+' + bonus
      }
    },
  },
}
