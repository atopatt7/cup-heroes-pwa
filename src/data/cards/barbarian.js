// barbarian.js — 蠻將專屬技能卡牌（共 5 張）

export const BARBARIAN_CARDS = {

  rage_fuel: {
    id: 'rage_fuel', group: 'hero', heroId: 'barbarian',
    name: 'Rage Fuel', nameZh: '怒氣積累', icon: '😡',
    desc: (s=1) => '每 10 次被擊後，下次攻擊 +' + (s*15) + '% 傷害',
    trigger: 'on_hit',
    apply(state, _ctx, stars=1) {
      state.player._rage = (state.player._rage || 0) + 1
      if (state.player._rage >= 10) {
        state.player._rageDmgBonus = (state.player._rageDmgBonus || 0) + stars * 0.15
        state.player._rage = 0
        return '怒氣爆發！+' + (stars*15) + '% 傷害'
      }
    },
  },

  blood_thirst: {
    id: 'blood_thirst', group: 'hero', heroId: 'barbarian',
    name: 'Blood Thirst', nameZh: '嗜血', icon: '🩸',
    desc: (s=1) => '每缺失 10%HP → ATK+' + (s*2) + '%（上限+' + (s*20) + '%）',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._bloodThirst = { pct: stars * 2, cap: stars * 20 }
    },
  },

  undying_rage: {
    id: 'undying_rage', group: 'hero', heroId: 'barbarian',
    name: 'Undying Rage', nameZh: '不死之怒', icon: '💀',
    desc: (s=1) => 'HP 低於 30% 時每回合回復 ' + s + '% HP',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player._undyingRage = stars * 0.01
    },
  },

  war_stomp: {
    id: 'war_stomp', group: 'hero', heroId: 'barbarian',
    name: 'War Stomp', nameZh: '戰地踩踏', icon: '💥',
    desc: (s=1) => '戰鬥開始對所有敵人造成 ' + (s*20) + '% ATK 傷害',
    trigger: 'battle_start',
    apply(state, _ctx, stars=1) {
      const dmg = Math.floor(state.player.atk * stars * 0.20)
      let total = 0
      for (const e of (state.enemies || [])) {
        if (e.hp > 0) { e.hp -= dmg; total += dmg }
      }
      return '戰地踩踏！全敵 -' + total
    },
  },

  thick_skin: {
    id: 'thick_skin', group: 'hero', heroId: 'barbarian',
    name: 'Thick Skin', nameZh: '厚皮', icon: '🦏',
    desc: (s=1) => '受傷減少 ' + (s*5) + '%',
    trigger: 'passive',
    apply(state, _ctx, stars=1) {
      state.player.dmgReduction = (state.player.dmgReduction || 0) + stars * 0.05
    },
  },
}
