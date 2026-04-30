// canvas.js — Canvas 設定與響應式縮放
export const GAME_WIDTH  = 390
export const GAME_HEIGHT = 844

export function setupCanvas() {
  const canvas = document.getElementById('game-canvas')
  const ctx    = canvas.getContext('2d')

  function resize() {
    const scale = Math.min(
      window.innerWidth  / GAME_WIDTH,
      window.innerHeight / GAME_HEIGHT
    )
    canvas.width  = GAME_WIDTH
    canvas.height = GAME_HEIGHT
    canvas.style.width  = `${GAME_WIDTH  * scale}px`
    canvas.style.height = `${GAME_HEIGHT * scale}px`
  }

  resize()
  window.addEventListener('resize', resize)
  return { canvas, ctx }
}
