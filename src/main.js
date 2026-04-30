import { TitleScene }       from './scenes/TitleScene.js'
import { HeroSelectScene }  from './scenes/HeroSelectScene.js'
import { BattleScene }      from './scenes/BattleScene.js'
import { CupGameScene }     from './scenes/CupGameScene.js'
import { UpgradeScene }     from './scenes/UpgradeScene.js'
import { GameOverScene }    from './scenes/GameOverScene.js'
import { VictoryScene }     from './scenes/VictoryScene.js'
import { SaveManager }      from './game/SaveManager.js'

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

  /** 停止並銷毀當前場景 */
  _stop() {
    if (this.current?.stop) this.current.stop()
    this.current = null
  }

  // ── 場景切換方法 ───────────────────────────────────────────

  showTitle() {
    this._stop()
    this.current = new TitleScene(canvas, ctx, () => this.showHeroSelect())
    this.current.start()
  }

  showHeroSelect() {
    this._stop()
    this.current = new HeroSelectScene(canvas, ctx, (heroStats) => {
      this.startBattle({
        currentWave: 1,
        hero: { ...heroStats },
      })
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
    const justFinishedWave = gameState.currentWave - 1

    // 存檔最高波次
    SaveManager.updateBestWave(justFinishedWave)

    // 解鎖 Ninja Cup（打完第 5 波）
    if (justFinishedWave >= 5) {
      SaveManager.unlockHero('ninja')
    }

    // 全部 15 波打完 → 勝利
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
    // 存檔已到達波次
    const reachedWave = (gameState.currentWave || 1) - 1
    if (reachedWave > 0) SaveManager.updateBestWave(reachedWave)

    this._stop()
    this.current = new GameOverScene(canvas, ctx, gameState, () => this.showTitle())
    this.current.start()
  }

  showVictory(gameState) {
    SaveManager.updateBestWave(15)
    SaveManager.unlockHero('ninja')  // 通關必定解鎖

    this._stop()
    this.current = new VictoryScene(canvas, ctx, gameState, () => this.showTitle())
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
