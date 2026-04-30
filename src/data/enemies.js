// enemies.js — 敵人波次配置
const ENEMY_TYPES = {
  slime:  { name: 'Slime',  color: '#27ae60', size: 40 },
  goblin: { name: 'Goblin', color: '#8e44ad', size: 42 },
  orc:    { name: 'Orc',    color: '#e67e22', size: 48 },
  troll:  { name: 'Troll',  color: '#c0392b', size: 52 },
}

// 根據波次生成敵人陣列
export function generateEnemies(wave) {
  const isBoss = wave % 5 === 0

  if (isBoss) {
    const bossLevel = Math.floor(wave / 5)
    return [{
      name:   `Boss Lv.${bossLevel}`,
      hp:     120 + wave * 25,
      maxHp:  120 + wave * 25,
      atk:    10  + wave * 2.5,
      def:    5   + wave * 1.2,
      x: 340, y: 230,
      size:   75,
      color:  '#8B0000',
      isBoss: true,
    }]
  }

  const count = Math.min(1 + Math.floor(wave / 3), 3)
  const types = ['slime', 'goblin', 'orc', 'troll']

  return Array.from({ length: count }, (_, i) => {
    const type = ENEMY_TYPES[types[i % types.length]]
    return {
      name:   type.name,
      hp:     25  + wave * 10,
      maxHp:  25  + wave * 10,
      atk:    6   + wave * 1.8,
      def:    2   + Math.floor(wave * 0.6),
      x:      300 + i * 95,
      y:      250,
      size:   type.size,
      color:  type.color,
      isBoss: false,
    }
  })
}
