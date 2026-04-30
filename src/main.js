import { TitleScene }   from './scenes/TitleScene.js'
import { BattleScene }  from './scenes/BattleScene.js'
import { CupGameScene } from './scenes/CupGameScene.js'
import { UpgradeScene } from './scenes/UpgradeScene.js'
import { GameOverScene } from './scenes/GameOverScene.js'
import { VictoryScene } from './scenes/VictoryScene.js'

// ─── Canvas 設定 ────────────────────────────────────────────
const GAME_WIDTH  = 390
const GAME_HEIGHT = 844

const canvas = document.getElementById('game-canvas')
const ctx    = canvas.getContext('2d')

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)
  canvas.width  = GAME_WIDTH
  canvas.height = GAME_HEIGHT
  canvas.style.width  = `${GAME_WIDTH  * scale}px`
  canvas.style.height = `${GAME_HEIGHT * scale}px`
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

// ─── Game 協調器 ────────────────────────────────────────────
class Game {
  constructor() {
    this.current = null
  }

  /** 建立全新遊戲狀態 */
  _newState() {
    return {
      currentWave: 1,
      hero: {
        name:  'Knight Cup',
        hp:    100,
        maxHp: 100,
        atk:   15,
        def:   5,
      },
    }
  }

  /** 停止並銷毀當前場景 */
  _stop() {
    if (this.current?.stop) this.current.stop()
    this.current = null
  }

  // ── 場景切換方法 ───────────────────────────────────────────

  showTitle() {
    this._stop()
    this.current = new TitleScene(canvas, ctx, () => {
      this.startBattle(this._newState())
    })
    this.current.start()
  }

  startBattle(gameState) {
    this._stop()
    this.current = new BattleScene(
      canvas, ctx, gameState,
      () => this._afterBattleVictory(gameState),
      () => this.showGameOver(gameState)
    )
    this.current.start()
  }

  _afterBattleVictory(gameState) {
    // BattleScene._victory() 已把 currentWave+1
    // wave 16 代表剛剛打完第 15 波 → 直接勝利
    if (gameState.currentWave > 15) {
      this.showVictory(gameState)
    } else {
      this.startCupGame(gameState)
    }
  }

  startCupGame(gameState) {
    this._stop()
    this.current = new CupGameScene(canvas, ctx, gameState, (totalScore) => {
      this.showUpgrade(gameState, totalScore)
    })
    this.current.start()
  }

  showUpgrade(gameState, totalScore) {
    this._stop()
    this.current = new UpgradeScene(canvas, ctx, gameState, totalScore, () => {
      this.startBattle(gameState)
    })
    this.current.start()
  }

  showGameOver(gameState) {
    this._stop()
    this.current = new GameOverScene(canvas, ctx, gameState, () => {
      this.showTitle()
    })
    this.current.start()
  }

  showVictory(gameState) {
    this._stop()
    this.current = new VictoryScene(canvas, ctx, gameState, () => {
      this.showTitle()
    })
    this.current.start()
  }
}

// ─── 啟動 ──────────────────────────────────────────────────
const game = new Game()
game.showTitle()

// ─── Service Worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/cup-heroes-pwa/service-worker.js')
      .then(() => console.log('[SW] 已註冊'))
      .catch((err) => console.warn('[SW] 註冊失敗:', err))
  })
}
