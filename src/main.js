import { SceneManager } from './scenes/SceneManager.js'

// ─── 遊戲常數 ───────────────────────────────────────────────
const GAME_WIDTH = 390   // 以 iPhone 14 寬度為基準
const GAME_HEIGHT = 844

// ─── Canvas 初始化 ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')

function resizeCanvas() {
  const scaleX = window.innerWidth / GAME_WIDTH
  const scaleY = window.innerHeight / GAME_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  canvas.width = GAME_WIDTH
  canvas.height = GAME_HEIGHT
  canvas.style.width = `${GAME_WIDTH * scale}px`
  canvas.style.height = `${GAME_HEIGHT * scale}px`
}

resizeCanvas()
window.addEventListener('resize', resizeCanvas)

// ─── 場景管理器 ─────────────────────────────────────────────
const sceneManager = new SceneManager(canvas, ctx)
sceneManager.start()

// ─── Service Worker 註冊 ────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/cup-heroes-pwa/service-worker.js')
      .then(() => console.log('[SW] 已註冊'))
      .catch((err) => console.warn('[SW] 註冊失敗:', err))
  })
}
