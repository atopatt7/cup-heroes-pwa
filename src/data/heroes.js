import { knight }    from './heroes/knight.js'
import { rogue }     from './heroes/rogue.js'
import { barbarian } from './heroes/barbarian.js'
import { druid }     from './heroes/druid.js'

export const HEROES = { knight, rogue, barbarian, druid }

export function getHero(id) {
  const h = HEROES[id]
  if (!h) return { ...HEROES.knight, deck: [...HEROES.knight.startingCards] }
  return {
    ...h,
    hp: h.maxHp,
    deck: [...h.startingCards],
  }
}
