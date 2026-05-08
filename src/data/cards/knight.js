// knight.js — 騎士專屬技能卡牌（共 5 張）

export const KNIGHT_CARDS = {

  shield_bash: {
    id: 'shield_bash', group: 'hero', heroId: 'knight',
    name: 'Shield Bash', nameZh: '盾擊', icon: '🛡️',
    desc: (s=1) => '攻擊時 ' + (s*10) + '% 機率眩暈敵人',
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
    desc: (s=1) => '被攻擊時 ' + (s*8) + '% 機率完全格擋',
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
    desc: (s=1) => '每次攻擊後 ATK+1（上限 +' + (s*5) + '）',
    trigger: 'on_attack',
    apply(state, _ctx, stars=1) {
      const cap = stars * 5
      state.player._masteryGained = state.player._masteryGained || 0
      if (state.player._masteryGained < cap) {
        state.player.atk += 1
        state.player._masteryGained += 1
        return '劍術精通 ATK+1'
      }
    },
  },

  holy_blade: {
    id: 'holy_blade', group: 'hero', heroId: 'knight',
    name: 'Holy Blade', nameZh: '聖光劍', icon: '✨',
    desc: (s=1) => '暴擊時治癒造成傷害的 ' + (s*10) + '%',
    trigger: 'on_crit',
    apply(state, ctx, stars=1) {
      const heal = Math.floor(ctx.damage * stars * 0.10)
      state.player.hp = Math.min(state.player.hp + heal, state.player.maxHp)
      return '聖光劍 +' + heal + 'HP'
    },
  },

  fortress: {
    id: 'fortress', group: 'hero', heroId: 'knight',
    name: 'Fortress', nameZh: '要塞姿態', icon: '🏰',
    desc: (s=1) => '戰鬥開始 DEF+' + (s*10) + '，暴擊率+' + (s*3) + '%',
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      state.player.def  += stars * 10
      state.player.crit  = Math.min((state.player.crit || 0.1) + stars * 0.03, 0.95)
      return '要塞姿態 DEF+' + (stars*10)
    },
  },
}
