// Game.js — 場景協調器，負責所有場景切換
import { TitleScene }      from './scenes/TitleScene.js'
import { HeroSelectScene } from './scenes/HeroSelectScene.js'
import { BattleScene }     from './scenes/BattleScene.js'
import { CupGameScene }    from './scenes/CupGameScene.js'
import { UpgradeScene }    from './scenes/UpgradeScene.js'
import { GameOverScene }   from './scenes/GameOverScene.js'
import { VictoryScene }    from './scenes/VictoryScene.js'
import { SaveManager }     from './game/SaveManager.js'

export class Game {
  constructor(canvas, ctx) {
    this.canvas  = canvas
    this.ctx     = ctx
    this.current = null
  }

  start() {
    this._registerServiceWorker()
    this.showTitle()
  }

  // ── 場景切換 ────────────────────────────────────────────

  showTitle() {
    this._switch(new TitleScene(
      this.canvas, this.ctx,
      () => this.showHeroSelect()
    ))
  }

  showHeroSelect() {
    this._switch(new HeroSelectScene(
      this.canvas, this.ctx,
      (heroStats) => this.startBattle({ currentWave: 1, hero: { ...heroStats } })
    ))
  }

  startBattle(gameState) {
    this._switch(new BattleScene(
      this.canvas, this.ctx, gameState,
      () => this._onBattleVictory(gameState),
      () => this.showGameOver(gameState)
    ))
  }

  startCupGame(gameState) {
    this._switch(new CupGameScene(
      this.canvas, this.ctx, gameState,
      (totalScore) => this.showUpgrade(gameState, totalScore)
    ))
  }

  showUpgrade(gameState, totalScore) {
    this._switch(new UpgradeScene(
      this.canvas, this.ctx, gameState, totalScore,
      () => this.startBattle(gameState)
    ))
  }

  showGameOver(gameState) {
    const wave = (gameState.currentWave || 1) - 1
    if (wave > 0) SaveManager.updateBestWave(wave)
    this._switch(new GameOverScene(
      this.canvas, this.ctx, gameState,
      () => this.showTitle()
    ))
  }

  showVictory(gameState) {
    SaveManager.updateBestWave(15)
    SaveManager.unlockHero('ninja')
    this._switch(new VictoryScene(
      this.canvas, this.ctx, gameState,
      () => this.showTitle()
    ))
  }

  // ── 內部工具 ────────────────────────────────────────────

  _onBattleVictory(gameState) {
    const justFinished = gameState.currentWave - 1
    SaveManager.updateBestWave(justFinished)
    if (justFinished >= 5) SaveManager.unlockHero('ninja')
    if (gameState.currentWave > 15) {
      this.showVictory(gameState)
    } else {
      this.startCupGame(gameState)
    }
  }

  _switch(scene) {
    if (this.current?.stop)    this.current.stop()
    if (this.current?.destroy) this.current.destroy()
    this.current = scene
    this.current.start()
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/cup-heroes-pwa/service-worker.js')
          .then(() => console.log('[SW] 已註冊'))
          .catch((err) => console.warn('[SW] 註冊失敗:', err))
      })
    }
  }
}
