// main.js — 只負責啟動
import { setupCanvas } from './canvas.js'
import { Game }        from './Game.js'

const { canvas, ctx } = setupCanvas()
const game = new Game(canvas, ctx)
game.start()
